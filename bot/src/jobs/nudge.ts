// §15.2 nudge scheduler.
//
// Two nudges, at +24h and +72h, then nothing. The cap is not a nicety: "block
// rates rise sharply and a low quality rating shrinks your messaging limits"
// (§15.2), and quality rating is the one metric that can restrict the number.
import { query } from "../db/index.ts";
import { config } from "../config.ts";
import { logger } from "../logger.ts";
import { sendTemplate } from "../flow/send.ts";
import type { Session } from "../flow/sessions.ts";

/** Which approved template fits which state (§15). */
function templateFor(session: Session): { name: string; params: string[] } | null {
  const name = session.wa_profile_name ?? "there";
  switch (session.state) {
    case "AWAITING_PHOTOS": {
      const left = Math.max(1, (session.photos_needed ?? 1) - session.photos_received);
      return { name: "photos_pending", params: [name, String(left)] };
    }
    case "AWAITING_TEXT":
      return { name: "preview_ready", params: [name] };
    case "AWAITING_APPROVAL":
      return { name: "design_reminder", params: [name] };
    default:
      return null;
  }
}

export async function runNudges(): Promise<void> {
  const candidates = await query<Session>(
    `select * from sessions
      where state in ('AWAITING_PHOTOS','AWAITING_TEXT','AWAITING_APPROVAL')
        and last_inbound_at < now() - interval '24 hours'
        and last_inbound_at > now() - ($1 || ' days')::interval
        and nudge_count < $2
        and (last_nudge_at is null or last_nudge_at < now() - interval '24 hours')
      order by last_inbound_at
      limit 50`,
    [String(config.ABANDON_AFTER_DAYS), config.MAX_NUDGES]
  );

  for (const session of candidates.rows) {
    const template = templateFor(session);
    if (!template) continue;

    // The second nudge only goes out once ~72h have passed (§15.2).
    if (session.nudge_count >= 1) {
      const idleHours = (Date.now() - (session.last_inbound_at?.getTime() ?? 0)) / 3600_000;
      if (idleHours < 72) continue;
    }

    try {
      await sendTemplate(session, template.name, session.lang ?? "en", template.params);
      await query("update sessions set nudge_count = nudge_count + 1, last_nudge_at = now() where id = $1", [
        session.id,
      ]);
      logger.info({ sessionId: session.id, template: template.name }, "nudge sent");
    } catch (err) {
      // A template that isn't approved yet throws here. Count it anyway so we
      // don't retry it every 15 minutes for a week.
      logger.error({ err, sessionId: session.id, template: template.name }, "nudge failed");
      await query("update sessions set nudge_count = nudge_count + 1, last_nudge_at = now() where id = $1", [
        session.id,
      ]);
    }
  }
}
