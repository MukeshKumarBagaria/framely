// §10.5 — the state machine. Global interrupts first, then one handler per
// state. Every branch either sends something or escalates; a customer must
// never be left with no reply.
import { config } from "../config.ts";
import { logger } from "../logger.ts";
import { isLang, t } from "../i18n/index.ts";
import { markAsRead } from "../whatsapp/client.ts";
import { appendTimeline } from "../media/storage.ts";
import { getDesign, listDesigns } from "./designs.ts";
import { escalateToHuman, forwardToChatwoot } from "./human.ts";
import { isHelpRequest, isRestart, isUndo } from "./interrupts.ts";
import { normalize, type Input } from "./normalize.ts";
import { send } from "./send.ts";
import {
  attachMessageToSession,
  clearRetry,
  createSession,
  getActiveSession,
  getLatestSession,
  getSession,
  resetSession,
  touchWindow,
  updateSession,
  type Session,
} from "./sessions.ts";
import { onApproval } from "./steps/approval.ts";
import { askNextField, onFieldValue } from "./steps/fields.ts";
import { sendDesignMenu, sendLanguageList, sendOccasionList, sendWelcome } from "./steps/menus.ts";
import { onOrderProof } from "./steps/order.ts";
import { onPhoto, onUndo, sendPhotoInstructions, sendPhotoPrompt } from "./steps/photos.ts";
import { resendPreview } from "./steps/render.ts";
import type { WaMessage } from "../whatsapp/types.ts";

/**
 * §19 E11/E14 — a message arriving shortly after an order was confirmed is
 * almost always a question about *that* order, not a request for a second
 * frame. Starting a fresh flow there is the wrong answer; a human is the right
 * one. Beyond this window, a new message starts a new frame.
 */
const POST_ORDER_QUESTION_WINDOW_MS = 12 * 3600_000;

/** States where re-tapping an old occasion/design menu must not restart things. */
const LATE_STATES = new Set(["AWAITING_TEXT", "RENDERING", "AWAITING_APPROVAL", "AWAITING_ORDER_ID"]);

type Resolved = { session: Session; returning: boolean };

async function getOrCreateSession(
  phoneE164: string,
  msg: WaMessage,
  profileName?: string | null
): Promise<Resolved> {
  const active = await getActiveSession(phoneE164);
  if (active) {
    if (profileName && profileName !== active.wa_profile_name) {
      return { session: await updateSession(active.id, { wa_profile_name: profileName }), returning: false };
    }
    return { session: active, returning: false };
  }

  const previous = await getLatestSession(phoneE164);
  const session = await createSession(phoneE164, msg, profileName ?? previous?.wa_profile_name ?? null);

  // §19 E11 — "greet by name and skip language selection".
  if (previous && isLang(previous.lang)) {
    const withLang = await updateSession(session.id, { lang: previous.lang, consent_at: previous.consent_at });
    return { session: withLang, returning: true };
  }
  return { session, returning: false };
}

async function isPostOrderQuestion(phoneE164: string): Promise<Session | null> {
  const previous = await getLatestSession(phoneE164);
  if (!previous) return null;
  const settled = previous.state === "CONFIRMED" || previous.state === "IN_PRINT" || previous.state === "DISPATCHED";
  if (!settled) return null;
  const age = Date.now() - previous.updated_at.getTime();
  return age < POST_ORDER_QUESTION_WINDOW_MS ? previous : null;
}

/** §10.6 — three misfires in one state and a human takes over. */
async function retryOrEscalate(session: Session, resend: () => Promise<void>): Promise<void> {
  const n = (session.retry_count ?? 0) + 1;
  if (n >= config.MAX_PARSE_RETRIES) {
    await escalateToHuman(session, "parse_failures");
    return;
  }
  await updateSession(session.id, { retry_count: n });
  await send(session, t(session, "didnt_understand"));
  await resend();
}

// --------------------------------------------------------------- handlers

async function onLanguage(session: Session, input: Input): Promise<void> {
  if (input.kind !== "list" || !input.id.startsWith("lang_")) {
    await retryOrEscalate(session, () => sendLanguageList(session));
    return;
  }
  const lang = input.id.slice("lang_".length);
  if (!isLang(lang)) {
    await retryOrEscalate(session, () => sendLanguageList(session));
    return;
  }
  // §8.2 step 1 — "Log the consent line as accepted on selection."
  const updated = await updateSession(session.id, {
    lang,
    state: "AWAITING_OCCASION",
    retry_count: 0,
    consent_at: new Date(),
  });
  if (session.folder_path) await appendTimeline(session.folder_path, "consent_accepted", { lang });
  await sendOccasionList(updated);
}

async function onOccasion(session: Session, input: Input): Promise<void> {
  if (input.kind !== "list" || !input.id.startsWith("occ_")) {
    await retryOrEscalate(session, () => sendOccasionList(session));
    return;
  }
  const occasion = input.id.slice("occ_".length);
  const designs = await listDesigns(occasion);
  if (designs.length === 0) {
    await send(session, t(session, "no_designs"));
    await escalateToHuman(session, "no_designs", { notifyCustomer: false });
    return;
  }
  const updated = await updateSession(session.id, { occasion, state: "AWAITING_TEMPLATE", retry_count: 0 });
  await sendDesignMenu(updated);
}

async function onDesign(session: Session, input: Input): Promise<void> {
  if (input.kind !== "list") {
    await retryOrEscalate(session, () => sendDesignMenu(session));
    return;
  }

  if (input.id.startsWith("more_")) {
    await sendDesignMenu(session, Number(input.id.slice("more_".length)) || 0);
    return;
  }

  if (!input.id.startsWith("design_")) {
    await retryOrEscalate(session, () => sendDesignMenu(session));
    return;
  }

  const design = await getDesign(input.id.slice("design_".length));
  if (!design) {
    await retryOrEscalate(session, () => sendDesignMenu(session));
    return;
  }

  const updated = await updateSession(session.id, {
    template_id: design.id,
    photos_needed: design.photos_needed,
    state: "AWAITING_PHOTOS",
    retry_count: 0,
    field_cursor: 0,
  });
  if (session.folder_path) {
    await appendTimeline(session.folder_path, "design_selected", { designId: design.id });
  }
  await sendPhotoInstructions(updated, design.photos_needed);
}

// ---------------------------------------------------------------- machine

export async function runStateMachine(msg: WaMessage, profileName?: string | null): Promise<void> {
  const input = normalize(msg);

  // A settled order plus a fresh message means a question, not a new frame.
  const settled = await isPostOrderQuestion(msg.from);
  if (settled && !isRestart(input)) {
    await forwardToChatwoot(settled, describeInput(input));
    if (settled.state === "CONFIRMED" || settled.state === "IN_PRINT" || settled.state === "DISPATCHED") {
      await escalateToHuman(settled, "user_requested");
    }
    return;
  }

  const { session, returning } = await getOrCreateSession(msg.from, msg, profileName);
  const stateBefore = session.state;
  const touched = await touchWindow(session);

  // Blue ticks are free and stop customers re-sending into perceived silence.
  void markAsRead(msg.id);

  try {
    await route(touched, input, msg, returning);
  } finally {
    // Re-read by id, not by phone: once a session reaches CONFIRMED it is no
    // longer the "active" one, and the audit row would record the wrong state.
    const after = await getSession(session.id);
    await attachMessageToSession(msg.id, session.id, stateBefore, after?.state ?? stateBefore);
  }
}

function describeInput(input: Input): string {
  switch (input.kind) {
    case "text":
      return input.text;
    case "list":
    case "button":
      return `[tapped] ${input.title ?? input.id}`;
    case "image":
      return "[image]";
    default:
      return `[${input.reason}]`;
  }
}

async function route(session: Session, input: Input, msg: WaMessage, returning: boolean): Promise<void> {
  // ---- §8.3 global interrupts, checked before state routing ----
  if (session.state === "HUMAN") {
    await forwardToChatwoot(session, describeInput(input));
    return;
  }
  if (isHelpRequest(input)) {
    await escalateToHuman(session, "user_requested");
    return;
  }
  if (isRestart(input)) {
    const reset = await resetSession(session);
    await send(reset, t(reset, "restarted"));
    await sendOccasionList(reset);
    return;
  }
  if (isUndo(input) && session.state === "AWAITING_PHOTOS") {
    await onUndo(session);
    return;
  }
  // §19 E14 — WhatsApp keeps old menus tappable forever. A customer scrolling
  // up and re-picking an occasion or design halfway through would otherwise
  // silently restart the frame they're in the middle of paying for.
  if (input.kind === "list" && /^(occ_|design_)/.test(input.id) && LATE_STATES.has(session.state)) {
    await send(session, t(session, "session_busy"));
    return;
  }

  switch (session.state) {
    case "NEW": {
      if (returning) {
        await send(session, t(session, "welcome_back", { name: session.wa_profile_name ?? "" }));
        await sendOccasionList(session);
        return;
      }
      await sendWelcome(session);
      return;
    }

    case "AWAITING_LANG":
      return onLanguage(session, input);

    case "AWAITING_OCCASION":
      return onOccasion(session, input);

    case "AWAITING_TEMPLATE":
      return onDesign(session, input);

    case "AWAITING_PHOTOS": {
      const outcome = await onPhoto(session, input, msg.id);
      if (outcome === "unparsed") await retryOrEscalate(session, () => sendPhotoPrompt(session));
      else await clearRetry(session);
      return;
    }

    case "AWAITING_TEXT":
      await clearRetry(session);
      return onFieldValue(session, input);

    case "RENDERING":
      // A render is in flight; anything they send now is answered by the
      // preview that's about to arrive.
      await send(session, t(session, "please_wait"));
      return;

    case "AWAITING_APPROVAL": {
      const outcome = await onApproval(session, input);
      if (outcome === "unparsed") await retryOrEscalate(session, () => resendPreview(session));
      else await clearRetry(session);
      return;
    }

    case "AWAITING_ORDER_ID": {
      const outcome = await onOrderProof(session, input, msg.id);
      if (outcome === "unparsed") {
        const n = (session.retry_count ?? 0) + 1;
        if (n >= config.MAX_PARSE_RETRIES) {
          await escalateToHuman(session, "order_id_failed");
          return;
        }
        await updateSession(session.id, { retry_count: n });
        return;
      }
      await clearRetry(session);
      return;
    }

    default:
      logger.warn({ sessionId: session.id, state: session.state }, "message in unexpected state");
      await escalateToHuman(session, "unknown_state");
      return;
  }
}

/** Exposed for the field step's re-entry after a render (used by tests too). */
export { askNextField, retryOrEscalate };
