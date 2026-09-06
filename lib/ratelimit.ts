import "server-only";
import { headers } from "next/headers";

/**
 * Small in-memory rate limiter.
 *
 * Serverless instances are ephemeral and there can be several at once, so this
 * is a speed bump rather than a hard guarantee — enough to stop password
 * guessing and request floods from a single source. The real protection for
 * the admin portal is a long, random ADMIN_PASSWORD; this buys time on top.
 *
 * If the wardrobe ever needs a hard guarantee across instances, swap the Map
 * for Upstash Redis — the call sites do not change.
 */
type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __rabtBuckets: Map<string, Bucket> | undefined;
}

function buckets(): Map<string, Bucket> {
  if (!globalThis.__rabtBuckets) globalThis.__rabtBuckets = new Map();
  return globalThis.__rabtBuckets;
}

export type LimitResult = { ok: boolean; retryAfterSec: number };

export function hit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  const map = buckets();

  // opportunistic cleanup so the map cannot grow without bound
  if (map.size > 5000) {
    for (const [k, v] of map) if (v.resetAt < now) map.delete(k);
  }

  const b = map.get(key);
  if (!b || b.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort client identity for rate limiting. */
export async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${ip}`;
}
