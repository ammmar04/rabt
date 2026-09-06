"use client";

import { useMemo, useState } from "react";
import ItemCard from "./ItemCard";
import { parseSizes, SIZE_OPTIONS, type Category, type Item } from "@/lib/types";

type Filters = { category: string[]; size: string[]; colour: string[]; avail: string[] };

const AVAIL = [
  ["available", "Available now"],
  ["soon", "Available soon"],
  ["borrowed", "Currently borrowed"],
] as const;

export default function CatalogueBrowser({
  items,
  categories,
  initialCategory,
}: {
  items: Item[];
  categories: Category[];
  initialCategory?: string;
}) {
  const [f, setF] = useState<Filters>({
    category: initialCategory ? [initialCategory] : [],
    size: [],
    colour: [],
    avail: [],
  });
  const [query, setQuery] = useState("");

  const colours = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach((i) => { if (!seen.has(i.colour)) seen.set(i.colour, i.colour_hex); });
    return Array.from(seen.entries());
  }, [items]);

  const singular = useMemo(
    () => new Map(categories.map((c) => [c.slug, c.singular])),
    [categories]
  );

  const toggle = (key: keyof Filters, value: string) =>
    setF((prev) => {
      const on = prev[key].includes(value);
      return { ...prev, [key]: on ? prev[key].filter((v) => v !== value) : [...prev[key], value] };
    });

  const clear = () => { setF({ category: [], size: [], colour: [], avail: [] }); setQuery(""); };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (f.category.length && !f.category.includes(i.category)) return false;
      if (f.size.length && !parseSizes(i.sizes).some((s) => f.size.includes(s))) return false;
      if (f.colour.length && !f.colour.includes(i.colour)) return false;
      if (f.avail.length && !f.avail.includes(i.status)) return false;
      if (q) {
        const hay = `${i.name} ${i.type} ${i.colour} ${i.id} ${i.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, f, query]);

  const chip = (key: keyof Filters, value: string, label: React.ReactNode) => (
    <button
      key={value}
      className="chip"
      role="switch"
      aria-pressed={f[key].includes(value)}
      onClick={() => toggle(key, value)}
    >
      {label}
    </button>
  );

  return (
    <div className="cat-layout">
      <aside className="filters" aria-label="Filter the wardrobe">
        <div className="fgroup">
          <label className="label" htmlFor="cat-search">Search</label>
          <div className="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              id="cat-search"
              type="search"
              placeholder="Navy blazer, size M…"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="fgroup">
          <span className="label">Type</span>
          <div className="chips">{categories.map((c) => chip("category", c.slug, c.name))}</div>
        </div>

        <div className="fgroup">
          <span className="label">Size</span>
          <div className="chips">{SIZE_OPTIONS.map((s) => chip("size", s, s))}</div>
        </div>

        <div className="fgroup">
          <span className="label">Availability</span>
          <div className="chips">{AVAIL.map(([v, l]) => chip("avail", v, l))}</div>
        </div>

        <div className="fgroup">
          <span className="label">Colour</span>
          <div className="chips">
            {colours.map(([name, hex]) =>
              chip("colour", name, (
                <>
                  <span className="sw" style={{ background: hex }} />
                  {name}
                </>
              ))
            )}
          </div>
        </div>
      </aside>

      <div>
        <div className="toolbar">
          <span className="label">{shown.length} item{shown.length === 1 ? "" : "s"}</span>
          <button className="tlink" type="button" onClick={clear}>Clear filters</button>
        </div>
        {shown.length ? (
          <div className="items items--4">
            {shown.map((it, i) => (
              <ItemCard key={it.id} item={it} typeLabel={singular.get(it.category)} delay={(i % 4) + 1} />
            ))}
          </div>
        ) : (
          <div className="empty"><p>Nothing matches those filters just yet.</p></div>
        )}
      </div>
    </div>
  );
}
