// Migration runner. Numbered .sql files, applied once, in order, each inside a
// transaction, guarded by an advisory lock so two booting containers can't race.
// No framework: the whole thing is 60 lines and has no upgrade path to break.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./index.ts";
import { logger } from "../logger.ts";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");
const LOCK_KEY = 8_246_113; // arbitrary, stable

export async function migrate(): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);
    await client.query(`
      create table if not exists schema_migrations (
        name        text primary key,
        applied_at  timestamptz not null default now()
      )`);

    const done = new Set(
      (await client.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name)
    );

    const files = (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      logger.info({ file }, "applying migration");
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        applied.push(file);
      } catch (err) {
        await client.query("rollback").catch(() => {});
        throw new Error(`migration ${file} failed: ${(err as Error).message}`, { cause: err });
      }
    }
    if (applied.length === 0) logger.info("database up to date");
    return applied;
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    client.release();
  }
}

// `npm run migrate`
if (import.meta.main) {
  try {
    const applied = await migrate();
    logger.info({ applied }, "migrations complete");
    await pool.end();
  } catch (err) {
    logger.error({ err }, "migration failed");
    process.exit(1);
  }
}
