import "server-only";
import { AppError, fromDatabaseError } from "./errors";
import type { DbClient } from "./supabase";

/**
 * Reads every row of a set-returning RPC. PostgREST caps responses (1,000
 * rows by default), so results are paged with a stable ORDER BY.
 */
export async function rpcAll<T>(
  supabase: DbClient,
  fn: string,
  args: Record<string, unknown>,
  order: string[],
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase.rpc(fn, args);
    for (const col of order) query = query.order(col, { ascending: true });
    const res = await query.range(from, from + pageSize - 1);
    if (res.error) throw fromDatabaseError(res.error);
    const rows = (res.data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    if (from >= 500_000) throw new AppError("internal", "The result is too large; narrow the date range.");
  }
  return out;
}

export async function rpcOne<T>(supabase: DbClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await supabase.rpc(fn, args);
  if (res.error) throw fromDatabaseError(res.error);
  return res.data as T;
}
