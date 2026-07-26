// Inbound webhook shapes — Guide §9.6 (❄ frozen). Typed loosely where Meta is
// loose: every field that can be absent is optional, because a missing
// `contacts[]` must never throw inside the worker.

export type WaReferral = {
  source_url?: string;
  source_id?: string;
  source_type?: "ad" | "post" | string;
  headline?: string;
  body?: string;
  ctwa_clid?: string;
};

export type WaMediaRef = {
  id: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
  filename?: string;
};

export type WaInteractive =
  | { type: "list_reply"; list_reply: { id: string; title?: string; description?: string } }
  | { type: "button_reply"; button_reply: { id: string; title?: string } };

export type WaMessage = {
  from: string;
  id: string;
  timestamp?: string;
  type:
    | "text"
    | "image"
    | "interactive"
    | "button"
    | "document"
    | "audio"
    | "video"
    | "sticker"
    | "location"
    | "contacts"
    | "reaction"
    | "order"
    | "system"
    | "unsupported"
    | string;
  text?: { body: string };
  image?: WaMediaRef;
  document?: WaMediaRef;
  video?: WaMediaRef;
  audio?: WaMediaRef;
  sticker?: WaMediaRef;
  interactive?: WaInteractive;
  /** Reply from a template quick-reply button (not interactive.button_reply). */
  button?: { text?: string; payload?: string };
  referral?: WaReferral;
  context?: { from?: string; id?: string };
  errors?: { code: number; title: string; message?: string }[];
};

export type WaStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed" | string;
  timestamp?: string;
  recipient_id?: string;
  conversation?: { id?: string; origin?: { type?: string }; expiration_timestamp?: string };
  pricing?: { billable?: boolean; category?: string; pricing_model?: string };
  errors?: { code: number; title: string; message?: string }[];
};

export type WaValue = {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: { profile?: { name?: string }; wa_id?: string }[];
  messages?: WaMessage[];
  statuses?: WaStatus[];
  errors?: { code: number; title: string; message?: string }[];
};

export type WaChange = { field: string; value: WaValue };
export type WaEntry = { id?: string; changes?: WaChange[] };
export type WaWebhookPayload = { object?: string; entry?: WaEntry[] };

// ---- Outbound ----

export type ListRow = { id: string; title: string; description?: string };
export type ListSection = { title?: string; rows: ListRow[] };
export type ReplyButton = { id: string; title: string };

export type Lang = "hi" | "en" | "mr" | "gu" | "te" | "ta" | "kn";

export const LANGUAGES: readonly Lang[] = ["hi", "en", "mr", "gu", "te", "ta", "kn"] as const;

export type SessionState =
  | "NEW"
  | "AWAITING_LANG"
  | "AWAITING_OCCASION"
  | "AWAITING_TEMPLATE"
  | "AWAITING_PHOTOS"
  | "AWAITING_TEXT"
  | "RENDERING"
  | "AWAITING_APPROVAL"
  | "AWAITING_ORDER_ID"
  | "CONFIRMED"
  | "IN_PRINT"
  | "DISPATCHED"
  | "HUMAN"
  | "ABANDONED";
