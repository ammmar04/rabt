import "server-only";
import { q, exec } from "./db";
import type { Category, Item, Request, Settings } from "./types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let schemaReady: Promise<void> | null = null;

/** Create tables (and seed an empty database) on first use. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
      await exec(sql);
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

/* ----------------------------------------------------------- categories */
export async function getCategories(): Promise<Category[]> {
  await ready();
  return q<Category>("SELECT * FROM categories ORDER BY sort, name");
}

/* ---------------------------------------------------------------- items */
const ITEM_COLS = `id, name, category, type, colour, colour_hex, sizes, fit, condition,
  status, to_char(available_from,'YYYY-MM-DD') AS available_from, description,
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

export type ItemInput = Omit<Item, "archived">;

export async function createItem(data: ItemInput): Promise<void> {
  await ready();
  await q(
    `INSERT INTO items (id, name, category, type, colour, colour_hex, sizes, fit,
       condition, status, available_from, description, measurements, care,
       image_url, detail_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
       CASE WHEN $11 = '' THEN NULL ELSE $11::date END,
       $12,$13,$14,$15,$16)`,
    [
      data.id, data.name, data.category, data.type, data.colour, data.colour_hex,
      data.sizes, data.fit, data.condition, data.status, data.available_from ?? "",
      data.description, data.measurements, data.care, data.image_url, data.detail_url,
    ]
  );
}

export async function updateItem(id: string, data: ItemInput): Promise<void> {
  await ready();
  await q(
    `UPDATE items SET name=$2, category=$3, type=$4, colour=$5, colour_hex=$6,
       sizes=$7, fit=$8, condition=$9, status=$10,
       available_from = CASE WHEN $11 = '' THEN NULL ELSE $11::date END,
       description=$12, measurements=$13, care=$14, image_url=$15, detail_url=$16,
       updated_at = now()
     WHERE id = $1`,
    [
      id, data.name, data.category, data.type, data.colour, data.colour_hex,
      data.sizes, data.fit, data.condition, data.status, data.available_from ?? "",
      data.description, data.measurements, data.care, data.image_url, data.detail_url,
    ]
  );
}

export async function setItemStatus(id: string, status: string, availableFrom = ""): Promise<void> {
  await ready();
  await q(
    `UPDATE items SET status = $2,
       available_from = CASE WHEN $3 = '' THEN NULL ELSE $3::date END,
       updated_at = now()
     WHERE id = $1`,
    [id, status, availableFrom]
  );
}

/** Soft delete — keeps request history intact. */
export async function archiveItem(id: string): Promise<void> {
  await ready();
  await q(`UPDATE items SET archived = TRUE, updated_at = now() WHERE id = $1`, [id]);
}

export async function itemIdExists(id: string): Promise<boolean> {
  await ready();
  const rows = await q<{ n: number }>(`SELECT count(*)::int AS n FROM items WHERE id = $1`, [id]);
  return (rows[0]?.n ?? 0) > 0;
}

/** Next free id for a category, e.g. suits -> R-106 */
export async function nextItemId(category: string): Promise<string> {
  await ready();
  const prefixes: Record<string, number> = {
    suits: 100, blazers: 200, shirts: 300, trousers: 400,
  };
  const base = prefixes[category] ?? 500;
  const rows = await q<{ id: string }>(
    `SELECT id FROM items WHERE id ~ '^R-[0-9]+$' ORDER BY id`
  );
  const used = new Set(rows.map((r) => r.id));
  for (let n = base + 1; n < base + 100; n++) {
    const candidate = `R-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `R-${Date.now().toString().slice(-6)}`;
}

/* ------------------------------------------------------------- requests */
export async function getRequests(): Promise<Request[]> {
  await ready();
  return q<Request>(
    `SELECT r.ref, r.item_id, r.item_name, r.size, r.requested_date, r.requested_time,
            r.contact_method, r.contact_value, r.person_name, r.contribution, r.status,
            to_char(r.created_at,'YYYY-MM-DD') AS created_at,
            i.image_url AS item_image
       FROM requests r LEFT JOIN items i ON i.id = r.item_id
      ORDER BY r.created_at DESC`
  );
}

export async function getRequestsByRefs(refs: string[]): Promise<Request[]> {
  await ready();
  if (!refs.length) return [];
  const list = refs.slice(0, 50);
  const holes = list.map((_, i) => `$${i + 1}`).join(",");
  return q<Request>(
    `SELECT r.ref, r.item_id, r.item_name, r.size, r.requested_date, r.requested_time,
            r.contact_method, r.contact_value, r.person_name, r.contribution, r.status,
            to_char(r.created_at,'YYYY-MM-DD') AS created_at,
            i.image_url AS item_image
       FROM requests r LEFT JOIN items i ON i.id = r.item_id
      WHERE r.ref IN (${holes}) ORDER BY r.created_at DESC`,
    list
  );
}

export async function createRequest(r: Omit<Request, "created_at">): Promise<void> {
  await ready();
  await q(
    `INSERT INTO requests (ref, item_id, item_name, size, requested_date,
        requested_time, contact_method, contact_value, person_name, contribution, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      r.ref, r.item_id, r.item_name, r.size, r.requested_date, r.requested_time,
      r.contact_method, r.contact_value, r.person_name, r.contribution, r.status,
    ]
  );
}

export async function setRequestStatus(ref: string, status: number): Promise<void> {
  await ready();
  await q(`UPDATE requests SET status = $2, updated_at = now() WHERE ref = $1`, [ref, status]);
}

export async function deleteRequest(ref: string): Promise<void> {
  await ready();
  await q(`DELETE FROM requests WHERE ref = $1`, [ref]);
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

/* ----------------------------------------------------------------- misc */
export async function counts() {
  await ready();
  const rows = await q<{ total: number; available: number; open: number }>(
    `SELECT
       (SELECT count(*)::int FROM items WHERE archived = FALSE) AS total,
       (SELECT count(*)::int FROM items WHERE archived = FALSE AND status='available') AS available,
       (SELECT count(*)::int FROM requests WHERE status < 5) AS open`
  );
  return rows[0] ?? { total: 0, available: 0, open: 0 };
}
