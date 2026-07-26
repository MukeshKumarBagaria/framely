// Outbound helpers. Every customer-facing message goes through here so that
// (a) it lands in the `messages` audit log and (b) a closed 24h window degrades
// into "schedule a template nudge" instead of an exception in the worker.
import * as wa from "../whatsapp/client.ts";
import { WhatsAppError } from "../whatsapp/client.ts";
import { logger } from "../logger.ts";
import { logOutbound, type Session } from "./sessions.ts";
import type { ListSection, ReplyButton } from "../whatsapp/types.ts";

type Target = Pick<Session, "id" | "phone_e164" | "state">;

// Graph error codes for "you are outside the customer service window".
// Re-sending won't help; only a pre-approved template will (§2.2).
const WINDOW_CLOSED_CODES = new Set([131047, 131026, 470]);

export function isWindowClosedError(err: unknown): boolean {
  return err instanceof WhatsAppError && err.code !== undefined && WINDOW_CLOSED_CODES.has(err.code);
}

async function guard<T>(session: Target, kind: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (isWindowClosedError(err)) {
      // §15.2 will pick this session up and send an approved template.
      logger.warn({ sessionId: session.id, kind }, "24h window closed — deferring to nudge scheduler");
      return null;
    }
    throw err;
  }
}

export async function send(session: Target, body: string, previewUrl = false): Promise<string | null> {
  return guard(session, "text", async () => {
    const id = await wa.sendText(session.phone_e164, body, previewUrl);
    await logOutbound(session, "text", { body }, id);
    return id;
  });
}

export async function sendList(
  session: Target,
  input: { header?: string; body: string; footer?: string; button: string; sections: ListSection[] }
): Promise<string | null> {
  return guard(session, "list", async () => {
    const id = await wa.sendList(session.phone_e164, input);
    await logOutbound(session, "interactive", input, id);
    return id;
  });
}

export async function sendButtons(
  session: Target,
  input: { header?: string; body: string; footer?: string; buttons: ReplyButton[] }
): Promise<string | null> {
  return guard(session, "buttons", async () => {
    const id = await wa.sendButtons(session.phone_e164, input);
    await logOutbound(session, "interactive", input, id);
    return id;
  });
}

export async function sendImageByLink(
  session: Target,
  link: string,
  caption?: string
): Promise<string | null> {
  return guard(session, "image", async () => {
    const id = await wa.sendImageByLink(session.phone_e164, link, caption);
    await logOutbound(session, "image", { link, caption }, id);
    return id;
  });
}

export async function sendImageBuffer(
  session: Target,
  buf: Buffer,
  mime: string,
  filename: string,
  caption?: string
): Promise<string | null> {
  return guard(session, "image", async () => {
    const mediaId = await wa.uploadMedia(buf, mime, filename);
    const id = await wa.sendImageById(session.phone_e164, mediaId, caption);
    await logOutbound(session, "image", { mediaId, filename, caption }, id);
    return id;
  });
}

export async function sendDocumentBuffer(
  session: Target,
  buf: Buffer,
  mime: string,
  filename: string,
  caption?: string
): Promise<string | null> {
  return guard(session, "document", async () => {
    const mediaId = await wa.uploadMedia(buf, mime, filename);
    const id = await wa.sendDocumentById(session.phone_e164, mediaId, filename, caption);
    await logOutbound(session, "document", { mediaId, filename, caption }, id);
    return id;
  });
}

/** §9.5 — the paid path. Used by the nudge scheduler and dispatch notices. */
export async function sendTemplate(
  session: Target,
  name: string,
  langCode: string,
  params: string[] = []
): Promise<string | null> {
  const id = await wa.sendTemplate(session.phone_e164, name, langCode, params);
  await logOutbound(session, "template", { name, langCode, params }, id);
  return id;
}
