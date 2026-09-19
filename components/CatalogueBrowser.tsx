"use client";

import { useMemo, useState } from "react";
import ItemCard from "./ItemCard";
import {
  SIZE_OPTIONS, descriptionWords, matchesAll, searchTokens, searchWords,
  type Category, type Item, type PageContent,
} from "@/lib/types";

type Filters = { category: string[]; size: string[]; colour: string[]; avail: string[] };

const EMPTY: Filters = { category: [], size: [], colour: [], avail: [] };

const AVAIL = [
  ["available", "Available now"],
  ["soon", "Available soon"],
  ["borrowed", "Currently borrowed"],
] as const;

/** Letter sizes in wearing order, then numeric sizes, then anything else. */
function bySize(a: string, b: string): number {
  const letter = (s: string) => SIZE_OPTIONS.indexOf(s.toUpperCase() as typeof SIZE_OPTIONS[number]);
  const la = letter(a), lb = letter(b);
  if (la !== -1 && lb !== -1) return la - lb;
  if (la !== -1) return -1;
  if (lb !== -1) return 1;
  const na = Number(a), nb = Number(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

export default function CatalogueBrowser({
  items,
  categories,
  initialCategory,
  content,
}: {
  items: Item[];
  categories: Category[];
  initialCategory?: string;
  content: PageContent;
}) {
  const [f, setF] = useState<Filters>(
    initialCategory ? { ...EMPTY, category: [initialCategory] } : EMPTY
  );
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const catBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  const colours = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach((i) => {
      if (i.colour && !seen.has(i.colour)) seen.set(i.colour, i.colour_hex);
    });
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  // Sizes come from the wardrobe itself, so numeric sizing ("40") filters
  // just as well as S/M/L.
  const sizes = useMemo(
    () => Array.from(new Set(items.map((i) => i.size).filter(Boolean))).sort(bySize),
    [items]
  );

  /** Search words per item, built once rather than on every keystroke. */
  const haystacks = useMemo(() => {
    const m = new Map<string, { words: string[]; desc: string[] }>();
    items.forEach((i) =>
      m.set(i.id, {
        words: searchWords(i, catBySlug.get(i.category)),
        desc: descriptionWords(i),
      })
    );
    return m;
  }, [items, catBySlug]);

  const toggle = (key: keyof Filters, value: string) =>
    setF((prev) => {
      const on = prev[key].includes(value);
      return { ...prev, [key]: on ? prev[key].filter((v) => v !== value) : [...prev[key], value] };
    });

  const activeCount =
    f.category.length + f.size.length + f.colour.length + f.avail.length + (query.trim() ? 1 : 0);

  const clear = () => {
    setF(EMPTY);
    setQuery("");
  };

  const shown = useMemo(() => {
    const picked = items.filter((i) => {
      if (f.category.length && !f.category.includes(i.category)) return false;
      if (f.size.length && !f.size.includes(i.size)) return false;
      if (f.colour.length && !f.colour.includes(i.colour)) return false;
      if (f.avail.length && !f.avail.includes(i.status)) return false;
      return true;
    });

    const tokens = searchTokens(query);
    if (!tokens.length) return picked;

    // What the garment is comes first. Only when nothing matches on that do
    // descriptions come into it, so "blazers" cannot return trousers whose
    // description happens to mention a blazer.
    const byIdentity = picked.filter((i) =>
      matchesAll(haystacks.get(i.id)?.words ?? [], tokens)
    );
    if (byIdentity.length) return byIdentity;

    return picked.filter((i) => {
      const h = haystacks.get(i.id);
      if (!h) return false;
      return matchesAll([...h.words, ...h.desc], tokens);
    });
  }, [items, f, query, haystacks]);

  const chip = (key: keyof Filters, value: string, label: React.ReactNode) => (
    <button
      key={value}
      className="chip"
      type="button"
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
          {/* Submitting is a no-op: results already track what is typed. */}
          <form className="search" onSubmit={(e) => e.preventDefault()} role="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              id="cat-search"
              type="search"
              placeholder="Blazer, navy, size M…"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="search__clear" type="button" aria-label="Clear search" onClick={() => setQuery("")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </form>
        </div>

        <button
          className="filters__toggle"
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="filter-groups"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <span>Filters{activeCount ? ` (${activeCount})` : ""}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" data-open={filtersOpen ? "1" : "0"}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div className="filters__groups" id="filter-groups" data-open={filtersOpen ? "1" : "0"}>
          <div className="fgroup">
            <span className="label">Type</span>
            <div className="chips">{categories.map((c) => chip("category", c.slug, c.name))}</div>
          </div>

          {sizes.length > 0 && (
            <div className="fgroup">
              <span className="label">Size</span>
              <div className="chips">{sizes.map((s) => chip("size", s, s))}</div>
            </div>
          )}

          <div className="fgroup">
            <span className="label">Availability</span>
            <div className="chips">{AVAIL.map(([v, l]) => chip("avail", v, l))}</div>
          </div>

          {colours.length > 0 && (
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
          )}
        </div>
      </aside>

      <div>
        <div className="toolbar">
          <span className="label">
            {shown.length} item{shown.length === 1 ? "" : "s"}
            {activeCount ? ` of ${items.length}` : ""}
          </span>
          {activeCount > 0 && (
            <button className="tlink" type="button" onClick={clear}>Clear filters</button>
          )}
        </div>
        {shown.length ? (
          <div className="items items--4">
            {shown.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                typeLabel={catBySlug.get(it.category)?.singular}
                reveal={false}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>{content.cat_empty}</p>
            {activeCount > 0 && (
              <button className="btn btn--ghost" type="button" style={{ marginTop: "1.2rem" }} onClick={clear}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
