/**
 * Image storage.
 *
 * Production : Vercel Blob (set BLOB_READ_WRITE_TOKEN — added automatically
 *              when you create a Blob store on the project)
 * Local dev  : writes into public/uploads so the portal works with no setup
 */
import "server-only";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const isProd = process.env.NODE_ENV === "production";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function extFor(type: string, name: string): string {
  const fromName = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
           "image/avif": "avif", "image/svg+xml": "svg" }[type] ?? "jpg";
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "photo";
}

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Validates and stores one uploaded image, returning a URL to render. */
export async function saveUpload(file: File, prefix = "item"): Promise<string> {
  if (!file || file.size === 0) throw new Error("No file was uploaded.");
  if (file.size > MAX_BYTES) throw new Error("That image is larger than 8 MB. Please pick a smaller one.");
  if (!ALLOWED.has(file.type)) {
    throw new Error("Please upload a JPG, PNG, WebP or SVG image.");
  }

  const name = `${slug(prefix)}-${Date.now().toString(36)}.${extFor(file.type, file.name)}`;

  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`items/${name}`, file, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  if (isProd) {
    throw new Error(
      "Image storage is not configured. Add a Blob store to this project " +
        "(Vercel → Storage → Blob) so photos have somewhere to live."
    );
  }

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}
