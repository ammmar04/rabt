/** Keep two photos comfortably below Vercel's 4.5 MB request limit. */
export async function prepareUpload(file: File): Promise<File> {
  if (file.size > 8 * 1024 * 1024) throw new Error("That photo is larger than 8 MB. Please pick a smaller one.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("This browser could not read that photo. Please try a JPG, PNG, WebP or AVIF image."); }
  try {
    if (bitmap.width * bitmap.height > 40_000_000) throw new Error("That photo has very large dimensions. Please choose a smaller one.");
    const canvas = document.createElement("canvas");
    for (const edge of [1600, 1200, 900]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Photo preparation is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.82));
      if (blob && blob.size <= 1024 * 1024 && ["image/webp", "image/png"].includes(blob.type)) {
        const extension = blob.type === "image/webp" ? "webp" : "png";
        return new File([blob], `photo.${extension}`, { type: blob.type });
      }
    }
    throw new Error("That photo could not be reduced enough. Please choose a smaller photo.");
  } finally { bitmap.close(); }
}
