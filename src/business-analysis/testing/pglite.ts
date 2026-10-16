// Test harness: a real PostgreSQL (PGlite, compiled to WASM) with a stub of
// the Supabase pieces the migration relies on, then the migration itself.
// Queries run as the `authenticated` role with a JWT subject, exactly like
// PostgREST does, so Row Level Security is genuinely exercised.
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite({
    parsers: {
      1700: (v: string) => v, // NUMERIC → exact decimal string
      20: (v: string) => Number(v), // BIGINT counts → number
    },
  });
  await db.exec(readFileSync(path.join(__dirname, "supabase-stub.sql"), "utf8"));
  await db.exec(readFileSync(path.join(root, "supabase/migrations/20261016000000_business_analysis.sql"), "utf8"));
  return db;
}

export type Tx = Transaction;

/** Runs fn as an authenticated user (or anon when userId is null), like a PostgREST request. */
export async function asUser<T>(db: PGlite, userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${userId ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    return fn(tx);
  });
}

export async function createUser(db: PGlite, id: string, email: string) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
}

/** Calls an RPC as a user and returns its single scalar result. */
export async function rpc<T = unknown>(db: PGlite, userId: string, fn: string, args: unknown[]): Promise<T> {
  return asUser(db, userId, async (tx) => {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
    const res = await tx.query<{ r: T }>(`select business_analysis.${fn}(${placeholders}) as r`, args);
    return res.rows[0]?.r as T;
  });
}

/** Calls a set-returning RPC as a user. */
export async function rpcRows<T>(db: PGlite, userId: string, fn: string, args: unknown[]): Promise<T[]> {
  return asUser(db, userId, async (tx) => {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
    const res = await tx.query<T>(`select * from business_analysis.${fn}(${placeholders})`, args);
    return res.rows;
  });
}
