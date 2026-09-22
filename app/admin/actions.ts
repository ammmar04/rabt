"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveItem, closeRequest, confirmRequest, createItem, findItemById, getCategories,
  getItem, getLending, getRequest, handOver, removePersonalDetails, returnLending,
  savePageContent, saveSettings, setItemStatus, setLendingDue, updateItem,
} from "@/lib/queries";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { clientKey, hit } from "@/lib/ratelimit";
import { saveUpload } from "@/lib/storage";
import type { ItemInput } from "@/lib/queries";
import { isItemStatus, itemStatus, siteDateOf } from "@/lib/types";
import {
  firstError, fromFormData, validateClose, validateItem, validateReturnDue, validateSettings,
  type ActionState,
} from "@/lib/forms";
import { findPage, validatePage } from "@/lib/content";
import { cleanLine } from "@/lib/validate";

const str = (fd: FormData, k: string) => cleanLine(fd.get(k));

/** Every page that shows items, requests or content reads fresh after a change. */
const refreshSite = () => revalidatePath("/", "layout");

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
  if (!password) return { error: "Enter the password." };
  if (password.length > 200) return { error: "That password is not right." };
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

/** Creates or updates one garment, including its photo. */
export async function saveItem(_prev: unknown, fd: FormData): Promise<ActionState> {
  await requireAdmin();

  const editingId = str(fd, "editing");
  const existing = editingId ? await getItem(editingId) : null;
  if (editingId && !existing) return { error: "That item no longer exists." };

  const categories = (await getCategories()).map((c) => c.slug);
  const { values, errors } = validateItem(fromFormData(fd), { isNew: !existing, categories });

  // The ID is the team's own numbering, so a clash is caught here rather
  // than silently renumbered.
  if (!existing && values.id) {
    const clash = await findItemById(values.id);
    if (clash) {
      errors.id = `${clash.id} is already used by ${clash.name}${clash.archived ? " (a removed item — its history still uses the ID)" : ""}. Choose another ID.`;
    }
  }
  if (Object.keys(errors).length) return { error: firstError(errors), fields: errors };

  let imageUrl = existing?.image_url ?? "";
  let detailUrl = existing?.detail_url ?? "";

  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      imageUrl = await saveUpload(photo, values.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "That photo could not be saved.";
      return { error: msg, fields: { photo: msg } };
    }
  }
  const second = fd.get("photo2");
  if (second instanceof File && second.size > 0) {
    try {
      detailUrl = await saveUpload(second, `${values.name}-detail`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "That photo could not be saved.";
      return { error: msg, fields: { photo2: msg } };
    }
  }
  if (!imageUrl) return { error: "Add a photo of the item.", fields: { photo: "Add a photo of the item." } };

  const input: Omit<ItemInput, "id"> = {
    name: values.name,
    category: values.category,
    type: values.type,
    colour: values.colour,
    colour_hex: values.colour_hex,
    size: values.size,
    fit: values.fit,
    condition: values.condition,
    status: values.status,
    available_from: values.available_from,
    description: values.description,
    measurements: values.measurements,
    care: values.care,
    image_url: imageUrl,
    detail_url: detailUrl,
  };

  if (existing) {
    await updateItem(existing.id, { ...input, id: existing.id });
  } else {
    try {
      await createItem({ ...input, id: values.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (!/duplicate key|unique constraint/i.test(msg)) throw e;
      // Someone else saved the same ID a moment ago.
      const taken = `${values.id} was just taken. Choose another ID.`;
      return { error: taken, fields: { id: taken } };
    }
  }

  refreshSite();
  redirect("/admin/items");
}

export async function removeItem(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  if (id) await archiveItem(id);
  refreshSite();
  redirect("/admin/items");
}

/** Changes a garment's physical status by hand. Requests and history are untouched. */
export async function quickStatus(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!id || !isItemStatus(status)) return;
  const item = await getItem(id);
  if (!item) return;
  // A due-back date only means something while it is off the rail.
  const keepDate = itemStatus(status).hasReturnDate ? item.available_from ?? "" : "";
  await setItemStatus(id, status, keepDate);
  refreshSite();
}

/* -------------------------------------------------------------- requests */

export async function confirmRequestAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const ref = str(fd, "ref");
  if (ref) await confirmRequest(ref);
  refreshSite();
}

/** Cancels a request, or records that it couldn't be fulfilled, with the reason. */
export async function closeRequestAction(_prev: unknown, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const ref = str(fd, "ref");
  const { values, errors } = validateClose(fromFormData(fd));
  if (Object.keys(errors).length) return { error: firstError(errors), fields: errors };

  const done = await closeRequest(ref, values.status, values.reason, values.note);
  if (!done) return { error: "That request has already been handed over or closed. Refresh to see where it is now." };
  refreshSite();
  return { ok: true };
}

/**
 * The handover: the borrower collects, the team records the expected return,
 * and a lending record opens.
 */
export async function handOverAction(_prev: unknown, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const ref = str(fd, "ref");
  const request = await getRequest(ref);
  if (!request) return { error: "That request no longer exists." };

  const { values, errors } = validateReturnDue(fromFormData(fd));
  if (Object.keys(errors).length) return { error: firstError(errors), fields: errors };

  const done = await handOver(ref, values.due_date, values.due_time);
  if (!done) return { error: "That request has already been handed over or closed. Refresh to see where it is now." };
  refreshSite();
  return { ok: true };
}

/** Changes the expected return on something already out. */
export async function saveLendingDue(_prev: unknown, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const lending = await getLending(Number(str(fd, "lending")));
  if (!lending) return { error: "That borrowing no longer exists." };
  if (lending.returned_at) return { error: "That piece has already been returned." };

  const { values, errors } = validateReturnDue(fromFormData(fd), {
    from: siteDateOf(lending.lent_at) ?? undefined,
  });
  if (Object.keys(errors).length) return { error: firstError(errors), fields: errors };

  await setLendingDue(lending.id, values.due_date, values.due_time);
  refreshSite();
  return { ok: true };
}

/** Records a return. The garment goes to the chosen status — usually back on the rail. */
export async function markReturned(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(str(fd, "lending"));
  const next = str(fd, "next") || "available";
  if (!Number.isInteger(id) || !isItemStatus(next)) return;
  // Straight back out to someone else only happens through a new request.
  if (next === "borrowed" || next === "on_hold") return;
  await returnLending(id, next);
  refreshSite();
}

/** Clears a borrower's name and contact detail from the records, keeping the history. */
export async function removeDetailsAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const ref = str(fd, "ref");
  if (ref) await removePersonalDetails(ref);
  revalidatePath("/admin", "layout");
}

/* -------------------------------------------------------------- settings */
export async function updateSettings(_prev: unknown, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const { values, errors } = validateSettings(fromFormData(fd));
  if (Object.keys(errors).length) return { error: firstError(errors), fields: errors };
  await saveSettings(values);
  refreshSite();
  return { ok: true };
}

/* --------------------------------------------------------- page content */
export async function updateContent(_prev: unknown, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const page = findPage(str(fd, "page"));
  if (!page) return { error: "That page can't be edited." };

  const { values, errors } = validatePage(page, (k) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : null;
  });
  if (Object.keys(errors).length) return { error: firstError(errors), fields: errors };

  await savePageContent(page.page, values);
  refreshSite();
  return { ok: true };
}
