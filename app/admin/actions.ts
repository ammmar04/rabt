"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveItem, createItem, getItem, getRequest, nextItemId,
  saveContent, saveSettings, setExpectedReturn, setItemStatus,
  setRequestStatus, updateItem,
} from "@/lib/queries";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { clientKey, hit } from "@/lib/ratelimit";
import { saveUpload } from "@/lib/storage";
import type { ItemInput } from "@/lib/queries";
import type { PageContent, Settings, Status } from "@/lib/types";
import { STATUS_BORROWED, STATUS_FLOW, STATUS_RETURNED } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/* ------------------------------------------------------------ sign in/out */
export async function signIn(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  // Throttle before doing any work: 8 attempts per 10 minutes per address.
  const key = await clientKey("signin");
  const limit = hit(key, 8, 10 * 60_000);
  if (!limit.ok) {
    return {
      error: `Too many attempts. Try again in about ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`,
    };
  }

  const password = String(fd.get("password") ?? "");
  // small constant delay to blunt fast guessing
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(password)) return { error: "That password is not right." };
  await startSession();
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/admin");
}

/* ---------------------------------------------------------------- items */
function itemFromForm(fd: FormData, id: string, imageUrl: string, detailUrl: string): ItemInput {
  const status = (str(fd, "status") || "available") as Status;
  return {
    id,
    name: str(fd, "name"),
    category: str(fd, "category"),
    type: str(fd, "type"),
    colour: str(fd, "colour"),
    colour_hex: str(fd, "colour_hex") || "#8A8A82",
    size: str(fd, "size"),
    fit: str(fd, "fit"),
    condition: str(fd, "condition"),
    status,
    // The form offers "Back on" for anything that is not available, so a
    // borrowed item keeps its due-back date instead of losing it on save.
    available_from: status === "available" ? "" : str(fd, "available_from"),
    description: str(fd, "description"),
    measurements: str(fd, "measurements"),
    care: str(fd, "care"),
    image_url: imageUrl,
    detail_url: detailUrl,
  };
}

export type SaveResult = { error?: string };

/** Creates or updates one item, including its photo. */
export async function saveItem(_prev: unknown, fd: FormData): Promise<SaveResult> {
  await requireAdmin();

  const editingId = str(fd, "id");
  const name = str(fd, "name");
  const category = str(fd, "category");
  if (!name) return { error: "Give the item a name." };
  if (!category) return { error: "Choose a category." };
  if (!str(fd, "size")) return { error: "Give the item a size." };

  const existing = editingId ? await getItem(editingId) : null;
  if (editingId && !existing) return { error: "That item no longer exists." };

  let imageUrl = existing?.image_url ?? "";
  let detailUrl = existing?.detail_url ?? "";

  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      imageUrl = await saveUpload(photo, name);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "That photo could not be saved." };
    }
  }
  const second = fd.get("photo2");
  if (second instanceof File && second.size > 0) {
    try {
      detailUrl = await saveUpload(second, `${name}-detail`);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "That photo could not be saved." };
    }
  }

  if (!imageUrl) return { error: "Add a photo of the item." };

  if (existing) {
    await updateItem(existing.id, itemFromForm(fd, existing.id, imageUrl, detailUrl));
  } else {
    // Two people adding at once could pick the same id, so retry on collision
    // rather than showing them a database error.
    let saved = false;
    for (let attempt = 0; attempt < 5 && !saved; attempt++) {
      const id = await nextItemId(category);
      try {
        await createItem(itemFromForm(fd, id, imageUrl, detailUrl));
        saved = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (!/duplicate key|unique constraint/i.test(msg)) throw e;
      }
    }
    if (!saved) return { error: "Could not allocate an item number. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/admin/items");
}

export async function removeItem(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  if (id) await archiveItem(id);
  revalidatePath("/", "layout");
  redirect("/admin/items");
}

export async function quickStatus(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (id && status) await setItemStatus(id, status, str(fd, "available_from"));
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------- requests */

export async function updateRequest(fd: FormData): Promise<void> {
  await requireAdmin();
  const ref = str(fd, "ref");
  const status = Number(str(fd, "status"));
  if (!ref || !Number.isFinite(status)) return;
  if (status < 0 || status >= STATUS_FLOW.length) return;

  const request = await getRequest(ref);
  await setRequestStatus(ref, status);

  if (request?.item_id) {
    const item = await getItem(request.item_id);
    if (status >= STATUS_RETURNED) {
      await setItemStatus(request.item_id, "available", "");
    } else if (status >= STATUS_BORROWED) {
      await setItemStatus(request.item_id, "borrowed", request.return_date ?? "");
    } else if (item?.status === "borrowed") {
      // Moved back before handover: the garment is not out after all.
      // "Available soon" is left alone — that is someone marking it for
      // cleaning or repair, which has nothing to do with this request.
      await setItemStatus(request.item_id, "available", "");
    }
  }

  revalidatePath("/", "layout");
}

/**
 * The expected return, entered by the team at handover rather than asked of
 * the borrower up front. Also carried onto the item so its page can say when
 * it is due back.
 */
export async function saveExpectedReturn(fd: FormData): Promise<void> {
  await requireAdmin();
  const ref = str(fd, "ref");
  if (!ref) return;

  const date = str(fd, "return_date");
  const time = str(fd, "return_time");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  if (time && !/^\d{1,2}:\d{2}$/.test(time)) return;

  const request = await getRequest(ref);
  if (!request) return;

  await setExpectedReturn(ref, date, time);

  // Setting a return date is the handover, so a request still sitting earlier
  // in the flow moves on. Saving with the date blank — clearing a mistake, or
  // a garment already out — must not mark anything as handed over on its own.
  const handedOver = date !== "" || request.status >= STATUS_BORROWED;
  const status = handedOver ? Math.max(request.status, STATUS_BORROWED) : request.status;

  if (status !== request.status) await setRequestStatus(ref, status);
  if (request.item_id && handedOver && status < STATUS_RETURNED) {
    await setItemStatus(request.item_id, "borrowed", date);
  }

  revalidatePath("/", "layout");
}

/** Marks a borrowing returned and puts the item back on the rail. */
export async function markReturned(fd: FormData): Promise<void> {
  await requireAdmin();
  const ref = str(fd, "ref");
  if (!ref) return;
  const request = await getRequest(ref);
  if (!request) return;

  await setRequestStatus(ref, STATUS_RETURNED);
  if (request.item_id) await setItemStatus(request.item_id, "available", "");

  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------- settings */
export async function updateSettings(_prev: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  const s: Settings = {
    whatsapp: str(fd, "whatsapp"),
    email: str(fd, "email"),
    instagram: str(fd, "instagram"),
    pay_title: str(fd, "pay_title") || "Bank transfer",
    pay_line1: str(fd, "pay_line1"),
    pay_line2: str(fd, "pay_line2"),
    pay_line3: str(fd, "pay_line3"),
    slots: str(fd, "slots") || "10:00,11:00,12:00,14:00,15:00,16:00,17:00",
    closed_days: str(fd, "closed_days"),
  };
  await saveSettings(s);
  revalidatePath("/", "layout");
  return { ok: true };
}

/* --------------------------------------------------------- page content */
export async function updateContent(
  _prev: unknown,
  fd: FormData
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  const c: PageContent = {
    cat_eyebrow: str(fd, "cat_eyebrow").slice(0, 60),
    cat_heading: str(fd, "cat_heading").slice(0, 120),
    cat_intro: str(fd, "cat_intro").slice(0, 400),
    cat_empty: str(fd, "cat_empty").slice(0, 200),
  };
  if (!c.cat_heading) return { error: "The catalogue needs a heading." };
  await saveContent(c);
  revalidatePath("/", "layout");
  return { ok: true };
}
