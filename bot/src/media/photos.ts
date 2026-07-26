// Media pipeline — Guide §11. Download, name, persist, dedupe.
//
// Two invariants hold everything together:
//   1. `wa_message_id` is unique on `media`, so a replayed webhook (§19 E1)
//      cannot create a second file or a second counter increment.
//   2. `slot_index` is the frame slot, 1-based, and is what the renderer reads —
//      so replacing photo 3 (§13.2) overwrites slot 3 instead of appending.
import { query, queryOne } from "../db/index.ts";
import { downloadMedia } from "../whatsapp/client.ts";
import { logger } from "../logger.ts";
import { removeFile, saveFile } from "./storage.ts";
import type { Input } from "../flow/normalize.ts";
import type { Session } from "../flow/sessions.ts";

export type MediaRow = {
  id: string;
  session_id: string;
  wa_media_id: string;
  wa_message_id: string;
  kind: "photo" | "screenshot" | "other";
  mime_type: string | null;
  bytes: number | null;
  sha256: string | null;
  local_path: string;
  slot_index: number | null;
  created_at: Date;
};

function extFor(mime: string): string {
  if (/png/i.test(mime)) return "png";
  if (/webp/i.test(mime)) return "webp";
  return "jpg";
}

export type SavePhotoResult =
  | { status: "saved"; relPath: string; slot: number; count: number }
  | { status: "duplicate"; count: number };

/**
 * §11 `onPhoto` — download the media, write it into `raw/`, record it.
 * `slot` is explicit for replacements; otherwise the next free slot is used.
 */
export async function savePhoto(
  session: Session,
  input: Extract<Input, { kind: "image" }>,
  waMessageId: string,
  slot?: number
): Promise<SavePhotoResult> {
  if (!session.folder_path) throw new Error(`session ${session.id} has no folder_path`);

  // Cheap pre-check so a replay doesn't even hit the Graph API.
  const existing = await queryOne<{ id: string }>("select id from media where wa_message_id = $1", [
    waMessageId,
  ]);
  if (existing) {
    return { status: "duplicate", count: await countPhotos(session.id) };
  }

  const { buf, mime, sha256, bytes } = await downloadMedia(input.mediaId);

  const targetSlot = slot ?? (await nextFreeSlot(session.id));
  const idx = String(targetSlot).padStart(2, "0");
  const relPath = `raw/${idx}_${waMessageId.slice(-12)}.${extFor(mime)}`;

  await saveFile(session.folder_path, relPath, buf);

  // A replacement frees its slot first: the old row and its file both go, so
  // `raw/` never accumulates orphans the renderer might pick up.
  if (slot !== undefined) {
    const previous = await queryOne<{ local_path: string }>(
      `delete from media where session_id = $1 and kind = 'photo' and slot_index = $2
         and local_path <> $3 returning local_path`,
      [session.id, slot, relPath]
    );
    if (previous) await removeFile(session.folder_path, previous.local_path).catch(() => {});
  }

  const inserted = await query(
    `insert into media
       (session_id, wa_media_id, wa_message_id, kind, mime_type, bytes, sha256, local_path, slot_index)
     values ($1,$2,$3,'photo',$4,$5,$6,$7,$8)
     on conflict (wa_message_id) do nothing
     returning id`,
    [session.id, input.mediaId, waMessageId, mime, bytes, sha256 ?? null, relPath, targetSlot]
  );

  if (inserted.rowCount === 0) {
    // Lost a race with a concurrent delivery of the same message.
    await removeFile(session.folder_path, relPath).catch(() => {});
    return { status: "duplicate", count: await countPhotos(session.id) };
  }

  logger.info(
    { sessionId: session.id, slot: targetSlot, bytes, asDocument: input.asDocument },
    "photo saved"
  );
  return { status: "saved", relPath, slot: targetSlot, count: await countPhotos(session.id) };
}

/** §14.4 — order screenshots live in `screenshots/`, not `raw/`. */
export async function saveScreenshot(
  session: Session,
  input: Extract<Input, { kind: "image" }>,
  waMessageId: string
): Promise<{ relPath: string; buf: Buffer } | null> {
  if (!session.folder_path) throw new Error(`session ${session.id} has no folder_path`);

  const existing = await queryOne<{ local_path: string }>(
    "select local_path from media where wa_message_id = $1",
    [waMessageId]
  );
  if (existing) return null;

  const { buf, mime, sha256, bytes } = await downloadMedia(input.mediaId);
  const relPath = `screenshots/meesho_${Date.now()}.${extFor(mime)}`;
  await saveFile(session.folder_path, relPath, buf);

  await query(
    `insert into media
       (session_id, wa_media_id, wa_message_id, kind, mime_type, bytes, sha256, local_path)
     values ($1,$2,$3,'screenshot',$4,$5,$6,$7)
     on conflict (wa_message_id) do nothing`,
    [session.id, input.mediaId, waMessageId, mime, bytes, sha256 ?? null, relPath]
  );

  return { relPath, buf };
}

export async function countPhotos(sessionId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "select count(*)::int as n from media where session_id = $1 and kind = 'photo'",
    [sessionId]
  );
  return row?.n ?? 0;
}

async function nextFreeSlot(sessionId: string): Promise<number> {
  // Lowest unused slot, so an `undo` followed by a new photo refills the gap
  // rather than leaving a hole the renderer would render as blank.
  const rows = await query<{ slot_index: number | null }>(
    "select slot_index from media where session_id = $1 and kind = 'photo' order by slot_index",
    [sessionId]
  );
  const used = new Set(rows.rows.map((r) => r.slot_index ?? 0));
  let slot = 1;
  while (used.has(slot)) slot++;
  return slot;
}

/** Ordered `raw/...` paths for the renderer request (§12.1 `photos`). */
export async function photoPaths(sessionId: string, limit?: number): Promise<string[]> {
  const res = await query<{ local_path: string }>(
    `select local_path from media
      where session_id = $1 and kind = 'photo'
      order by slot_index nulls last, created_at
      ${limit ? "limit " + Number(limit) : ""}`,
    [sessionId]
  );
  return res.rows.map((r) => r.local_path);
}

/** §8 step 4 — `undo` removes the most recent photo. */
export async function undoLastPhoto(session: Session): Promise<{ removed: boolean; count: number }> {
  const row = await queryOne<{ local_path: string }>(
    `delete from media where id = (
        select id from media where session_id = $1 and kind = 'photo'
        order by created_at desc limit 1)
      returning local_path`,
    [session.id]
  );
  if (row && session.folder_path) {
    await removeFile(session.folder_path, row.local_path).catch(() => {});
  }
  return { removed: Boolean(row), count: await countPhotos(session.id) };
}

export async function listMedia(sessionId: string, kind?: MediaRow["kind"]): Promise<MediaRow[]> {
  const res = await query<MediaRow>(
    `select * from media where session_id = $1 ${kind ? "and kind = $2" : ""}
      order by slot_index nulls last, created_at`,
    kind ? [sessionId, kind] : [sessionId]
  );
  return res.rows;
}
