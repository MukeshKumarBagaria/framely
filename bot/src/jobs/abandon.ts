// §8.1 / §19 E10 — a session with no reply for 7 days is ABANDONED. That frees
// the phone number's unique active-session slot, so the customer coming back on
// day 8 starts cleanly (and gets the §19 E11 "welcome back" path).
import { query } from "../db/index.ts";
import { config } from "../config.ts";
import { logger } from "../logger.ts";

export async function abandonStale(): Promise<void> {
  const res = await query<{ id: string }>(
    `update sessions
        set state = 'ABANDONED', ack_due_at = null
      where state in ('NEW','AWAITING_LANG','AWAITING_OCCASION','AWAITING_TEMPLATE',
                      'AWAITING_PHOTOS','AWAITING_TEXT','AWAITING_APPROVAL','AWAITING_ORDER_ID')
        and coalesce(last_inbound_at, created_at) < now() - ($1 || ' days')::interval
      returning id`,
    [String(config.ABANDON_AFTER_DAYS)]
  );
  if (res.rowCount) logger.info({ count: res.rowCount }, "sessions abandoned");

  // A session stuck in RENDERING for hours means the renderer died mid-call and
  // nothing retried it. Surface it rather than leaving a customer waiting.
  const stuck = await query<{ id: string }>(
    `select id from sessions where state = 'RENDERING' and updated_at < now() - interval '1 hour'`
  );
  if (stuck.rowCount) {
    logger.warn({ ids: stuck.rows.map((r) => r.id) }, "sessions stuck in RENDERING");
  }
}
