// Step 5 of §8.2 — text fields, one question at a time.
//
// `maxLen` is enforced here, server-side, because the renderer's layout was
// designed around it: an over-long name doesn't wrap, it overlaps. Regional
// scripts are stored verbatim (§8.2 step 5); we count code points, never bytes.
import { t } from "../../i18n/index.ts";
import { len } from "../../whatsapp/limits.ts";
import { fieldLabel, getDesign, type DesignField } from "../designs.ts";
import { isSkip } from "../interrupts.ts";
import type { Input } from "../normalize.ts";
import { send } from "../send.ts";
import { updateSession, type Session } from "../sessions.ts";
import { startRender } from "./render.ts";

export async function fieldsFor(session: Session): Promise<DesignField[]> {
  if (!session.template_id) return [];
  const design = await getDesign(session.template_id);
  return design?.fields ?? [];
}

/**
 * Ask for the field at `field_cursor`, or start rendering when they're all in.
 * Optional fields advertise "skip"; required ones don't.
 */
export async function askNextField(session: Session): Promise<void> {
  const fields = await fieldsFor(session);
  const cursor = session.field_cursor ?? 0;
  const field = fields[cursor];

  if (!field) {
    await startRender(session);
    return;
  }

  const label = fieldLabel(field, session.lang);
  const key = field.required === false ? "ask_field_optional" : "ask_field";
  await send(session, t(session, key, { label }));

  if (session.state !== "AWAITING_TEXT") {
    await updateSession(session.id, { state: "AWAITING_TEXT", retry_count: 0 });
  }
}

export async function onFieldValue(session: Session, input: Input): Promise<void> {
  const fields = await fieldsFor(session);
  const cursor = session.field_cursor ?? 0;
  const field = fields[cursor];

  if (!field) {
    await startRender(session);
    return;
  }

  if (input.kind !== "text") {
    await send(session, t(session, "ask_field", { label: fieldLabel(field, session.lang) }));
    return;
  }

  const label = fieldLabel(field, session.lang);
  const raw = input.text;

  if (isSkip(raw)) {
    if (field.required === false) {
      await advance(session, field.key, "");
      return;
    }
    await send(session, t(session, "field_empty", { label }));
    return;
  }

  if (raw.length === 0) {
    await send(session, t(session, "field_empty", { label }));
    return;
  }

  if (len(raw) > field.maxLen) {
    await send(session, t(session, "field_too_long", { label, max: field.maxLen }));
    return;
  }

  await advance(session, field.key, raw);
}

async function advance(session: Session, key: string, value: string): Promise<void> {
  const values = { ...(session.field_values ?? {}), [key]: value };
  const updated = await updateSession(session.id, {
    field_values: values,
    field_cursor: (session.field_cursor ?? 0) + 1,
    retry_count: 0,
  });
  await askNextField(updated);
}
