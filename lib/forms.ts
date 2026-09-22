/**
 * Form-level validation: which fields each form has and the rules for each.
 * The admin forms run these before submitting, and the matching server
 * actions run them again before saving anything.
 */
import {
  CLOSE_REASONS, ITEM_STATUSES, addDays, itemStatus, siteToday,
  type ItemStatus,
} from "./types";
import {
  closedDays, collect, email, hexColour, instagram, isoDate, itemId, oneOf,
  slotList, text, time24, waSetting, type Checked, type FieldErrors,
} from "./validate";

/** Reads a field from FormData (or anything shaped like it). */
export type Getter = (key: string) => string | null;
export const fromFormData = (fd: FormData): Getter => (k) => {
  const v = fd.get(k);
  return v === null ? null : typeof v === "string" ? v : null;
};

const STATUS_VALUES = ITEM_STATUSES.map((s) => s.value) as unknown as readonly ItemStatus[];

/* ---------------------------------------------------------------- items */
export function validateItem(get: Getter, o: { isNew: boolean; categories: string[] }) {
  const status = oneOf(get("status") ?? "available", STATUS_VALUES, "Choose a status from the list.");
  const withDate = !status.error && itemStatus(status.value!).hasReturnDate;
  return collect({
    // The ID is only chosen when adding; after that it is fixed, because
    // requests and lending history refer to it.
    id: o.isNew ? itemId(get("id")) : ({ value: "" } as Checked),
    name: text(get("name"), { label: "Item name", required: true, max: 120 }),
    category: oneOf(get("category"), o.categories, "Choose a category."),
    type: text(get("type"), { label: "Type", max: 60 }),
    size: text(get("size"), { label: "Size", required: true, max: 20 }),
    colour: text(get("colour"), { label: "Colour", max: 40 }),
    colour_hex: hexColour(get("colour_hex")),
    fit: text(get("fit"), { label: "Fit", max: 40 }),
    condition: text(get("condition"), { label: "Condition", max: 40 }),
    status,
    available_from: withDate
      ? isoDate(get("available_from"), { label: "Back on" })
      : ({ value: "" } as Checked),
    description: text(get("description"), { label: "Description", max: 1500, multiline: true }),
    measurements: text(get("measurements"), { label: "Measurements", max: 1000, multiline: true }),
    care: text(get("care"), { label: "Care note", max: 500, multiline: true }),
  });
}

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;

/** Checks a chosen photo before it is uploaded. The server re-checks the bytes. */
export function checkPhoto(file: File | null | undefined, o: { required: boolean }): string | null {
  if (!file || file.size === 0) return o.required ? "Add a photo of the item." : null;
  if (file.size > PHOTO_MAX_BYTES) return "That photo is larger than 8 MB. Please pick a smaller one.";
  if (file.type && !PHOTO_TYPES.includes(file.type)) return "Use a JPG, PNG, WebP or HEIC photo.";
  return null;
}

/* ------------------------------------------------------------- settings */
export function validateSettings(get: Getter) {
  const mail = (get("email") ?? "").trim();
  return collect({
    whatsapp: waSetting(get("whatsapp")),
    email: mail ? email(mail) : ({ value: "" } as Checked),
    instagram: instagram(get("instagram")),
    pay_title: text(get("pay_title") || "Bank transfer", { label: "Heading", max: 60 }),
    pay_line1: text(get("pay_line1"), { label: "Line 1", max: 120 }),
    pay_line2: text(get("pay_line2"), { label: "Line 2", max: 120 }),
    pay_line3: text(get("pay_line3"), { label: "Line 3", max: 120 }),
    slots: slotList(get("slots")),
    closed_days: closedDays(get("closed_days")),
  });
}

/* ------------------------------------------------------------- handover */

/**
 * The expected return agreed at handover. It has to be a real date from today
 * (or from the day it was lent, when changing it later) up to a year out.
 */
export function validateReturnDue(get: Getter, o: { from?: string } = {}) {
  const from = o.from ?? siteToday();
  return collect({
    due_date: isoDate(get("due_date"), {
      label: "Return date", required: true, min: from, max: addDays(from, 365),
      minMsg: o.from ? "The return date can't be before the day it was handed over." : "The return date can't be in the past.",
      maxMsg: "The return date should be within a year.",
    }),
    due_time: time24(get("due_time"), { label: "Return time" }),
  });
}

/* -------------------------------------------------------- close request */
export function validateClose(get: Getter) {
  const status = oneOf(get("status"), ["cancelled", "rejected"] as const, "Choose whether it was cancelled or couldn't be fulfilled.");
  const reasons = status.error ? [] : CLOSE_REASONS[status.value!];
  const reason = oneOf(get("reason"), reasons, "Choose a reason.");
  const note = text(get("note"), {
    label: "Note", max: 300,
    required: reason.value === "Other",
  });
  const checks = collect({ status, reason, note });
  if (reason.value === "Other" && checks.errors.note) {
    checks.errors.note = "Add a short note saying what happened.";
  }
  return checks;
}

export type ActionState = { ok?: boolean; error?: string; fields?: FieldErrors };

export const firstError = (errors: FieldErrors) => Object.values(errors)[0];
