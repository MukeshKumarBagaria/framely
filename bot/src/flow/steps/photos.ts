// Step 4 of §8.2 — photo collection, and the debounced acknowledgement (§11.1).
//
// The debounce is durable: instead of an in-memory timer that dies on restart,
// a photo sets `sessions.ack_due_at = now() + 3s` and a 1s sweep sends exactly
// one "5 of 8" once the burst goes quiet. That's the guide's own suggested
// upgrade to its in-memory example, and it makes §20.2's "kill the bot
// mid-flow" drill pass.
import { logger } from "../../logger.ts";
import { t } from "../../i18n/index.ts";
import { countPhotos, savePhoto, undoLastPhoto } from "../../media/photos.ts";
import { appendTimeline } from "../../media/storage.ts";
import type { Input } from "../normalize.ts";
import { send } from "../send.ts";
import { scheduleAck, updateSession, type Session } from "../sessions.ts";
import { askNextField } from "./fields.ts";
import { startRender } from "./render.ts";

export async function sendPhotoInstructions(session: Session, need: number): Promise<void> {
  await send(session, t(session, "send_photos", { need }));
}

/** Re-prompt used by the retry ladder when a non-photo arrives (§8.3). */
export async function sendPhotoPrompt(session: Session): Promise<void> {
  const left = Math.max(0, (session.photos_needed ?? 0) - session.photos_received);
  await send(session, t(session, "send_photos_only", { left }));
}

export async function onPhoto(
  session: Session,
  input: Input,
  waMessageId: string
): Promise<"handled" | "unparsed"> {
  const need = session.photos_needed ?? 0;

  // Not a photo. The caller counts it towards the three-strikes escalation —
  // someone typing at this step is usually someone who needs a human.
  if (input.kind !== "image") return "unparsed";

  // §13.2 — a replacement overwrites its slot and re-renders immediately.
  const replacing = session.replacing_slot;
  const result = await savePhoto(session, input, waMessageId, replacing ?? undefined);

  if (result.status === "duplicate") {
    logger.info({ sessionId: session.id, waMessageId }, "duplicate photo ignored");
    return "handled";
  }

  const count = result.count;

  if (replacing != null) {
    const updated = await updateSession(session.id, {
      replacing_slot: null,
      photos_received: count,
      ack_due_at: null,
    });
    await send(session, t(session, "photo_replaced", { slot: replacing }));
    if (session.folder_path) {
      await appendTimeline(session.folder_path, "photo_replaced", { slot: replacing });
    }
    await startRender(updated);
    return "handled";
  }

  const updated = await updateSession(session.id, { photos_received: count, retry_count: 0 });

  if (count >= need) {
    await updateSession(session.id, { ack_due_at: null });
    if (session.folder_path) {
      await appendTimeline(session.folder_path, "photos_complete", { count });
    }
    // §19 E2 — extra photos are kept but only the first N are used.
    if (count > need) {
      await send(session, t(session, "photos_extra", { got: count, need }));
    }
    const advanced = await updateSession(session.id, { state: "AWAITING_TEXT", field_cursor: 0 });
    await askNextField(advanced);
    return "handled";
  }

  await scheduleAck(updated.id);
  return "handled";
}

/** Fired by the 1s sweep once a photo burst has been quiet for the debounce. */
export async function sendPhotoProgress(session: Session): Promise<void> {
  if (session.state !== "AWAITING_PHOTOS") return;
  const got = await countPhotos(session.id);
  const need = session.photos_needed ?? 0;
  if (got >= need) return;
  await send(session, t(session, "photos_progress", { got, need, left: Math.max(0, need - got) }));
}

/** §8 step 4 — `undo`, understood in every language (§8.3). */
export async function onUndo(session: Session): Promise<void> {
  const need = session.photos_needed ?? 0;
  const { removed, count } = await undoLastPhoto(session);
  await updateSession(session.id, { photos_received: count, ack_due_at: null });
  await send(
    session,
    removed ? t(session, "photo_undo_ok", { got: count, need }) : t(session, "photo_undo_none")
  );
}
