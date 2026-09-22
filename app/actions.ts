"use server";

import { randomBytes } from "node:crypto";
import {
  createRequest, getItem, getRequestsByRefs, getSettings, holdItem, releaseHold,
} from "@/lib/queries";
import { clientKey, hit } from "@/lib/ratelimit";
import { AMOUNTS, CONTACT_METHODS, collectionDays, itemStatus, type Request } from "@/lib/types";
import { collect, contactFor, oneOf, text, type FieldErrors } from "@/lib/validate";

function makeRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes
  const bytes = randomBytes(10);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `RB-${out}`;
}

export type BorrowResult =
  | { ok: true; ref: string; contact: string }
  | { ok: false; error: string; fields?: FieldErrors };

/**
 * Sends a borrowing request and puts the garment on hold for it, so nobody
 * else can request the same piece while Rabt confirms. One item per request,
 * by design. The request is not a confirmed booking — the team confirms it
 * with the borrower directly.
 */
export async function submitBorrowRequest(input: {
  itemId: string;
  date: string;
  time: string;
  method: string;
  contact: string;
  name: string;
  contribution: string;
}): Promise<BorrowResult> {
  // 10 requests per hour from one address is far above genuine use.
  const limit = hit(await clientKey("borrow"), 10, 60 * 60_000);
  if (!limit.ok) {
    return { ok: false, error: "That is a lot of requests at once. Please try again shortly." };
  }

  const item = await getItem(String(input.itemId ?? ""));
  if (!item || item.archived) return { ok: false, error: "That item is no longer in the wardrobe." };
  if (!itemStatus(item.status).borrowable) {
    return { ok: false, error: "Someone has just requested this piece, so it isn't available any more. Have a look at what else is on the rail." };
  }

  const settings = await getSettings();
  const days = collectionDays(settings.closed_days).filter((d) => !d.closed).map((d) => d.iso);
  const slots = settings.slots.split(",").map((s) => s.trim()).filter(Boolean);

  // The same checks the form runs, repeated here so a request that skips the
  // form cannot put anything unexpected in the team's queue.
  const method = oneOf(input.method, CONTACT_METHODS, "Choose how we should contact you.");
  const { values, errors } = collect({
    date: oneOf(input.date, days, "Pick one of the days offered."),
    time: oneOf(input.time, slots, "Pick one of the times offered."),
    method,
    contact: method.error ? { value: "" } : contactFor(method.value!, input.contact),
    name: text(input.name, { label: "Name", max: 80 }),
    contribution: oneOf(input.contribution || "Not this time", AMOUNTS, "Choose one of the contribution options."),
  });
  if (Object.keys(errors).length) {
    return { ok: false, error: Object.values(errors)[0], fields: errors };
  }

  const ref = makeRef();
  if (!(await holdItem(item.id, ref))) {
    return { ok: false, error: "Someone has just requested this piece, so it isn't available any more. Have a look at what else is on the rail." };
  }

  try {
    await createRequest({
      ref,
      item_id: item.id,
      item_name: item.name,
      // The item *is* the size, so it is recorded from the item, never the form.
      size: item.size,
      requested_date: values.date,
      requested_time: values.time,
      contact_method: values.method,
      contact_value: values.contact,
      person_name: values.name,
      contribution: values.contribution,
    });
  } catch (e) {
    // Don't leave the garment held for a request that was never saved.
    await releaseHold(item.id, ref);
    throw e;
  }

  // No revalidatePath here: it would re-render this very borrow page, which
  // now sees the garment on hold and replaces the confirmation with "not
  // available". Every page that shows availability is rendered per request.
  return { ok: true, ref, contact: values.contact };
}

/**
 * The dashboard asks for exactly the references this browser created.
 * Contact details and the team's notes are not returned — the borrower does
 * not need them echoed back, and the lookup is only protected by knowing the
 * reference.
 */
export async function lookupRequests(refs: string[]): Promise<Request[]> {
  const limit = hit(await clientKey("lookup"), 60, 10 * 60_000);
  if (!limit.ok) return [];

  const clean = (refs || [])
    .filter((r) => typeof r === "string" && /^RB-[A-Z0-9]{4,24}$/.test(r))
    .slice(0, 50);
  if (!clean.length) return [];

  const rows = await getRequestsByRefs(clean);
  return rows.map((r) => ({
    ...r, contact_method: "", contact_value: "", close_reason: "", close_note: "", item_hold_ref: null,
  }));
}
