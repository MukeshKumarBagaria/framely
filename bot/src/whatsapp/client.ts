// The entire WhatsApp Cloud API surface, in one file. Guide §23 mitigation:
// "Keep the send/receive layer behind one module so a version bump is one file."
// Payload shapes are §9's catalog verbatim.
import { config } from "../config.ts";
import { logger } from "../logger.ts";
import { alertAdmin } from "../alerts.ts";
import { assertButtonsValid, assertListValid, clamp, LIMITS } from "./limits.ts";
import type { ListSection, ReplyButton } from "./types.ts";

const GRAPH = `https://graph.facebook.com/${config.WA_GRAPH_VERSION}`;
const AUTH = { Authorization: `Bearer ${config.WA_TOKEN}` };

export class WhatsAppError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly body: string;
  constructor(status: number, body: string, code?: number) {
    super(`WhatsApp API ${status}${code ? ` (code ${code})` : ""}: ${body.slice(0, 300)}`);
    this.name = "WhatsAppError";
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One Graph call with the retry policy from §19: E17 exponential backoff that
 * respects Retry-After on 429, and E16 — any 401 is a critical alert, because
 * it means the system-user token died and the whole bot is mute until it's
 * replaced. 4xx other than 429 are never retried; they're our bug, not weather.
 */
async function graph(
  path: string,
  init: RequestInit & { attempts?: number } = {}
): Promise<Record<string, unknown>> {
  const { attempts = 4, ...requestInit } = init;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${GRAPH}${path}`, {
        ...requestInit,
        headers: { ...AUTH, ...(requestInit.headers ?? {}) },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
      await sleep(2 ** attempt * 250);
      continue;
    }

    if (res.ok) return (await res.json().catch(() => ({}))) as Record<string, unknown>;

    const body = await res.text().catch(() => "");
    const code = extractErrorCode(body);

    if (res.status === 401 || res.status === 403) {
      await alertAdmin({
        severity: "critical",
        title: "WhatsApp token rejected",
        detail: `${res.status} on ${path}. Regenerate the System User token (§19 E16).`,
      });
      throw new WhatsAppError(res.status, body, code);
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === attempts) throw new WhatsAppError(res.status, body, code);

    const retryAfter = Number(res.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
    logger.warn({ status: res.status, path, attempt, delay }, "graph call retrying");
    await sleep(delay);
  }

  throw new WhatsAppError(0, `network failure after ${attempts} attempts: ${String(lastError)}`);
}

function extractErrorCode(body: string): number | undefined {
  try {
    const parsed = JSON.parse(body) as { error?: { code?: number } };
    return parsed.error?.code;
  } catch {
    return undefined;
  }
}

async function postMessage(payload: Record<string, unknown>): Promise<string> {
  const res = await graph(`/${config.WA_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
  });
  const messages = res.messages as { id?: string }[] | undefined;
  return messages?.[0]?.id ?? "";
}

// ---------------------------------------------------------------- outbound

/** §9.1 */
export function sendText(to: string, body: string, previewUrl = false): Promise<string> {
  return postMessage({
    to,
    type: "text",
    text: { body: clamp(body, LIMITS.textBody), preview_url: previewUrl },
  });
}

/** §9.2 — validated against the hard limits before it leaves the process. */
export function sendList(
  to: string,
  input: { header?: string; body: string; footer?: string; button: string; sections: ListSection[] }
): Promise<string> {
  assertListValid(input);
  return postMessage({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      ...(input.header ? { header: { type: "text", text: input.header } } : {}),
      body: { text: input.body },
      ...(input.footer ? { footer: { text: input.footer } } : {}),
      action: {
        button: input.button,
        sections: input.sections.map((s) => ({
          ...(s.title ? { title: s.title } : {}),
          rows: s.rows,
        })),
      },
    },
  });
}

/** §9.3 */
export function sendButtons(
  to: string,
  input: { header?: string; body: string; footer?: string; buttons: ReplyButton[] }
): Promise<string> {
  assertButtonsValid(input.body, input.buttons);
  return postMessage({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      ...(input.header ? { header: { type: "text", text: input.header } } : {}),
      body: { text: input.body },
      ...(input.footer ? { footer: { text: input.footer } } : {}),
      action: {
        buttons: input.buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })),
      },
    },
  });
}

/** §9.4 — public URL variant, used for the design catalog images. */
export function sendImageByLink(to: string, link: string, caption?: string): Promise<string> {
  return postMessage({
    to,
    type: "image",
    image: { link, ...(caption ? { caption: clamp(caption, LIMITS.imageCaption) } : {}) },
  });
}

/** §9.4 — uploaded-media variant, used for private previews of real photos. */
export function sendImageById(to: string, mediaId: string, caption?: string): Promise<string> {
  return postMessage({
    to,
    type: "image",
    image: { id: mediaId, ...(caption ? { caption: clamp(caption, LIMITS.imageCaption) } : {}) },
  });
}

/** §19 E9 fallback: preview upload keeps failing → send the print PDF instead. */
export function sendDocumentById(
  to: string,
  mediaId: string,
  filename: string,
  caption?: string
): Promise<string> {
  return postMessage({
    to,
    type: "document",
    document: { id: mediaId, filename, ...(caption ? { caption: clamp(caption, LIMITS.imageCaption) } : {}) },
  });
}

/** §9.5 — the only messages that can cost money (§2.2). */
export function sendTemplate(
  to: string,
  name: string,
  langCode: string,
  bodyParams: string[] = []
): Promise<string> {
  return postMessage({
    to,
    type: "template",
    template: {
      name,
      language: { code: langCode },
      ...(bodyParams.length
        ? {
            components: [
              { type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) },
            ],
          }
        : {}),
    },
  });
}

/**
 * Blue ticks. Free, not required, and worth it: a customer who sends 8 photos
 * into silence starts re-sending them.
 */
export async function markAsRead(messageId: string): Promise<void> {
  try {
    await graph(`/${config.WA_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
      attempts: 1,
    });
  } catch (err) {
    logger.debug({ err, messageId }, "mark-as-read failed (ignored)");
  }
}

// ------------------------------------------------------------------- media

export type MediaMeta = { url: string; mime_type?: string; sha256?: string; file_size?: number };

/**
 * §11 — two steps. The URL from step 1 is valid for ~5 minutes and a plain
 * fetch on it returns 401: the bearer token is required on the download too.
 * Never persist that URL.
 */
export async function downloadMedia(
  mediaId: string
): Promise<{ buf: Buffer; mime: string; sha256?: string; bytes: number }> {
  const meta = (await graph(`/${mediaId}`)) as MediaMeta;
  if (!meta.url) throw new Error(`media ${mediaId}: no url in metadata`);

  const res = await fetch(meta.url, { headers: AUTH, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`media download ${res.status} for ${mediaId}`);
  const buf = Buffer.from(await res.arrayBuffer());

  return {
    buf,
    mime: meta.mime_type ?? "application/octet-stream",
    sha256: meta.sha256,
    bytes: meta.file_size ?? buf.byteLength,
  };
}

/** §9.4 — upload, then send by id. Returns the media id. */
export async function uploadMedia(buf: Buffer, mime: string, filename: string): Promise<string> {
  const form = new FormData();
  form.set("messaging_product", "whatsapp");
  form.set("type", mime);
  form.set("file", new Blob([new Uint8Array(buf)], { type: mime }), filename);

  const res = await graph(`/${config.WA_PHONE_NUMBER_ID}/media`, { method: "POST", body: form });
  const id = res.id as string | undefined;
  if (!id) throw new Error("media upload returned no id");
  return id;
}
