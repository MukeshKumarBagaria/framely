// Guide §7 — storage layout, keyed by phone number because the Meesho order id
// arrives last.
//
//   /data/customers/919876543210/2026-07-26_a3f9/
//     raw/ screenshots/ rendered/ final/ meta.json
//
// meta.json is a human-readable mirror of the DB row: when a print goes wrong
// at 11pm, the folder alone has to tell you what it was supposed to be.
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.ts";
import { logger } from "../logger.ts";

export const SUBFOLDERS = ["raw", "screenshots", "rendered", "final"] as const;

/** `2026-07-26_a3f9` — date for humans, id fragment for uniqueness. */
export function sessionFolderName(sessionId: string, createdAt: Date = new Date()): string {
  const date = createdAt.toISOString().slice(0, 10);
  return `${date}_${sessionId.slice(0, 4)}`;
}

export function sessionFolderPath(phoneE164: string, sessionId: string, createdAt?: Date): string {
  return path.join(config.STORAGE_ROOT, phoneE164, sessionFolderName(sessionId, createdAt));
}

/**
 * Join a session-relative path onto its folder, refusing anything that escapes.
 * Every relative path in this codebase is machine-generated, but a customer
 * filename reaching `saveFile` one day should not be able to write to /etc.
 */
export function resolveInFolder(folderPath: string, relative: string): string {
  const abs = path.resolve(folderPath, relative);
  const root = path.resolve(folderPath);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error(`path "${relative}" escapes its session folder`);
  }
  return abs;
}

export async function ensureSessionFolder(folderPath: string): Promise<void> {
  await Promise.all(
    SUBFOLDERS.map((sub) => fs.mkdir(path.join(folderPath, sub), { recursive: true }))
  );
}

export async function saveFile(folderPath: string, relative: string, data: Buffer): Promise<string> {
  const abs = resolveInFolder(folderPath, relative);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
  return abs;
}

export async function readFile(folderPath: string, relative: string): Promise<Buffer> {
  return fs.readFile(resolveInFolder(folderPath, relative));
}

export async function fileExists(folderPath: string, relative: string): Promise<boolean> {
  try {
    await fs.access(resolveInFolder(folderPath, relative));
    return true;
  } catch {
    return false;
  }
}

export async function removeFile(folderPath: string, relative: string): Promise<void> {
  await fs.rm(resolveInFolder(folderPath, relative), { force: true });
}

export async function listFiles(folderPath: string, sub: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(resolveInFolder(folderPath, sub));
    return entries.sort();
  } catch {
    return [];
  }
}

// ------------------------------------------------------------- meta.json

export type TimelineEvent = { at: string; event: string; [k: string]: unknown };

export type SessionMeta = {
  session_id: string;
  phone: string;
  customer_name?: string | null;
  lang?: string | null;
  occasion?: string | null;
  design_id?: string | null;
  photos?: string[];
  fields?: Record<string, unknown>;
  revisions?: number;
  approved_render?: string | null;
  final_file?: string | null;
  source?: string | null;
  ad_id?: string | null;
  meesho_order_id?: string | null;
  timeline: TimelineEvent[];
};

const META_FILE = "meta.json";

export async function readMeta(folderPath: string): Promise<SessionMeta | null> {
  try {
    const raw = await fs.readFile(path.join(folderPath, META_FILE), "utf8");
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null;
  }
}

/**
 * Merge-and-write. The timeline is append-only; everything else is overwritten
 * from the DB row, which stays the source of truth.
 */
export async function writeMeta(
  folderPath: string,
  patch: Partial<SessionMeta> & { session_id: string; phone: string }
): Promise<void> {
  try {
    const existing = (await readMeta(folderPath)) ?? { timeline: [] as TimelineEvent[] };
    const merged: SessionMeta = {
      ...existing,
      ...patch,
      timeline: patch.timeline ?? existing.timeline ?? [],
    } as SessionMeta;
    await fs.mkdir(folderPath, { recursive: true });
    // Write-then-rename so a crash mid-write can't leave truncated JSON.
    const tmp = path.join(folderPath, `.${META_FILE}.tmp`);
    await fs.writeFile(tmp, JSON.stringify(merged, null, 2));
    await fs.rename(tmp, path.join(folderPath, META_FILE));
  } catch (err) {
    // meta.json is a debugging aid, never a dependency of the flow.
    logger.warn({ err, folderPath }, "failed to write meta.json");
  }
}

export async function appendTimeline(
  folderPath: string,
  event: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  const existing = await readMeta(folderPath);
  const timeline = existing?.timeline ?? [];
  timeline.push({ at: new Date().toISOString(), event, ...extra });
  await writeMeta(folderPath, {
    session_id: existing?.session_id ?? "",
    phone: existing?.phone ?? "",
    ...existing,
    timeline,
  });
}

/** §7.1 retention — drop a whole subfolder's contents, keep the folder. */
export async function purgeSubfolder(folderPath: string, sub: (typeof SUBFOLDERS)[number]): Promise<number> {
  const dir = resolveInFolder(folderPath, sub);
  let removed = 0;
  try {
    for (const entry of await fs.readdir(dir)) {
      await fs.rm(path.join(dir, entry), { force: true, recursive: true });
      removed++;
    }
  } catch {
    /* folder already gone */
  }
  return removed;
}
