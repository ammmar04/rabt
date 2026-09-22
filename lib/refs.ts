/**
 * Which requests belong to this visitor.
 *
 * Rabt has no user accounts, so the browser remembers the reference numbers
 * it created and the dashboard asks the server for just those.
 */
const KEY = "rabt_refs_v1";

export function myRefs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, 50) : [];
  } catch {
    return [];
  }
}

export function rememberRef(ref: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = myRefs();
    if (!all.includes(ref)) all.unshift(ref);
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
  } catch {
    /* storage unavailable — the reference is still shown on screen */
  }
}
