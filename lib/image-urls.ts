import migrated from "./migrated-images.json";

const objects: Record<string, string> = migrated;

/** Only verified migrated photos move; blank config preserves the original URLs. */
export function imageSrc(url: string | null | undefined): string {
  if (!url) return "";
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.trim().replace(/\/+$/, "");
  const key = Object.hasOwn(objects, url) ? objects[url] : undefined;
  if (!base || !key) return url;
  try {
    const origin = new URL(base);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash) return url;
    return `${base}/${key}`;
  } catch {
    return url;
  }
}
