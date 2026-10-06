import sharp from "sharp";

/** Decode real raster bytes, orient correctly, strip metadata, and bound dimensions. */
export async function optimizePhoto(bytes: Buffer): Promise<Buffer> {
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp", "avif", "heif"].includes(metadata.format || "") || (metadata.pages || 1) > 1) {
      throw new Error("Unsupported image");
    }
    return await image.rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 }).toBuffer();
  } catch {
    throw new Error("That photo could not be read. Please try a JPG, PNG, WebP or AVIF image.");
  }
}
