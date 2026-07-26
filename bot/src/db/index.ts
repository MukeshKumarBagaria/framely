// Postgres access. Raw SQL on purpose: the schema in Guide §6 is ❄ frozen and
// hand-written SQL is the most honest way to keep it that way. Everything goes
// through `query` / `tx` so the pool is never leaked by a caller.
import pg from "pg";
import { config } from "../config.ts";
import { logger } from "../logger.ts";

const { Pool } = pg;

// `bigint` (int8) arrives as a string by default so precision is never lost.
// Our int8 columns are ids and byte counts — both safely inside Number.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
// numeric → number (ocr_confidence only; never money — amounts are paise ints).
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: "giftmahal-bot",
});

pool.on("error", (err) => {
  // An idle client blew up (network, failover). The pool replaces it; we just
  // want to know it happened.
  logger.error({ err }, "postgres idle client error");
});

export type Row = Record<string, unknown>;

export async function query<T extends Row = Row>(
  text: string,
  params: readonly unknown[] = []
): Promise<pg.QueryResult<T>> {
  const started = process.hrtime.bigint();
  try {
    return (await pool.query(text, params as unknown[])) as pg.QueryResult<T>;
  } finally {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    if (ms > 500) logger.warn({ ms, sql: text.slice(0, 120) }, "slow query");
  }
}

/** First row or null — the shape 90% of our reads want. */
export async function queryOne<T extends Row = Row>(
  text: string,
  params: readonly unknown[] = []
): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows[0] ?? null;
}

/** Run a function inside a transaction; rolls back on throw. */
export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
