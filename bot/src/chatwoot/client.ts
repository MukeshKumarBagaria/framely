// Chatwoot handoff — Guide §17, "Option A": the bot owns the webhook, and on
// escalation it pushes the whole conversation across and goes quiet.
//
// Chatwoot is optional infrastructure. If it isn't configured, every call here
// is a logged no-op: a missing inbox must never stop a customer from being
// escalated, it just means the escalation lives in the alert channel instead.
import { config } from "../config.ts";
import { logger } from "../logger.ts";

export const chatwootEnabled = Boolean(
  config.CHATWOOT_URL && config.CHATWOOT_API_TOKEN && config.CHATWOOT_ACCOUNT_ID
);

type Json = Record<string, unknown>;

async function api(path: string, init: RequestInit = {}): Promise<Json> {
  if (!chatwootEnabled) throw new Error("chatwoot not configured");
  const url = `${config.CHATWOOT_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      api_access_token: config.CHATWOOT_API_TOKEN!,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`chatwoot ${init.method ?? "GET"} ${path} -> ${res.status} ${await res.text()}`);
  }
  return (await res.json().catch(() => ({}))) as Json;
}

export type ContactAttributes = Record<string, string | number | null>;

export async function upsertContact(input: {
  phoneE164: string;
  name: string;
  attributes: ContactAttributes;
}): Promise<number | null> {
  const search = (await api(`/contacts/search?q=${encodeURIComponent("+" + input.phoneE164)}`)) as {
    payload?: { id: number }[];
  };
  const existing = search.payload?.[0];

  if (existing) {
    await api(`/contacts/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: input.name, custom_attributes: input.attributes }),
    });
    return existing.id;
  }

  const created = (await api("/contacts", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      phone_number: "+" + input.phoneE164,
      identifier: input.phoneE164,
      custom_attributes: input.attributes,
    }),
  })) as { payload?: { contact?: { id?: number }; id?: number } };

  return created.payload?.contact?.id ?? created.payload?.id ?? null;
}

export async function createConversation(contactId: number, sourceId: string): Promise<number | null> {
  const conv = (await api("/conversations", {
    method: "POST",
    body: JSON.stringify({
      contact_id: contactId,
      source_id: sourceId,
      ...(config.CHATWOOT_INBOX_ID ? { inbox_id: Number(config.CHATWOOT_INBOX_ID) } : {}),
      status: "open",
    }),
  })) as { id?: number };
  return conv.id ?? null;
}

export async function createMessage(
  conversationId: number,
  content: string,
  direction: "in" | "out"
): Promise<void> {
  await api(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      message_type: direction === "in" ? "incoming" : "outgoing",
      private: false,
    }),
  });
}

/** Internal note — history replay shouldn't re-send anything to the customer. */
export async function createNote(conversationId: number, content: string): Promise<void> {
  await api(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, message_type: "outgoing", private: true }),
  });
}

export async function addLabels(conversationId: number, labels: string[]): Promise<void> {
  await api(`/conversations/${conversationId}/labels`, {
    method: "POST",
    body: JSON.stringify({ labels }),
  });
}

/** Wrap a call so Chatwoot being down degrades to a log line. */
export async function tryChatwoot<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  if (!chatwootEnabled) {
    logger.debug({ label }, "chatwoot disabled — skipping");
    return null;
  }
  try {
    return await fn();
  } catch (err) {
    logger.error({ err, label }, "chatwoot call failed");
    return null;
  }
}
