// §10.5 `normalize()` — collapse every inbound message shape into the four
// things the state machine actually branches on.
import type { WaMessage } from "../whatsapp/types.ts";

export type Input =
  | { kind: "list"; id: string; title?: string }
  | { kind: "button"; id: string; title?: string }
  | { kind: "text"; text: string }
  | { kind: "image"; mediaId: string; mime: string; asDocument: boolean; filename?: string }
  | { kind: "other"; reason: string };

/** §19 E3 — Indian Android galleries often share photos as documents. */
const IMAGE_MIMES = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i;

export function normalize(msg: WaMessage): Input {
  if (msg.type === "interactive" && msg.interactive) {
    const i = msg.interactive;
    if (i.type === "list_reply") {
      return { kind: "list", id: i.list_reply.id, ...(i.list_reply.title ? { title: i.list_reply.title } : {}) };
    }
    if (i.type === "button_reply") {
      return {
        kind: "button",
        id: i.button_reply.id,
        ...(i.button_reply.title ? { title: i.button_reply.title } : {}),
      };
    }
  }

  // Quick-reply on a *template* message comes back as type "button", not
  // "interactive" — customers replying to a nudge land here.
  if (msg.type === "button" && msg.button) {
    const payload = msg.button.payload ?? msg.button.text ?? "";
    return { kind: "text", text: payload.trim() };
  }

  if (msg.type === "text" && msg.text) {
    return { kind: "text", text: msg.text.body.trim() };
  }

  if (msg.type === "image" && msg.image) {
    return {
      kind: "image",
      mediaId: msg.image.id,
      mime: msg.image.mime_type ?? "image/jpeg",
      asDocument: false,
    };
  }

  if (msg.type === "document" && msg.document) {
    const mime = msg.document.mime_type ?? "";
    if (IMAGE_MIMES.test(mime)) {
      return {
        kind: "image",
        mediaId: msg.document.id,
        mime,
        asDocument: true,
        ...(msg.document.filename ? { filename: msg.document.filename } : {}),
      };
    }
    return { kind: "other", reason: `document/${mime || "unknown"}` };
  }

  return { kind: "other", reason: msg.type };
}

/** Photo captions can carry an answer ("this one is for the name: Priya"). */
export function captionOf(msg: WaMessage): string | undefined {
  return msg.image?.caption ?? msg.document?.caption;
}
