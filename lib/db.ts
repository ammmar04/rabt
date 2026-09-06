/**
 * Database adapter.
 *
 * Production  : Neon Postgres  (set DATABASE_URL)
 * Local dev   : PGlite — real Postgres running in-process, stored in ./.data
 *
 * Both speak the same SQL, so nothing above this file needs to know which is
 * in use. Set DATABASE_URL and you are on Neon; leave it unset and the app
 * runs locally with no provisioning at all.
 */
import "server-only";

type Params = unknown[];
type Runner = {
  query: <T>(text: string, params: Params) => Promise<T[]>;
  exec: (script: string) => Promise<void>;
  kind: "neon" | "pglite";
};

declare global {
  // eslint-disable-next-line no-var
  var __rabtDb: Promise<Runner> | undefined;
}

function splitStatements(script: string): string[] {
  return script
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^--/.test(s));
}

async function makeNeon(url: string): Promise<Runner> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  return {
    kind: "neon",
    query: async <T>(text: string, params: Params) =>
      (await sql.query(text, params as never[])) as T[],
    exec: async (script) => {
      for (const stmt of splitStatements(script)) {
        await sql.query(stmt, []);
      }
    },
  };
}

async function makePglite(): Promise<Runner> {
  // Computed specifier keeps the bundler from trying to resolve a dev-only dep.
  const spec = "@electric-sql/pglite";
  const { PGlite } = (await import(/* webpackIgnore: true */ spec)) as typeof import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || "./.data/rabt";
  // PGlite creates the leaf directory but not its parents.
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.waitReady;
  return {
    kind: "pglite",
    query: async <T>(text: string, params: Params) =>
      (await db.query<T>(text, params as never[])).rows,
    exec: async (script) => {
      await db.exec(script);
    },
  };
}

function connect(): Promise<Runner> {
  const url = process.env.DATABASE_URL;
  if (url && url.trim()) return makeNeon(url.trim());
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. Add a Neon Postgres database to this project " +
        "(Vercel → Storage → Neon) so the site has somewhere to read items from."
    );
  }
  return makePglite();
}

function db(): Promise<Runner> {
  if (!globalThis.__rabtDb) {
    // Don't cache a failed connection — otherwise one bad start poisons the
    // process and every later request fails with the same stale error.
    globalThis.__rabtDb = connect().catch((e) => {
      globalThis.__rabtDb = undefined;
      throw e;
    });
  }
  return globalThis.__rabtDb;
}

/** Run a parameterised query and get rows back. */
export async function q<T = Record<string, unknown>>(
  text: string,
  params: Params = []
): Promise<T[]> {
  return (await db()).query<T>(text, params);
}

/** Run a multi-statement script (schema creation). */
export async function exec(script: string): Promise<void> {
  return (await db()).exec(script);
}

export async function dbKind(): Promise<"neon" | "pglite"> {
  return (await db()).kind;
}
