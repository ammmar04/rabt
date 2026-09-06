"use server";

import { randomBytes } from "node:crypto";
import { createRequest, getItem, getRequestsByRefs, getSettings } from "@/lib/queries";
import { clientKey, hit } from "@/lib/ratelimit";
import { parseSizes, type Request } from "@/lib/types";

function makeRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes
  const bytes = randomBytes(10);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `RB-${out}`;
}

const METHODS = new Set(["WhatsApp", "Email", "Secondary account"]);

/** The seven days the borrow form offers, as YYYY-MM-DD. */
function allowedDates(closedDays: Set<number>): Set<string> {
  const out = new Set<string>();
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 7; i++) {
    if (!closedDays.has(d.getDay())) {
      out.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export type BorrowResult = { ok: true; ref: string } | { ok: false; error: string };

/** Places a borrowing request. One item per request, by design. */
export async function submitBorrowRequest(input: {
  itemId: string;
  size: string;
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

  const item = await getItem(input.itemId);
  if (!item || item.archived) return { ok: false, error: "That item is no longer in the wardrobe." };
  if (item.status !== "available") {
    return { ok: false, error: "That item has just been borrowed by someone else." };
  }

  const settings = await getSettings();
  const size = input.size.trim();
  const date = input.date.trim();
  const time = input.time.trim();
  const method = input.method.trim();
  const contact = input.contact.trim();

  // Validate everything against what the form actually offers, so a crafted
  // request cannot put nonsense into the team's queue.
  if (!parseSizes(item.sizes).includes(size)) {
    return { ok: false, error: "Please choose one of the sizes listed." };
  }
  const closed = new Set(
    settings.closed_days.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
  );
  if (!allowedDates(closed).has(date)) {
    return { ok: false, error: "Please pick one of the days offered." };
  }
  const slots = settings.slots.split(",").map((s) => s.trim()).filter(Boolean);
  if (!slots.includes(time)) return { ok: false, error: "Please pick one of the times offered." };
  if (!METHODS.has(method)) return { ok: false, error: "Please choose how we should contact you." };
  if (contact.length < 3) return { ok: false, error: "That contact detail looks too short." };
  if (contact.length > 200) return { ok: false, error: "That contact detail looks too long." };

  const ref = makeRef();
  await createRequest({
    ref,
    item_id: item.id,
    item_name: item.name,
    size,
    requested_date: date,
    requested_time: time,
    contact_method: method,
    contact_value: contact,
    person_name: input.name.trim().slice(0, 80),
    contribution: input.contribution.trim().slice(0, 40),
    status: 0,
  });

  return { ok: true, ref };
}

/**
 * The dashboard asks for exactly the references this browser created.
 * Contact details are deliberately not returned — the borrower does not need
 * them echoed back, and it keeps personal data out of a lookup that is only
 * protected by knowing the reference.
 */
export async function lookupRequests(refs: string[]): Promise<Request[]> {
  const limit = hit(await clientKey("lookup"), 60, 10 * 60_000);
  if (!limit.ok) return [];

  const clean = (refs || [])
    .filter((r) => typeof r === "string" && /^RB-[A-Z0-9]{4,24}$/.test(r))
    .slice(0, 50);
  if (!clean.length) return [];

  const rows = await getRequestsByRefs(clean);
  return rows.map((r) => ({ ...r, contact_method: "", contact_value: "" }));
}
