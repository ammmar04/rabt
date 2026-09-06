export type Status = "available" | "borrowed" | "soon";

export type Category = {
  slug: string;
  name: string;
  singular: string;
  blurb: string;
  image: string;
  sort: number;
};

export type Item = {
  id: string;
  name: string;
  category: string;
  type: string;
  colour: string;
  colour_hex: string;
  sizes: string;
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
  requested_date: string;
  requested_time: string;
  contact_method: string;
  contact_value: string;
  person_name: string;
  contribution: string;
  status: number;
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

/** The lifecycle a request moves through. Index is stored on the row. */
export const STATUS_FLOW = [
  "Request received",
  "Being prepared",
  "Ready for collection",
  "Borrowed",
  "Return pending",
  "Returned",
] as const;

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const STATUS_LABEL: Record<Status, string> = {
  available: "Available",
  borrowed: "Currently borrowed",
  soon: "Available soon",
};

/** "S, M, L" -> ["S","M","L"] */
export function parseSizes(s: string): string[] {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
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
