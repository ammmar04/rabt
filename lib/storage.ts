/**
 * Image storage.
 *
 * Production : Cloudflare R2 when explicitly selected; Vercel Blob for rollback
 * Local dev  : writes into public/uploads so the portal works with no setup
 */
import "server-only";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { optimizePhoto } from "./optimize-photo";

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

function r2Configuration() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.trim().replace(/\/+$/, "");
  if (!accountId || !/^[a-f0-9]{32}$/.test(accountId) || !accessKeyId || !secretAccessKey || !bucket || !publicBase) return null;
  try {
    const url = new URL(publicBase);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
  } catch { return null; }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

export function imageStorageConfigured(): boolean {
  if (process.env.IMAGE_STORAGE_PROVIDER === "r2") return Boolean(r2Configuration());
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

  const name = `${slug(prefix)}-${randomUUID()}.webp`;
  const photo = await optimizePhoto(bytes);

  if (process.env.IMAGE_STORAGE_PROVIDER === "r2") {
    const config = r2Configuration();
    if (!config) throw new Error("Photo storage is not connected. Please contact the site administrator.");
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      maxAttempts: 3,
    });
    try {
      await client.send(new PutObjectCommand({
        Bucket: config.bucket, Key: `items/${name}`, Body: photo,
        ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable",
      }));
    } catch {
      throw new Error("The photo could not be saved. Please try again in a moment.");
    } finally { client.destroy(); }
    return `${config.publicBase}/items/${name}`;
  }

  if (imageStorageConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`items/${name}`, photo, {
      access: "public",
      contentType: "image/webp",
      // never let a caller-supplied name collide with or overwrite another
      addRandomSuffix: true,
    });
    return blob.url;
  }

  if (isProd) {
    throw new Error(
      "Photo storage is not connected. Please contact the site administrator."
    );
  }

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), photo);
  return `/uploads/${name}`;
}
