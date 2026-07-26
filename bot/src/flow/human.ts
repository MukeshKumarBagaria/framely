// Human handoff — Guide §17. Once a session is HUMAN the bot is silent for it;
// §17.3's `bot-resume` webhook (see admin/routes.ts) is the only way back.
import * as chatwoot from "../chatwoot/client.ts";
import { alertAdmin } from "../alerts.ts";
import { logger } from "../logger.ts";
import { t } from "../i18n/index.ts";
import { appendTimeline } from "../media/storage.ts";
import { send } from "./send.ts";
import { getConversation, updateSession, type Session } from "./sessions.ts";

export type EscalationReason =
  | "user_requested"
  | "parse_failures"
  | "revision_limit"
  | "render_failed"
  | "no_designs"
  | "order_id_failed"
  | "unknown_state"
  | "abuse_flag"
  | "admin";

/** Render one logged message as a line an agent can read at a glance. */
function renderForAgent(m: { direction: "in" | "out"; type: string | null; payload: unknown }): string {
  const p = (m.payload ?? {}) as Record<string, unknown>;
  if (m.type === "text") return String(p.body ?? p.text ?? "");
  if (m.type === "image") return "[image] " + String(p.caption ?? p.link ?? "");
  if (m.type === "document") return "[document] " + String(p.filename ?? "");
  if (m.type === "interactive") {
    const interactive = p.interactive as Record<string, unknown> | undefined;
    const reply = (interactive?.list_reply ?? interactive?.button_reply) as
      | { id?: string; title?: string }
      | undefined;
    if (reply) return `[tapped] ${reply.title ?? reply.id ?? ""}`;
    return `[menu] ${String(p.body ?? "")}`;
  }
  if (m.type === "template") return `[template ${String(p.name ?? "")}]`;
  return `[${m.type ?? "?"}]`;
}

export async function escalateToHuman(
  session: Session,
  reason: EscalationReason,
  options: { notifyCustomer?: boolean } = {}
): Promise<void> {
  const { notifyCustomer = true } = options;

  if (session.state === "HUMAN") {
    logger.debug({ sessionId: session.id }, "already escalated");
    return;
  }

  const updated = await updateSession(session.id, {
    state: "HUMAN",
    human_reason: reason,
    ack_due_at: null,
    retry_count: 0,
  });

  if (notifyCustomer) {
    await send(updated, t(updated, reason === "revision_limit" ? "connecting_designer" : "human_ack"));
  }

  const conversationId = await chatwoot.tryChatwoot("escalate", async () => {
    const contactId = await chatwoot.upsertContact({
      phoneE164: session.phone_e164,
      name: session.wa_profile_name ?? session.phone_e164,
      attributes: {
        session_id: session.id,
        lang: session.lang,
        occasion: session.occasion,
        design: session.template_id,
        photos: `${session.photos_received}/${session.photos_needed ?? "?"}`,
        revisions: session.revision_count,
        folder: session.folder_path,
        preview: session.current_render,
        escalation_reason: reason,
      },
    });
    if (!contactId) return null;

    const conv = await chatwoot.createConversation(contactId, session.phone_e164);
    if (!conv) return null;

    for (const m of await getConversation(session.id)) {
      const content = renderForAgent(m);
      if (content.trim()) await chatwoot.createMessage(conv, content, m.direction);
    }
    await chatwoot.createNote(
      conv,
      `Escalated by the bot — reason: ${reason}\nState before: ${session.state}\nFolder: ${session.folder_path ?? "-"}\nPreview: ${session.current_render ?? "-"}`
    );
    await chatwoot.addLabels(conv, ["escalated", reason, session.lang ?? "en"].filter(Boolean));
    return conv;
  });

  if (conversationId) {
    await updateSession(session.id, { chatwoot_conversation_id: String(conversationId) });
  }

  if (session.folder_path) await appendTimeline(session.folder_path, "escalated", { reason });

  await alertAdmin({
    severity: reason === "render_failed" ? "high" : "medium",
    title: `Escalation: ${session.phone_e164}`,
    detail: `reason=${reason} state=${session.state} lang=${session.lang ?? "-"} folder=${session.folder_path ?? "-"}`,
  });
}

/** §17.2 — while HUMAN, inbound messages are mirrored to the agent inbox only. */
export async function forwardToChatwoot(session: Session, text: string): Promise<void> {
  if (!session.chatwoot_conversation_id) {
    logger.info({ sessionId: session.id, text }, "inbound while HUMAN (no chatwoot conversation)");
    return;
  }
  await chatwoot.tryChatwoot("forward", () =>
    chatwoot.createMessage(Number(session.chatwoot_conversation_id), text, "in")
  );
}
