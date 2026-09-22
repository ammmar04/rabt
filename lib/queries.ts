import "server-only";
import { q, exec } from "./db";
import type {
  Category, Item, ItemStatus, Lending, Request, RequestStatus, Settings,
} from "./types";
import { SITE_TZ } from "./types";
import { fieldsOf, findPage, resolvePage, defaultValue, storedKey, type PageCopy } from "./content";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let schemaReady: Promise<void> | null = null;

/** Create tables, bring older databases up to date, and seed an empty one. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
      await exec(sql);
      const { migrate } = await import("./migrate");
      await migrate();
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty();
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

async function ready() {
  await ensureSchema();
}

/** A timestamp column as an ISO string in UTC, whatever the session timezone. */
const iso = (col: string) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

/* ----------------------------------------------------------- categories */
export async function getCategories(): Promise<Category[]> {
  await ready();
  return q<Category>("SELECT * FROM categories ORDER BY sort, name");
}

/* ---------------------------------------------------------------- items */
const ITEM_COLS = `id, name, category, type, colour, colour_hex, size, fit, condition,
  status, hold_ref, to_char(available_from,'YYYY-MM-DD') AS available_from, description,
  measurements, care, image_url, detail_url, archived`;

export async function getItems(opts: { category?: string } = {}): Promise<Item[]> {
  await ready();
  if (opts.category) {
    return q<Item>(
      `SELECT ${ITEM_COLS} FROM items WHERE archived = FALSE AND category = $1
       ORDER BY created_at DESC`,
      [opts.category]
    );
  }
  return q<Item>(
    `SELECT ${ITEM_COLS} FROM items WHERE archived = FALSE ORDER BY created_at DESC`
  );
}

export async function getItem(id: string): Promise<Item | null> {
  await ready();
  const rows = await q<Item>(`SELECT ${ITEM_COLS} FROM items WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * The item already using an ID, compared without case so "r-101" cannot sit
 * beside "R-101". Removed items count: their history still points at the ID.
 */
export async function findItemById(id: string): Promise<{ id: string; name: string; archived: boolean } | null> {
  await ready();
  const rows = await q<{ id: string; name: string; archived: boolean }>(
    `SELECT id, name, archived FROM items WHERE lower(id) = lower($1) LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export type ItemInput = Omit<Item, "archived" | "hold_ref">;

export async function createItem(data: ItemInput): Promise<void> {
  await ready();
  await q(
    `INSERT INTO items (id, name, category, type, colour, colour_hex, size, fit,
       condition, status, available_from, description, measurements, care,
       image_url, detail_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
       CASE WHEN $11 = '' THEN NULL ELSE $11::date END,
       $12,$13,$14,$15,$16)`,
    [
      data.id, data.name, data.category, data.type, data.colour, data.colour_hex,
      data.size, data.fit, data.condition, data.status, data.available_from ?? "",
      data.description, data.measurements, data.care, data.image_url, data.detail_url,
    ]
  );
}

export async function updateItem(id: string, data: ItemInput): Promise<void> {
  await ready();
  await q(
    `UPDATE items SET name=$2, category=$3, type=$4, colour=$5, colour_hex=$6,
       size=$7, fit=$8, condition=$9,
       hold_ref = CASE WHEN $10 = 'on_hold' AND status = 'on_hold' THEN hold_ref ELSE NULL END,
       status=$10,
       available_from = CASE WHEN $11 = '' THEN NULL ELSE $11::date END,
       description=$12, measurements=$13, care=$14, image_url=$15, detail_url=$16,
       updated_at = now()
     WHERE id = $1`,
    [
      id, data.name, data.category, data.type, data.colour, data.colour_hex,
      data.size, data.fit, data.condition, data.status, data.available_from ?? "",
      data.description, data.measurements, data.care, data.image_url, data.detail_url,
    ]
  );
}

/**
 * A manual change of physical status. It never touches requests or lending
 * history; a request's hold on the item only survives if it stays on hold.
 */
export async function setItemStatus(id: string, status: ItemStatus, availableFrom = ""): Promise<void> {
  await ready();
  await q(
    `UPDATE items SET
       hold_ref = CASE WHEN $2 = 'on_hold' AND status = 'on_hold' THEN hold_ref ELSE NULL END,
       status = $2,
       available_from = CASE WHEN $3 = '' THEN NULL ELSE $3::date END,
       updated_at = now()
     WHERE id = $1`,
    [id, status, availableFrom]
  );
}

/** Soft delete — keeps request and lending history intact. */
export async function archiveItem(id: string): Promise<void> {
  await ready();
  await q(`UPDATE items SET archived = TRUE, updated_at = now() WHERE id = $1`, [id]);
}

/**
 * Puts a garment on hold for a request, in one statement so that two people
 * requesting at the same moment cannot both get it: the second finds it no
 * longer available. Returns false if it could not be held.
 */
export async function holdItem(itemId: string, ref: string): Promise<boolean> {
  await ready();
  const rows = await q<{ id: string }>(
    `UPDATE items SET status = 'on_hold', hold_ref = $2, available_from = NULL, updated_at = now()
      WHERE id = $1 AND archived = FALSE AND status = 'available'
        AND NOT EXISTS (SELECT 1 FROM requests
                         WHERE item_id = $1 AND status IN ('pending','confirmed','collected'))
      RETURNING id`,
    [itemId, ref]
  );
  return rows.length > 0;
}

/**
 * Lets go of a request's hold. Only if the garment is still on hold for that
 * same request — if someone has since sent it for repair, it stays there.
 */
export async function releaseHold(itemId: string, ref: string): Promise<void> {
  await ready();
  await q(
    `UPDATE items SET status = 'available', hold_ref = NULL, available_from = NULL, updated_at = now()
      WHERE id = $1 AND status = 'on_hold' AND hold_ref = $2`,
    [itemId, ref]
  );
}

/* ------------------------------------------------------------- requests */
const REQUEST_SELECT = `SELECT r.ref, r.item_id, r.item_name, r.size, r.requested_date,
    r.requested_time, r.contact_method, r.contact_value, r.person_name, r.contribution,
    r.status, r.close_reason, r.close_note,
    ${iso("r.created_at")} AS created_at, ${iso("r.confirmed_at")} AS confirmed_at,
    ${iso("r.closed_at")} AS closed_at,
    i.image_url AS item_image, i.status AS item_status, i.hold_ref AS item_hold_ref,
    l.id AS lending_id, ${iso("l.lent_at")} AS lent_at,
    to_char(l.due_date,'YYYY-MM-DD') AS due_date, l.due_time, ${iso("l.returned_at")} AS returned_at
  FROM requests r
  LEFT JOIN items i ON i.id = r.item_id
  LEFT JOIN lendings l ON l.request_ref = r.ref`;

/** Requests not yet handed over, oldest first — the team's queue. */
export async function getWaitingRequests(): Promise<Request[]> {
  await ready();
  return q<Request>(
    `${REQUEST_SELECT} WHERE r.status IN ('pending','confirmed') ORDER BY r.created_at ASC`
  );
}

export async function getRequest(ref: string): Promise<Request | null> {
  await ready();
  const rows = await q<Request>(`${REQUEST_SELECT} WHERE r.ref = $1`, [ref]);
  return rows[0] ?? null;
}

export async function getRequestsByRefs(refs: string[]): Promise<Request[]> {
  await ready();
  if (!refs.length) return [];
  const list = refs.slice(0, 50);
  const holes = list.map((_, i) => `$${i + 1}`).join(",");
  return q<Request>(`${REQUEST_SELECT} WHERE r.ref IN (${holes}) ORDER BY r.created_at DESC`, list);
}

export type RequestInput = Pick<Request,
  "ref" | "item_id" | "item_name" | "size" | "requested_date" | "requested_time" |
  "contact_method" | "contact_value" | "person_name" | "contribution">;

export async function createRequest(r: RequestInput): Promise<void> {
  await ready();
  await q(
    `INSERT INTO requests (ref, item_id, item_name, size, requested_date,
        requested_time, contact_method, contact_value, person_name, contribution, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')`,
    [
      r.ref, r.item_id, r.item_name, r.size, r.requested_date, r.requested_time,
      r.contact_method, r.contact_value, r.person_name, r.contribution,
    ]
  );
}

/** Rabt has been in touch and the borrowing is on. */
export async function confirmRequest(ref: string): Promise<boolean> {
  await ready();
  const rows = await q<{ ref: string }>(
    `UPDATE requests SET status = 'confirmed', confirmed_at = now(), updated_at = now()
      WHERE ref = $1 AND status = 'pending' RETURNING ref`,
    [ref]
  );
  return rows.length > 0;
}

/**
 * Cancels a request, or marks it unfulfilled, and releases its garment. Only
 * requests not yet handed over can be closed this way; a borrowed garment is
 * closed by returning it.
 */
export async function closeRequest(
  ref: string,
  status: Extract<RequestStatus, "cancelled" | "rejected">,
  reason: string,
  note: string
): Promise<boolean> {
  await ready();
  const rows = await q<{ item_id: string | null }>(
    `UPDATE requests SET status = $2, close_reason = $3, close_note = $4,
         closed_at = now(), updated_at = now()
      WHERE ref = $1 AND status IN ('pending','confirmed')
      RETURNING item_id`,
    [ref, status, reason, note]
  );
  if (!rows.length) return false;
  if (rows[0].item_id) await releaseHold(rows[0].item_id, ref);
  return true;
}

/**
 * Keeps the record of what happened but removes who it was: name and contact
 * detail are cleared from the request and its lending.
 */
export async function removePersonalDetails(ref: string): Promise<void> {
  await ready();
  await q(
    `UPDATE requests SET person_name = '', contact_value = '', updated_at = now() WHERE ref = $1`,
    [ref]
  );
  await q(`UPDATE lendings SET borrower_name = '', updated_at = now() WHERE request_ref = $1`, [ref]);
}

/* ------------------------------------------------------------- lendings */
const LENDING_SELECT = `SELECT l.id, l.request_ref, l.item_id, l.item_name, l.item_size,
    l.borrower_name, ${iso("l.lent_at")} AS lent_at, to_char(l.due_date,'YYYY-MM-DD') AS due_date,
    l.due_time, ${iso("l.returned_at")} AS returned_at,
    r.contact_method, r.contact_value
  FROM lendings l LEFT JOIN requests r ON r.ref = l.request_ref`;

/**
 * The handover: the request becomes a borrowing, a lending record opens, and
 * the garment is marked borrowed until its expected return.
 */
export async function handOver(ref: string, dueDate: string, dueTime: string): Promise<boolean> {
  await ready();
  const rows = await q<{ item_id: string | null; item_name: string; size: string; person_name: string }>(
    `UPDATE requests SET status = 'collected', confirmed_at = COALESCE(confirmed_at, now()),
         updated_at = now()
      WHERE ref = $1 AND status IN ('pending','confirmed')
      RETURNING item_id, item_name, size, person_name`,
    [ref]
  );
  const r = rows[0];
  if (!r) return false;
  if (r.item_id) {
    await q(
      `INSERT INTO lendings (request_ref, item_id, item_name, item_size, borrower_name, due_date, due_time)
       VALUES ($1, $2, $3, $4, $5, $6::date, $7)
       ON CONFLICT (request_ref) DO NOTHING`,
      [ref, r.item_id, r.item_name, r.size, r.person_name, dueDate, dueTime]
    );
    await q(
      `UPDATE items SET status = 'borrowed', hold_ref = NULL, available_from = $2::date,
           updated_at = now()
        WHERE id = $1`,
      [r.item_id, dueDate]
    );
  }
  return true;
}

export async function getLending(id: number): Promise<Lending | null> {
  await ready();
  const rows = await q<Lending>(`${LENDING_SELECT} WHERE l.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Everything out now, plus what came back in the last 30 days. */
export async function getLendingsForReturns(): Promise<Lending[]> {
  await ready();
  return q<Lending>(
    `${LENDING_SELECT}
      WHERE l.returned_at IS NULL OR l.returned_at > now() - interval '30 days'
      ORDER BY l.due_date ASC NULLS FIRST, l.lent_at DESC`
  );
}

export async function getOpenLendings(): Promise<Lending[]> {
  await ready();
  return q<Lending>(`${LENDING_SELECT} WHERE l.returned_at IS NULL ORDER BY l.due_date ASC NULLS FIRST`);
}

/** Changes the agreed return on a garment that is still out. */
export async function setLendingDue(id: number, dueDate: string, dueTime: string): Promise<boolean> {
  await ready();
  const rows = await q<{ item_id: string }>(
    `UPDATE lendings SET due_date = $2::date, due_time = $3, updated_at = now()
      WHERE id = $1 AND returned_at IS NULL RETURNING item_id`,
    [id, dueDate, dueTime]
  );
  if (!rows.length) return false;
  await q(
    `UPDATE items SET available_from = $2::date, updated_at = now() WHERE id = $1 AND status = 'borrowed'`,
    [rows[0].item_id, dueDate]
  );
  return true;
}

/**
 * Closes a lending. The request is completed, and the garment moves to
 * `next` (usually available, or out for wash) — unless someone has already
 * changed its physical status by hand.
 */
export async function returnLending(id: number, next: ItemStatus): Promise<boolean> {
  await ready();
  const rows = await q<{ request_ref: string | null; item_id: string }>(
    `UPDATE lendings SET returned_at = now(), updated_at = now()
      WHERE id = $1 AND returned_at IS NULL RETURNING request_ref, item_id`,
    [id]
  );
  const l = rows[0];
  if (!l) return false;
  if (l.request_ref) {
    await q(
      `UPDATE requests SET status = 'returned', closed_at = now(), updated_at = now()
        WHERE ref = $1 AND status = 'collected'`,
      [l.request_ref]
    );
  }
  await q(
    `UPDATE items SET status = $2, hold_ref = NULL, available_from = NULL, updated_at = now()
      WHERE id = $1 AND status = 'borrowed'`,
    [l.item_id, next]
  );
  return true;
}

/* -------------------------------------------------------------- history */

/** Every request ever made, newest first, optionally narrowed. */
export async function getRequestHistory(f: { status?: string; month?: string; limit?: number } = {}): Promise<Request[]> {
  await ready();
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.status) { params.push(f.status); where.push(`r.status = $${params.length}`); }
  if (f.month) {
    params.push(f.month);
    where.push(`to_char(r.created_at AT TIME ZONE '${SITE_TZ}', 'YYYY-MM') = $${params.length}`);
  }
  const limit = f.limit ? ` LIMIT ${Math.max(1, Math.floor(f.limit))}` : "";
  return q<Request>(
    `${REQUEST_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY r.created_at DESC${limit}`,
    params
  );
}

export async function getLendingHistory(): Promise<Lending[]> {
  await ready();
  return q<Lending>(`${LENDING_SELECT} ORDER BY l.lent_at DESC`);
}

export type ItemLendCount = {
  id: string; name: string; size: string; status: ItemStatus; archived: boolean;
  lends: number; last_lent: string | null;
};

/** How many times each garment has been lent — including never. */
export async function getItemLendCounts(): Promise<ItemLendCount[]> {
  await ready();
  return q<ItemLendCount>(
    `SELECT i.id, i.name, i.size, i.status, i.archived,
            count(l.id)::int AS lends, ${iso("max(l.lent_at)")} AS last_lent
       FROM items i LEFT JOIN lendings l ON l.item_id = i.id
      GROUP BY i.id
      ORDER BY count(l.id) DESC, i.id`
  );
}

/* ------------------------------------------------------------- settings */
const DEFAULT_SETTINGS: Settings = {
  whatsapp: "", email: "", instagram: "",
  pay_title: "Bank transfer", pay_line1: "", pay_line2: "", pay_line3: "",
  slots: "10:00,11:00,12:00,14:00,15:00,16:00,17:00",
  closed_days: "0",
};

export async function getSettings(): Promise<Settings> {
  await ready();
  const rows = await q<Settings>(
    `SELECT whatsapp, email, instagram, pay_title, pay_line1, pay_line2, pay_line3,
            slots, closed_days FROM settings WHERE id = 1`
  );
  return rows[0] ?? DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings): Promise<void> {
  await ready();
  await q(
    `INSERT INTO settings (id, whatsapp, email, instagram, pay_title, pay_line1,
        pay_line2, pay_line3, slots, closed_days)
     VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO UPDATE SET whatsapp=$1, email=$2, instagram=$3,
        pay_title=$4, pay_line1=$5, pay_line2=$6, pay_line3=$7, slots=$8, closed_days=$9`,
    [s.whatsapp, s.email, s.instagram, s.pay_title, s.pay_line1, s.pay_line2,
     s.pay_line3, s.slots, s.closed_days]
  );
}

/* -------------------------------------------------------------- content */

/** The stored (edited) wording for one page, keyed "<page>.<field>". */
export async function getStoredContent(page: string): Promise<Record<string, string>> {
  await ready();
  const rows = await q<{ key: string; value: string }>(
    `SELECT key, value FROM content WHERE key LIKE $1`,
    [`${page}.%`]
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** A page's copy: the team's edits over the original wording. */
export async function getPageCopy(page: string): Promise<PageCopy> {
  return resolvePage(page, await getStoredContent(page));
}

/**
 * Saves one page. A field set back to its original wording is deleted rather
 * than stored, so it goes on following the original.
 */
export async function savePageContent(page: string, values: Record<string, string>): Promise<void> {
  await ready();
  const def = findPage(page);
  if (!def) throw new Error(`Unknown content page "${page}"`);
  for (const f of fieldsOf(def)) {
    if (!(f.key in values)) continue;
    const key = storedKey(page, f.key);
    if (values[f.key] === defaultValue(f)) {
      await q(`DELETE FROM content WHERE key = $1`, [key]);
    } else {
      await q(
        `INSERT INTO content (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
        [key, values[f.key]]
      );
    }
  }
}

/* ----------------------------------------------------------------- misc */
export async function counts() {
  await ready();
  const rows = await q<{ total: number; available: number; out: number; waiting: number; lent: number }>(
    `SELECT
       (SELECT count(*)::int FROM items WHERE archived = FALSE) AS total,
       (SELECT count(*)::int FROM items WHERE archived = FALSE AND status = 'available') AS available,
       (SELECT count(*)::int FROM items WHERE archived = FALSE AND status <> 'available') AS out,
       (SELECT count(*)::int FROM requests WHERE status IN ('pending','confirmed')) AS waiting,
       (SELECT count(*)::int FROM lendings WHERE returned_at IS NULL) AS lent`
  );
  return rows[0] ?? { total: 0, available: 0, out: 0, waiting: 0, lent: 0 };
}
