import "server-only";
import { q } from "./db";

async function columnType(table: string, column: string): Promise<string | null> {
  const rows = await q<{ data_type: string }>(
    `SELECT data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return rows[0]?.data_type ?? null;
}

const hasColumn = async (table: string, column: string) => (await columnType(table, column)) !== null;

/** Brings any older database up to the current shape. Each step is safe to re-run. */
export async function migrate(): Promise<void> {
  await splitSizesIntoItems();
  await requestLifecycle();
  await itemStatuses();
  await catalogueCopyToContent();
}

/**
 * Moves an older wardrobe onto one-row-per-garment.
 *
 * Items used to carry a comma-separated `sizes` list, so one row stood for
 * several physical suits and they could not be tracked apart. Each row is
 * split into one row per size — the original id keeps the first size so
 * existing requests and links still resolve — and the old column is dropped
 * so there is only ever one place a size can live.
 *
 * Runs once per database: after the column is gone there is nothing to do.
 */
async function splitSizesIntoItems(): Promise<void> {
  if (!(await hasColumn("items", "sizes"))) return;

  const rows = await q<{ id: string; sizes: string; size: string }>(
    `SELECT id, sizes, size FROM items ORDER BY id`
  );

  const used = new Set(rows.map((r) => r.id));
  /** Next free "R-<n>" after the row being split, so copies sit beside it. */
  const nextId = (from: string): string => {
    const m = /^(.*?)(\d+)$/.exec(from);
    const prefix = m ? m[1] : `${from}-`;
    let n = m ? Number(m[2]) : 1;
    for (let guard = 0; guard < 10_000; guard++) {
      n += 1;
      const candidate = `${prefix}${n}`;
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
    const fallback = `${from}-${used.size}`;
    used.add(fallback);
    return fallback;
  };

  for (const row of rows) {
    const sizes = (row.sizes || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Already split, or never had a size to begin with.
    if (row.size) continue;
    if (!sizes.length) continue;

    await q(`UPDATE items SET size = $2, updated_at = now() WHERE id = $1`, [row.id, sizes[0]]);

    for (const size of sizes.slice(1)) {
      const id = nextId(row.id);
      await q(
        `INSERT INTO items (id, name, category, type, colour, colour_hex, size, fit,
             condition, status, available_from, description, measurements, care,
             image_url, detail_url, archived, created_at)
         SELECT $2, name, category, type, colour, colour_hex, $3, fit,
             condition, status, available_from, description, measurements, care,
             image_url, detail_url, archived, created_at
           FROM items WHERE id = $1
         ON CONFLICT (id) DO NOTHING`,
        [row.id, id, size]
      );

      // A borrowing recorded against the old row asked for one of these
      // sizes, so it belongs to the garment that now holds that size —
      // otherwise returning it would free the wrong one.
      await q(
        `UPDATE requests SET item_id = $2, updated_at = now()
          WHERE item_id = $1 AND size = $3`,
        [row.id, id, size]
      );
    }
  }

  await q(`ALTER TABLE items DROP COLUMN IF EXISTS sizes`);
}

/**
 * Requests used to carry a number (0–5) for one combined status, and the
 * expected return lived on the request. Now a request has its own lifecycle
 * and each handover is a row in `lendings`, so history survives whatever
 * happens to the garment afterwards.
 *
 * Old → new: 0 pending · 1, 2 confirmed · 3, 4 collected · 5 returned.
 */
async function requestLifecycle(): Promise<void> {
  if ((await columnType("requests", "status")) !== "integer") return;
  const hadReturns = await hasColumn("requests", "return_date");

  await q(`ALTER TABLE requests ALTER COLUMN status DROP DEFAULT`);
  await q(
    `ALTER TABLE requests ALTER COLUMN status TYPE TEXT USING (
       CASE status WHEN 0 THEN 'pending' WHEN 1 THEN 'confirmed' WHEN 2 THEN 'confirmed'
                   WHEN 3 THEN 'collected' WHEN 4 THEN 'collected' WHEN 5 THEN 'returned'
                   ELSE 'pending' END)`
  );
  await q(`ALTER TABLE requests ALTER COLUMN status SET DEFAULT 'pending'`);

  const returnedAt = hadReturns ? "COALESCE(returned_at, updated_at)" : "updated_at";

  // Everything already handed over becomes a lending. The pickup day is the
  // collection day the borrower chose — the closest record there is.
  await q(
    `INSERT INTO lendings (request_ref, item_id, item_name, item_size, borrower_name,
         lent_at, due_date, due_time, returned_at)
     SELECT ref, item_id, item_name, size, person_name,
         LEAST(now(), CASE WHEN requested_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                           THEN requested_date::date::timestamptz ELSE created_at END),
         ${hadReturns ? "return_date" : "NULL::date"},
         ${hadReturns ? "return_time" : "''"},
         CASE WHEN status = 'returned' THEN ${returnedAt} END
       FROM requests
      WHERE status IN ('collected', 'returned') AND item_id IS NOT NULL
     ON CONFLICT (request_ref) DO NOTHING`
  );
  await q(
    `UPDATE requests SET closed_at = COALESCE(closed_at, ${returnedAt})
      WHERE status = 'returned'`
  );

  // Requests still waiting now hold their garment, as new ones do.
  await q(
    `UPDATE items i SET status = 'on_hold', hold_ref = r.ref, updated_at = now()
       FROM (SELECT DISTINCT ON (item_id) item_id, ref FROM requests
              WHERE status IN ('pending', 'confirmed') AND item_id IS NOT NULL
              ORDER BY item_id, created_at) r
      WHERE i.id = r.item_id AND i.status = 'available'`
  );

  if (hadReturns) {
    await q(
      `ALTER TABLE requests DROP COLUMN IF EXISTS return_date,
         DROP COLUMN IF EXISTS return_time, DROP COLUMN IF EXISTS returned_at`
    );
  }
}

/**
 * "Available soon" was one status for anything temporarily off the rail.
 * It splits into the physical states it stood for; the description is the
 * only clue to which, and anything unclear becomes "out for wash".
 */
async function itemStatuses(): Promise<void> {
  await q(
    `UPDATE items SET status = CASE WHEN description ILIKE '%repair%' THEN 'repair' ELSE 'wash' END,
         updated_at = now()
      WHERE status = 'soon'`
  );
}

/** Catalogue wording moves from its own settings columns to the content table. */
async function catalogueCopyToContent(): Promise<void> {
  if (!(await hasColumn("settings", "cat_heading"))) return;

  const original: Record<string, [string, string]> = {
    cat_eyebrow: ["eyebrow", "The wardrobe"],
    cat_heading: ["heading", "Everything on the rail."],
    cat_intro: ["intro", "Borrow any of it, free. Items already out are still listed, with the date they are due back."],
    cat_empty: ["empty", "Nothing matches that just yet."],
  };
  const rows = await q<Record<string, string>>(
    `SELECT cat_eyebrow, cat_heading, cat_intro, cat_empty FROM settings WHERE id = 1`
  );
  const row = rows[0];
  if (row) {
    for (const [column, [field, was]] of Object.entries(original)) {
      const value = (row[column] ?? "").trim();
      // The old form treated a blank field as "use the original", so only
      // real edits are carried over.
      if (!value || value === was) continue;
      await q(
        `INSERT INTO content (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        [`catalogue.${field}`, value]
      );
    }
  }
  await q(
    `ALTER TABLE settings DROP COLUMN IF EXISTS cat_eyebrow, DROP COLUMN IF EXISTS cat_heading,
       DROP COLUMN IF EXISTS cat_intro, DROP COLUMN IF EXISTS cat_empty`
  );
}
