/**
 * Validation rules shared by the browser and the server.
 *
 * Every form runs these on submit for immediate feedback, and every server
 * action runs the same functions again, so a request that skips the page
 * cannot put bad data in the database. Rules follow what each field is for,
 * and stay loose where legitimate input varies (names, sizes, descriptions).
 *
 * Each checker returns either { value } — the cleaned value to store — or
 * { error } — a sentence to show beside the field.
 */

export type Checked<T = string> = { value: T; error?: undefined } | { value?: undefined; error: string };

const ok = <T,>(value: T): Checked<T> => ({ value });
const bad = (error: string): Checked<never> => ({ error });

/** Strips control characters and collapses runs of spaces on one-line input. */
export function cleanLine(raw: unknown): string {
  return String(raw ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Like cleanLine, but keeps line breaks for multi-line text. */
export function cleanText(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type TextOpts = { label: string; required?: boolean; max: number; min?: number; multiline?: boolean };

/** Free text: required or optional, with a length ceiling. */
export function text(raw: unknown, o: TextOpts): Checked {
  const v = o.multiline ? cleanText(raw) : cleanLine(raw);
  if (!v) return o.required ? bad(`${o.label} is required.`) : ok("");
  if (o.min && v.length < o.min) return bad(`${o.label} needs at least ${o.min} characters.`);
  if (v.length > o.max) return bad(`${o.label} can be at most ${o.max} characters (currently ${v.length}).`);
  return ok(v);
}

/* ------------------------------------------------------------------ phone */

/**
 * A WhatsApp number. Pakistani mobiles are stored as 11 digits ("03224404049")
 * however they were typed — spaces, dashes, +92 or 0092 are all fine. Numbers
 * from other countries are accepted in international form ("+44 7700 900123")
 * so a visitor from abroad is not turned away.
 */
export function whatsapp(raw: unknown): Checked {
  const typed = cleanLine(raw);
  if (!typed) return bad("Add your WhatsApp number.");
  if (/[^\d\s+\-().]/.test(typed)) {
    return bad("Use digits only, like 0322 4404049.");
  }
  let digits = typed.replace(/[\s\-().]/g, "");
  let international = false;
  if (digits.startsWith("+")) { international = true; digits = digits.slice(1); }
  else if (digits.startsWith("00")) { international = true; digits = digits.slice(2); }
  if (!/^\d+$/.test(digits)) return bad("Use digits only, like 0322 4404049.");

  // +92 / 0092 / 92 prefixes all mean a Pakistani number.
  if (digits.startsWith("92") && (international || digits.length === 12)) {
    const national = "0" + digits.slice(2);
    if (/^03\d{9}$/.test(national)) return ok(national);
    return bad("That doesn't look like a Pakistani mobile number. It should be 11 digits, like 0322 4404049.");
  }

  if (international) {
    if (digits.length < 8 || digits.length > 15) {
      return bad("International numbers need their country code and 8 to 15 digits, like +44 7700 900123.");
    }
    return ok("+" + digits);
  }

  if (digits.length < 11) {
    return bad(`That number is ${digits.length} digit${digits.length === 1 ? "" : "s"} — Pakistani mobile numbers have 11, like 0322 4404049.`);
  }
  if (digits.length > 11) {
    return bad("That number has too many digits. Pakistani mobile numbers have 11, like 0322 4404049. For a number from abroad, start with + and the country code.");
  }
  if (!digits.startsWith("03")) {
    return bad("Pakistani mobile numbers start with 03, like 0322 4404049. For a number from abroad, start with + and the country code.");
  }
  return ok(digits);
}

/** "03224404049" -> "0322 4404049", for display. */
export function formatPhone(value: string): string {
  return /^03\d{9}$/.test(value) ? `${value.slice(0, 4)} ${value.slice(4)}` : value;
}

/** A stored number as wa.me wants it: country code and digits, no "+". */
export function waDigits(value: string): string | null {
  const d = value.replace(/[^\d+]/g, "");
  if (/^03\d{9}$/.test(d)) return "92" + d.slice(1);
  if (/^\+\d{8,15}$/.test(d)) return d.slice(1);
  if (/^\d{10,15}$/.test(d)) return d;
  return null;
}

/* ------------------------------------------------------------------ email */

export function email(raw: unknown, label = "Email address"): Checked {
  const v = cleanLine(raw).toLowerCase();
  if (!v) return bad(`Add an email address.`);
  if (v.length > 254) return bad(`${label} is too long.`);
  // Deliberately practical rather than RFC-complete: one @, something before
  // it, and a domain with a dot and a real-looking ending.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(v)) {
    return bad("That email address doesn't look complete — it should look like name@example.com.");
  }
  if (/\.\./.test(v)) return bad("That email address has two dots in a row.");
  return ok(v);
}

/** A handle or address on another service, for "secondary account". */
export function handle(raw: unknown): Checked {
  const v = cleanLine(raw);
  if (!v) return bad("Add the account we should use to reach you.");
  if (v.length < 3) return bad("That looks too short to reach you on.");
  if (v.length > 100) return bad("That is longer than we can store — 100 characters at most.");
  if (!/[a-z0-9]/i.test(v)) return bad("That doesn't look like an account name or address.");
  return ok(v);
}

/** The contact detail, checked against the method the borrower chose. */
export function contactFor(method: string, raw: unknown): Checked {
  if (method === "WhatsApp") return whatsapp(raw);
  if (method === "Email") return email(raw);
  if (method === "Secondary account") return handle(raw);
  return bad("Choose how we should contact you.");
}

/* ------------------------------------------------------------ dates/times */

/** A real calendar date as YYYY-MM-DD, optionally within bounds. */
export function isoDate(
  raw: unknown,
  o: { label: string; required?: boolean; min?: string; max?: string; minMsg?: string; maxMsg?: string }
): Checked {
  const v = cleanLine(raw);
  if (!v) return o.required ? bad(`${o.label} is required.`) : ok("");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return bad(`${o.label} should be a date.`);
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) {
    return bad(`${o.label} isn't a real date.`);
  }
  if (y < 2000 || y > 2100) return bad(`${o.label} should be a date between 2000 and 2100.`);
  if (o.min && v < o.min) return bad(o.minMsg ?? `${o.label} can't be before ${o.min}.`);
  if (o.max && v > o.max) return bad(o.maxMsg ?? `${o.label} can't be after ${o.max}.`);
  return ok(v);
}

/** A 24-hour time. "9:00" is normalised to "09:00". */
export function time24(raw: unknown, o: { label: string; required?: boolean }): Checked {
  const v = cleanLine(raw);
  if (!v) return o.required ? bad(`${o.label} is required.`) : ok("");
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return bad(`${o.label} should be a time like 14:30.`);
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return bad(`${o.label} isn't a real time.`);
  return ok(`${String(h).padStart(2, "0")}:${m[2]}`);
}

/* ---------------------------------------------------------------- choices */

/** A value that must be one of a fixed set (selects, radios, chips). */
export function oneOf<T extends string>(raw: unknown, allowed: readonly T[], message: string): Checked<T> {
  const v = cleanLine(raw) as T;
  return allowed.includes(v) ? ok(v) : bad(message);
}

/* ------------------------------------------------------------- inventory */

/**
 * An item ID chosen by the team. Rabt runs its own numbering, so the format
 * is left open; it only has to be safe in a web address and unambiguous.
 */
export function itemId(raw: unknown): Checked {
  const v = cleanLine(raw);
  if (!v) return bad("Give the item an ID — for example the number on its tag.");
  if (v.length > 24) return bad("Item IDs can be at most 24 characters.");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v)) {
    return bad("Use letters, numbers, dashes, dots or underscores, starting with a letter or number — like R-115.");
  }
  return ok(v);
}

export function hexColour(raw: unknown): Checked {
  const v = cleanLine(raw);
  if (!v) return ok("#8A8A82");
  if (!/^#[0-9a-f]{6}$/i.test(v)) return bad("The swatch should be a colour like #2C3A54.");
  return ok(v.toUpperCase());
}

/* --------------------------------------------------------------- settings */

/** Rabt's own WhatsApp number, stored as country code + digits for wa.me. */
export function waSetting(raw: unknown): Checked {
  const v = cleanLine(raw);
  if (!v) return ok("");
  const d = waDigits(v.replace(/[\s\-().]/g, ""));
  if (!d) return bad("Enter the number with its country code, like 923001234567 (or 0300 1234567).");
  return ok(d);
}

export function instagram(raw: unknown): Checked {
  let v = cleanLine(raw);
  if (!v) return ok("");
  v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(v)) {
    return bad("Instagram handles use letters, numbers, dots and underscores, up to 30 characters.");
  }
  return ok(v);
}

/** "10:00, 9:30, 14:00" -> "09:30,10:00,14:00". */
export function slotList(raw: unknown): Checked {
  const parts = cleanLine(raw).split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return bad("Add at least one collection time.");
  const out = new Set<string>();
  for (const p of parts) {
    const t = time24(p, { label: `"${p}"` });
    if (t.error) return bad(`${t.error.replace(/\.$/, "")} — separate times with commas, like 10:00, 14:30.`);
    out.add(t.value!);
  }
  if (out.size > 24) return bad("That is more than 24 collection times.");
  return ok([...out].sort().join(","));
}

/** Weekday numbers, 0 = Sunday. Leaves at least one day open. */
export function closedDays(raw: unknown): Checked {
  const parts = cleanLine(raw).split(",").map((s) => s.trim()).filter(Boolean);
  const days = new Set<number>();
  for (const p of parts) {
    if (!/^[0-6]$/.test(p)) return bad("Closed days should be days of the week.");
    days.add(Number(p));
  }
  if (days.size === 7) return bad("Leave at least one day open, or nobody can pick a collection day.");
  return ok([...days].sort().join(","));
}

/* ----------------------------------------------------------------- helpers */

export type FieldErrors = Record<string, string>;

/** Collects errors from a set of checks into a field → message map. */
export function collect<T extends Record<string, Checked<unknown>>>(
  checks: T
): { values: { [K in keyof T]: NonNullable<T[K]["value"]> }; errors: FieldErrors } {
  const values = {} as { [K in keyof T]: NonNullable<T[K]["value"]> };
  const errors: FieldErrors = {};
  for (const [k, c] of Object.entries(checks)) {
    if (c.error) errors[k] = c.error;
    else (values as Record<string, unknown>)[k] = c.value;
  }
  return { values, errors };
}
