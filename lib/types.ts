export type Status = "available" | "borrowed" | "soon";

export type Category = {
  slug: string;
  name: string;
  singular: string;
  blurb: string;
  image: string;
  sort: number;
};

/**
 * One row per physical garment. `size` is that garment's own size — a second
 * suit of the same cut in another size is a separate row with its own id,
 * availability and borrowing history.
 */
export type Item = {
  id: string;
  name: string;
  category: string;
  type: string;
  colour: string;
  colour_hex: string;
  size: string;
  fit: string;
  condition: string;
  status: Status;
  available_from: string | null;
  description: string;
  measurements: string;
  care: string;
  image_url: string;
  detail_url: string;
  archived: boolean;
};

export type Request = {
  ref: string;
  item_id: string | null;
  item_name: string;
  size: string;
  /** The collection day and time the borrower picked when requesting. */
  requested_date: string;
  requested_time: string;
  contact_method: string;
  contact_value: string;
  person_name: string;
  contribution: string;
  status: number;
  /** Expected return, entered by the team at handover. */
  return_date: string | null;
  return_time: string;
  returned_at: string | null;
  created_at: string;
  /** Joined from the item so uploaded photos render, not a guessed path. */
  item_image?: string | null;
};

export type Settings = {
  whatsapp: string;
  email: string;
  instagram: string;
  pay_title: string;
  pay_line1: string;
  pay_line2: string;
  pay_line3: string;
  slots: string;
  closed_days: string;
};

/** Catalogue page copy, edited in admin rather than in the source. */
export type PageContent = {
  cat_eyebrow: string;
  cat_heading: string;
  cat_intro: string;
  cat_empty: string;
};

/** The lifecycle a request moves through. Index is stored on the row. */
export const STATUS_FLOW = [
  "Request received",
  "Being prepared",
  "Ready for collection",
  "Borrowed",
  "Return pending",
  "Returned",
] as const;

/** Handed over — from here on the item is out and a return is owed. */
export const STATUS_BORROWED = 3;
export const STATUS_RETURNED = STATUS_FLOW.length - 1;

/** Suggestions in the admin size field. Any size can be typed, e.g. "40". */
export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const STATUS_LABEL: Record<Status, string> = {
  available: "Available",
  borrowed: "Currently borrowed",
  soon: "Available soon",
};

/** "Black Formal Suit" + "40" -> "Black Formal Suit — Size 40" */
export function itemTitle(item: { name: string; size: string }): string {
  return item.size ? `${item.name} — Size ${item.size}` : item.name;
}

/** "Chest: 38-42 in\nSleeve: 24 in" -> [["Chest","38-42 in"], ...] */
export function parseMeasurements(s: string): [string, string][] {
  return (s || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(":");
      return i === -1
        ? ([line, ""] as [string, string])
        : ([line.slice(0, i).trim(), line.slice(i + 1).trim()] as [string, string]);
    });
}

export function niceDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(String(value).slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fullDate(value: string): string {
  const d = new Date(value + "T00:00:00");
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/* ------------------------------------------------------------------ search */

/**
 * Words people use for things the wardrobe calls something else. Keeps
 * "pants" from returning nothing when the category is "Formal Trousers".
 */
const SYNONYMS: Record<string, string> = {
  pant: "trouser",
  slack: "trouser",
  bottom: "trouser",
  jacket: "blazer",
  coat: "blazer",
  sportcoat: "blazer",
  tuxedo: "suit",
  tux: "suit",
};

/** Crude singular form, enough to let "blazers" match "blazer". */
function stem(word: string): string {
  const w = word.replace(/[^a-z0-9]/g, "");
  if (w.length > 3 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && (w.endsWith("ses") || w.endsWith("xes") || w.endsWith("hes"))) {
    return w.slice(0, -2);
  }
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .split(/[\s/,()·—–-]+/)
    .map(stem)
    .map((w) => SYNONYMS[w] ?? w)
    .filter(Boolean)
    .join(" ");
}

/**
 * What an item *is*: the fields someone searches by. Kept apart from the
 * description, which is prose and cross-references other garments ("works
 * with the navy blazer"), so a search for blazers does not return trousers.
 */
export function searchWords(
  item: Item,
  category?: { name: string; singular: string }
): string[] {
  return normalise(
    [
      item.name, item.type, item.colour, item.id,
      item.size && `size ${item.size}`,
      item.fit, item.condition, item.category,
      category?.name, category?.singular,
    ]
      .filter(Boolean)
      .join(" ")
  ).split(" ").filter(Boolean);
}

/** The description, searched only when nothing matches on identity. */
export function descriptionWords(item: Item): string[] {
  return normalise(item.description).split(" ").filter(Boolean);
}

/** Query tokens, normalised the same way as the text they are matched to. */
export function searchTokens(query: string): string[] {
  return normalise(query).split(" ").filter(Boolean);
}

/**
 * Every token has to match the start of some word. Prefix matching keeps
 * part-typed words working ("blaz") while stopping a one-letter size from
 * matching the middle of an unrelated word ("m" in "formal").
 */
export function matchesAll(words: string[], tokens: string[]): boolean {
  return tokens.every((t) => words.some((w) => w.startsWith(t)));
}

/* ----------------------------------------------------------------- returns */

/** Whole days from today to a YYYY-MM-DD date. Negative means it has passed. */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const then = new Date(String(date).slice(0, 10) + "T00:00:00");
  if (isNaN(then.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((then.getTime() - now.getTime()) / 86_400_000);
}

/** "2 days overdue", "Due today", "Due tomorrow", "In 5 days". */
export function dueLabel(date: string | null | undefined): string {
  const d = daysUntil(date);
  if (d === null) return "No return date yet";
  if (d < -1) return `${Math.abs(d)} days overdue`;
  if (d === -1) return "1 day overdue";
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `In ${d} days`;
}

export type ReturnBucket =
  | "overdue" | "today" | "soon" | "scheduled" | "undated" | "returned";

/** Days ahead that still counts as "due soon". */
export const DUE_SOON_DAYS = 7;

export function returnBucket(r: Request): ReturnBucket {
  if (r.status >= STATUS_RETURNED) return "returned";
  const d = daysUntil(r.return_date);
  if (d === null) return "undated";
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= DUE_SOON_DAYS) return "soon";
  return "scheduled";
}

/** Splits handed-over borrowings into the groups the Returns view shows. */
export function groupReturns(rows: Request[]): Record<ReturnBucket, Request[]> {
  const out: Record<ReturnBucket, Request[]> = {
    overdue: [], today: [], soon: [], scheduled: [], undated: [], returned: [],
  };
  for (const r of rows) out[returnBucket(r)].push(r);
  return out;
}

/** How many returns the team should be looking at right now. */
export function needsAttention(rows: Request[]): {
  overdue: number; today: number; soon: number; undated: number; total: number;
} {
  const g = groupReturns(rows);
  const overdue = g.overdue.length;
  const today = g.today.length;
  const soon = g.soon.length;
  const undated = g.undated.length;
  return { overdue, today, soon, undated, total: overdue + today + soon + undated };
}
