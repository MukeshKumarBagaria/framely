// §10.4 event dispatcher. Two jobs: dedupe, and route.
//
// The dedupe is the whole point — "the second most common bug". The unique
// partial index on `messages (wa_message_id) where direction = 'in'` means an
// insert that returns no row is a delivery we've already handled, and we stop
// before any side effect: no download, no counter increment, no reply.
import { query } from "../db/index.ts";
import { logger } from "../logger.ts";
import { runStateMachine } from "../flow/machine.ts";
import type { WaStatus, WaWebhookPayload } from "../whatsapp/types.ts";

export async function handleEvent(payload: unknown): Promise<void> {
  const body = payload as WaWebhookPayload;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") {
        logger.debug({ field: change.field }, "ignoring webhook field");
        continue;
      }
      const value = change.value ?? {};

      for (const status of value.statuses ?? []) await logStatus(status);

      for (const msg of value.messages ?? []) {
        const inserted = await query<{ id: number }>(
          `insert into messages (phone_e164, direction, wa_message_id, type, payload)
           values ($1,'in',$2,$3,$4)
           on conflict (wa_message_id) where direction = 'in' do nothing
           returning id`,
          [msg.from, msg.id, msg.type, JSON.stringify(msg)]
        );
        if (inserted.rowCount === 0) {
          logger.info({ waMessageId: msg.id }, "duplicate webhook delivery ignored");
          continue;
        }

        const profileName = value.contacts?.[0]?.profile?.name;
        await runStateMachine(msg, profileName ?? null);
      }
    }
  }
}

/**
 * §9.6 — delivery receipts are mostly noise, with one exception worth logging:
 * `pricing.billable === false` is the proof that the free-window logic (§2.1)
 * is working. A `failed` status is a real problem and gets a warning.
 */
async function logStatus(status: WaStatus): Promise<void> {
  if (status.status === "failed") {
    logger.warn({ status }, "outbound message failed");
  } else {
    logger.debug(
      { id: status.id, status: status.status, billable: status.pricing?.billable },
      "message status"
    );
  }

  await query(
    `update messages
        set payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('status', $2::text, 'billable', $3::boolean)
      where wa_message_id = $1 and direction = 'out'`,
    [status.id, status.status, status.pricing?.billable ?? null]
  );
}
