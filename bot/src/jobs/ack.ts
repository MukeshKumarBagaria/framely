// §11.1 — the durable half of the debounced photo acknowledgement.
//
// `onPhoto` sets `ack_due_at = now() + 3s` on every photo in a burst. This sweep
// fires once the burst has been quiet for that long, so eight photos produce
// exactly one "5 of 8" — and, unlike the guide's in-memory timer map, it
// survives a restart mid-burst (§19 E20).
import { query } from "../db/index.ts";
import { logger } from "../logger.ts";
import { sendPhotoProgress } from "../flow/steps/photos.ts";
import type { Session } from "../flow/sessions.ts";

export async function sweepAcks(): Promise<void> {
  // Claim and clear in one statement so two containers can't both send it.
  const due = await query<Session>(
    `update sessions set ack_due_at = null
      where id in (
        select id from sessions
         where ack_due_at is not null and ack_due_at <= now()
           and state = 'AWAITING_PHOTOS'
         limit 20
         for update skip locked)
     returning *`
  );

  for (const session of due.rows) {
    try {
      await sendPhotoProgress(session);
    } catch (err) {
      logger.error({ err, sessionId: session.id }, "photo progress ack failed");
    }
  }
}
