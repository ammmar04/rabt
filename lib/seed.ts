import "server-only";
import { q } from "./db";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type SeedItem = {
  id: string; name: string; category: string; type: string; colour: string;
  colourHex: string; sizes: string[]; fit: string; condition: string;
  status: string; availableFrom: string | null; description: string;
  measurements: Record<string, string>; care: string;
};
type SeedFile = {
  config: {
    contact: { whatsapp: string; email: string; instagram: string };
    contribution: { account: { title: string; line1: string; line2: string; line3: string } };
    slots: string[];
    closedDays: number[];
  };
  categories: { slug: string; name: string; singular: string; blurb: string; image: string }[];
  items: SeedItem[];
};

/**
 * Populates an empty database from data/inventory.json so a fresh deploy has
 * a wardrobe to show. Does nothing once any category exists, so it will never
 * overwrite real data the team has entered.
 */
export async function seedIfEmpty(): Promise<void> {
  const existing = await q<{ n: number }>("SELECT count(*)::int AS n FROM categories");
  if ((existing[0]?.n ?? 0) > 0) return;

  let data: SeedFile;
  try {
    data = JSON.parse(readFileSync(join(process.cwd(), "data", "inventory.json"), "utf8"));
  } catch {
    return; // no seed file shipped — start empty, that's fine
  }

  for (const [i, c] of data.categories.entries()) {
    await q(
      `INSERT INTO categories (slug, name, singular, blurb, image, sort)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (slug) DO NOTHING`,
      [c.slug, c.name, c.singular, c.blurb, `/img/categories/${c.slug}.svg`, i]
    );
  }

  for (const it of data.items) {
    const measurements = Object.entries(it.measurements || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    await q(
      `INSERT INTO items (id, name, category, type, colour, colour_hex, sizes, fit,
         condition, status, available_from, description, measurements, care,
         image_url, detail_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
         CASE WHEN $11 = '' THEN NULL ELSE $11::date END,
         $12,$13,$14,$15,$16)
       ON CONFLICT (id) DO NOTHING`,
      [
        it.id, it.name, it.category, it.type, it.colour, it.colourHex,
        (it.sizes || []).join(","), it.fit, it.condition, it.status,
        it.availableFrom ?? "", it.description, measurements, it.care,
        `/img/items/${it.id}.svg`, `/img/items/${it.id}-detail.svg`,
      ]
    );
  }

  const cfg = data.config;
  await q(
    `INSERT INTO settings (id, whatsapp, email, instagram, pay_title, pay_line1,
        pay_line2, pay_line3, slots, closed_days)
     VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
    [
      cfg.contact.whatsapp, cfg.contact.email, cfg.contact.instagram,
      cfg.contribution.account.title, cfg.contribution.account.line1,
      cfg.contribution.account.line2, cfg.contribution.account.line3,
      (cfg.slots || []).join(","), (cfg.closedDays || []).join(","),
    ]
  );
}
