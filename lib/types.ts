export type Category = {
  slug: string;
  name: string;
  singular: string;
  blurb: string;
  image: string;
  sort: number;
};

/* ------------------------------------------------------- physical status */

/**
 * Where a garment physically is right now. Deliberately separate from the
 * state of any request for it: a request can be cancelled while the suit is
 * in the wash, and the wash has nothing to do with the request.
 *
 * To add a status, add a line here — the admin selects, catalogue filters,
 * badges and public notes all read from this list.
 */
export const ITEM_STATUSES = [
  {
    value: "available", label: "Available", badge: "available",
    borrowable: true, hasReturnDate: false,
    note: "",
  },
  {
    value: "on_hold", label: "On hold", badge: "soon",
    borrowable: false, hasReturnDate: false,
    note: "Someone has requested this piece, so it is being held for them while we confirm.",
  },
  {
    value: "borrowed", label: "Borrowed", badge: "borrowed",
    borrowable: false, hasReturnDate: true,
    note: "This piece is out on loan at the moment.",
  },
  {
    value: "repair", label: "Under repair", badge: "soon",
    borrowable: false, hasReturnDate: true,
    note: "This piece is being repaired.",
  },
  {
    value: "wash", label: "Out for wash", badge: "soon",
    borrowable: false, hasReturnDate: true,
    note: "This piece is being cleaned.",
  },
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number]["value"];
export type ItemStatusMeta = (typeof ITEM_STATUSES)[number];

export function itemStatus(value: string): ItemStatusMeta {
  return ITEM_STATUSES.find((s) => s.value === value) ?? ITEM_STATUSES[0];
}

export function isItemStatus(value: string): value is ItemStatus {
  return ITEM_STATUSES.some((s) => s.value === value);
}

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
  status: ItemStatus;
  /** The request holding this garment, while status is on_hold. */
  hold_ref: string | null;
  available_from: string | null;
  description: string;
  measurements: string;
  care: string;
  image_url: string;
  detail_url: string;
  archived: boolean;
};

/* -------------------------------------------------------- request status */

/**
 * Where a request is in its own lifecycle. A request that reaches
 * "collected" has a lending record; the lending, not the request, carries the
 * pickup and return dates.
 */
export const REQUEST_STATUSES = {
  pending: { label: "Awaiting confirmation", open: true },
  confirmed: { label: "Confirmed", open: true },
  collected: { label: "Borrowed", open: true },
  returned: { label: "Returned", open: false },
  cancelled: { label: "Cancelled", open: false },
  rejected: { label: "Unfulfilled", open: false },
} as const;

export type RequestStatus = keyof typeof REQUEST_STATUSES;

/** Still holding or using a garment. */
export const OPEN_REQUEST_STATUSES: RequestStatus[] = ["pending", "confirmed", "collected"];
/** Not yet handed over — can still be confirmed, cancelled or marked unfulfilled. */
export const WAITING_REQUEST_STATUSES: RequestStatus[] = ["pending", "confirmed"];

export function requestLabel(status: string): string {
  return REQUEST_STATUSES[status as RequestStatus]?.label ?? status;
}

/**
 * Why a request did not go ahead. "Cancelled" is the request being withdrawn;
 * "unfulfilled" is Rabt not being able to go ahead with it.
 */
export const CLOSE_REASONS: Record<"cancelled" | "rejected", string[]> = {
  cancelled: [
    "Borrower cancelled",
    "Borrower chose a different piece",
    "Duplicate request",
    "Other",
  ],
  rejected: [
    "Could not reach the borrower",
    "Borrower did not collect",
    "Piece did not fit",
    "Piece unavailable or damaged",
    "Other",
  ],
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
  status: RequestStatus;
  close_reason: string;
  close_note: string;
  /** ISO timestamps (UTC). */
  created_at: string;
  confirmed_at: string | null;
  closed_at: string | null;
  /** Joined from the item so uploaded photos render, not a guessed path. */
  item_image?: string | null;
  item_status?: ItemStatus | null;
  item_hold_ref?: string | null;
  /** Joined from the lending record, once handed over. */
  lending_id?: number | null;
  lent_at?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  returned_at?: string | null;
};

/**
 * One handover of one garment. Rows are only ever added and closed, never
 * reused, so a suit lent three times has three lendings — whatever its
 * physical status is now.
 */
export type Lending = {
  id: number;
  request_ref: string | null;
  item_id: string;
  item_name: string;
  item_size: string;
  borrower_name: string;
  /** ISO timestamp of the handover. */
  lent_at: string;
  due_date: string | null;
  due_time: string;
  /** ISO timestamp, set when it comes back. */
  returned_at: string | null;
  /** Joined from the request, for following up. */
  contact_method?: string;
  contact_value?: string;
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

/** Suggestions in the admin size field. Any size can be typed, e.g. "40". */
export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

/** The optional contribution choices offered at the end of a request. */
export const AMOUNTS = ["Rs 200", "Rs 500", "Rs 1,000", "Another amount", "Not this time"] as const;

export const CONTACT_METHODS = ["WhatsApp", "Email", "Secondary account"] as const;

/** "Black Formal Suit" + "40" -> "Black Formal Suit — Size 40" */
export function itemTitle(item: { name: string; size: string }): string {
  return item.size ? `${item.name} — Size ${item.size}` : item.name;
}

/** "{method}" -> "WhatsApp" in a piece of editable copy. */
export function fillTokens(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
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

/* ------------------------------------------------------------------- time */

/**
 * Rabt runs on campus in Pakistan. Dates the team and borrowers see — "due
 * today", the days offered for collection, when a request came in — are
 * worked out in this timezone, whatever timezone the server happens to run
 * in (UTC on Vercel).
 */
export const SITE_TZ = "Asia/Karachi";

function partsIn(date: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Today as YYYY-MM-DD, on campus. */
export function siteToday(): string {
  return partsIn(new Date(), SITE_TZ);
}

/** The calendar date of an instant, on campus. */
export function siteDateOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : partsIn(d, SITE_TZ);
}

/** "2026-09-30" + 3 -> "2026-10-03", without timezone drift. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD date. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * The seven days offered for collection, starting tomorrow on campus. The
 * borrow form and the server both use this, so they always agree on which
 * days were offered — even just after midnight.
 */
export function collectionDays(closedDays: string): { iso: string; closed: boolean }[] {
  const closed = new Set(
    closedDays.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
  );
  const today = siteToday();
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(today, i + 1);
    return { iso, closed: closed.has(weekdayOf(iso)) };
  });
}

/** "23 Sept 2026, 14:05" — a submitted or handed-over time, on campus. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SITE_TZ, day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}

/** "23 Sept 2026" for an instant, on campus. */
export function formatDay(iso: string | null | undefined): string {
  const day = siteDateOf(iso);
  if (!day) return "";
  const d = new Date(day + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Whole days from one YYYY-MM-DD date to another. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from.slice(0, 10) + "T00:00:00Z");
  const b = Date.parse(to.slice(0, 10) + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/** "3 hours ago", "2 days ago" — how long something has been waiting. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return "";
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/* ----------------------------------------------------------------- returns */

/** Whole days from today (on campus) to a YYYY-MM-DD date. Negative = passed. */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return null;
  return daysBetween(siteToday(), date);
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

export function returnBucket(l: Pick<Lending, "returned_at" | "due_date">): ReturnBucket {
  if (l.returned_at) return "returned";
  const d = daysUntil(l.due_date);
  if (d === null) return "undated";
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= DUE_SOON_DAYS) return "soon";
  return "scheduled";
}

/** Splits lendings into the groups the Returns view shows. */
export function groupReturns<T extends Pick<Lending, "returned_at" | "due_date">>(
  rows: T[]
): Record<ReturnBucket, T[]> {
  const out: Record<ReturnBucket, T[]> = {
    overdue: [], today: [], soon: [], scheduled: [], undated: [], returned: [],
  };
  for (const r of rows) out[returnBucket(r)].push(r);
  return out;
}

/** How many returns the team should be looking at right now. */
export function needsAttention(rows: Pick<Lending, "returned_at" | "due_date">[]): {
  overdue: number; today: number; soon: number; undated: number; total: number;
} {
  const g = groupReturns(rows);
  const overdue = g.overdue.length;
  const today = g.today.length;
  const soon = g.soon.length;
  const undated = g.undated.length;
  return { overdue, today, soon, undated, total: overdue + today + soon + undated };
}
