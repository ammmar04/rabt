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

/**
 * SVG is deliberately NOT accepted. An SVG can contain <script>, which would
 * be a stored cross-site-scripting hole the moment it is served from a domain
 * we trust. Photographs do not need it.
 */
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

type Kind = { ext: string; mime: string };

/** Identify the file from its actual bytes — file.type is set by the client. */
function sniff(buf: Buffer): Kind | null {
  const at = (i: number, sig: number[]) => sig.every((b, n) => buf[i + n] === b);
  if (buf.length < 12) return null;
  if (at(0, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", mime: "image/png" };
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50]))
    return { ext: "webp", mime: "image/webp" };
  // ISO-BMFF: ....ftyp{avif|avis|heic}
  if (at(4, [0x66, 0x74, 0x79, 0x70])) {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return { ext: "avif", mime: "image/avif" };
    if (brand.startsWith("hei") || brand.startsWith("mif")) return { ext: "heic", mime: "image/heic" };
  }
  return null;
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
  if (file.size > MAX_BYTES) {
    throw new Error("That image is larger than 8 MB. Please pick a smaller one.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) {
    throw new Error("That file is not a photo we recognise. Please upload a JPG, PNG, WebP or HEIC image.");
  }

  const name = `${slug(prefix)}-${Date.now().toString(36)}.${kind.ext}`;

  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`items/${name}`, bytes, {
      access: "public",
      contentType: kind.mime,
      // never let a caller-supplied name collide with or overwrite another
      addRandomSuffix: true,
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
  await writeFile(join(dir, name), bytes);
  return `/uploads/${name}`;
}
