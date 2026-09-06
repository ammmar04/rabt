"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveItem, createItem, getItem, nextItemId,
  saveSettings, setItemStatus, setRequestStatus, updateItem,
} from "@/lib/queries";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { clientKey, hit } from "@/lib/ratelimit";
import { saveUpload } from "@/lib/storage";
import type { ItemInput } from "@/lib/queries";
import type { Settings, Status } from "@/lib/types";

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
    sizes: fd.getAll("sizes").map((s) => String(s)).join(","),
    fit: str(fd, "fit"),
    condition: str(fd, "condition"),
    status,
    available_from: status === "soon" ? str(fd, "available_from") : "",
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
  if (!fd.getAll("sizes").length) return { error: "Pick at least one size." };

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
  if (ref && Number.isFinite(status)) await setRequestStatus(ref, status);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
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
