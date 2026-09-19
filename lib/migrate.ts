import "server-only";
import { q } from "./db";

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
export async function splitSizesIntoItems(): Promise<void> {
  const hasSizes = await q<{ n: number }>(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'sizes'`
  );
  if ((hasSizes[0]?.n ?? 0) === 0) return;

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
