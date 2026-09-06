"use server";

import { randomBytes } from "node:crypto";
import { createRequest, getItem, getRequestsByRefs } from "@/lib/queries";
import type { Request } from "@/lib/types";

function makeRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes
  const bytes = randomBytes(9);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `RB-${out}`;
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
  const item = await getItem(input.itemId);
  if (!item || item.archived) return { ok: false, error: "That item is no longer in the wardrobe." };
  if (item.status !== "available") return { ok: false, error: "That item has just been borrowed by someone else." };

  const size = input.size.trim();
  const date = input.date.trim();
  const time = input.time.trim();
  const method = input.method.trim();
  const contact = input.contact.trim();

  if (!size) return { ok: false, error: "Please choose a size." };
  if (!date || !time) return { ok: false, error: "Please pick a day and a time." };
  if (!method) return { ok: false, error: "Please tell us how to reach you." };
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

/** The dashboard asks for exactly the references this browser created. */
export async function lookupRequests(refs: string[]): Promise<Request[]> {
  const clean = (refs || [])
    .filter((r) => typeof r === "string" && /^RB-[A-Z0-9]{4,20}$/.test(r))
    .slice(0, 50);
  if (!clean.length) return [];
  return getRequestsByRefs(clean);
}
