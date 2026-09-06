/**
 * Admin authentication.
 *
 * One shared password for the small team that runs the wardrobe, held in the
 * ADMIN_PASSWORD environment variable and never in the repo. A signed,
 * httpOnly cookie carries the session — no third-party service required.
 *
 * Fails closed: with no ADMIN_PASSWORD set in production, the admin area is
 * locked rather than open. The convenience password below only ever applies
 * when running locally.
 */
import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const COOKIE = "rabt_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours
const DEV_PASSWORD = "rabt-dev";

const isProd = process.env.NODE_ENV === "production";

export function adminPassword(): string | null {
  const configured = process.env.ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  return isProd ? null : DEV_PASSWORD;
}

/** True when a real password has been configured (or we're safely in dev). */
export function authConfigured(): boolean {
  return adminPassword() !== null;
}

export function usingDevPassword(): boolean {
  return !process.env.ADMIN_PASSWORD?.trim() && !isProd;
}

function secret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    // Derive from the password so sessions invalidate if the password changes.
    "rabt:" + (adminPassword() ?? randomBytes(16).toString("hex"))
  );
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  return safeEqual(input, expected);
}

export async function startSession(): Promise<void> {
  const expires = Date.now() + MAX_AGE * 1000;
  const payload = String(expires);
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isSignedIn(): Promise<boolean> {
  if (!authConfigured()) return false;
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot === -1) return false;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!safeEqual(sig, sign(payload))) return false;
  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

/** Throws unless the caller is an authenticated admin. Use in every mutation. */
export async function requireAdmin(): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not authorised");
}
