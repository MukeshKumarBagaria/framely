// §13 Approval & revision loop.
//
// The revision cap is the important line in this file: three automated
// revisions, then a human reads the thread (§13.3). Average revisions per
// design is also the metric that tells you which template to fix — it's on the
// dashboard for that reason.
import { config } from "../../config.ts";
import { t } from "../../i18n/index.ts";
import { appendTimeline } from "../../media/storage.ts";
import { fitRow } from "../../whatsapp/limits.ts";
import { escalateToHuman } from "../human.ts";
import type { Input } from "../normalize.ts";
import { send, sendList } from "../send.ts";
import { updateSession, type Session } from "../sessions.ts";
import { askNextField } from "./fields.ts";
import { sendApprovalButtons } from "./render.ts";
import { sendMeeshoLink } from "./order.ts";

/** True when we've already given this customer their allowance of revisions. */
export async function revisionCapReached(session: Session): Promise<boolean> {
  if (session.revision_count < config.MAX_REVISIONS) return false;
  await escalateToHuman(session, "revision_limit");
  return true;
}

export async function onApproval(session: Session, input: Input): Promise<"handled" | "unparsed"> {
  if (input.kind === "button" || input.kind === "list") {
    const id = input.id;

    if (id === "approve") {
      const approved = await updateSession(session.id, {
        state: "AWAITING_ORDER_ID",
        approved_at: new Date(),
        retry_count: 0,
      });
      if (session.folder_path) await appendTimeline(session.folder_path, "approved");
      await sendMeeshoLink(approved);
      return "handled";
    }

    if (id === "change_text") {
      if (await revisionCapReached(session)) return "handled";
      const updated = await updateSession(session.id, {
        state: "AWAITING_TEXT",
        field_cursor: 0,
        retry_count: 0,
      });
      await askNextField(updated);
      return "handled";
    }

    if (id === "change_photo") {
      if (await revisionCapReached(session)) return "handled";
      await askWhichPhoto(session);
      return "handled";
    }

    // §12.3 — "it's fine" after a LOW_DPI warning.
    if (id === "dpi_ok") {
      await sendApprovalButtons(session);
      return "handled";
    }

    // `slot_3` from the which-photo list, `replace_3` from the LOW_DPI buttons.
    const slotMatch = /^(?:slot|replace)_(\d+)$/.exec(id);
    if (slotMatch?.[1]) {
      await beginPhotoReplacement(session, Number(slotMatch[1]));
      return "handled";
    }
  }

  // §13.2 — designs with more than 10 photos can't use a list, so the customer
  // types the number instead.
  if (input.kind === "text") {
    const n = Number(input.text.replace(/\D/g, ""));
    const need = session.photos_needed ?? 0;
    if (Number.isInteger(n) && n >= 1 && n <= need) {
      await beginPhotoReplacement(session, n);
      return "handled";
    }
  }

  // Nothing matched. The caller runs the retry/escalate ladder, which re-sends
  // the preview itself — doing it here too would double-message the customer.
  return "unparsed";
}

export async function askWhichPhoto(session: Session): Promise<void> {
  const need = session.photos_needed ?? 0;

  // ⚠️ §13.2: an 8-photo collage sits exactly on the 10-row limit. Anything
  // larger has to be typed.
  if (need > 10) {
    await send(session, t(session, "type_photo_number", { max: need }));
    return;
  }

  const rows = Array.from({ length: need }, (_, i) =>
    fitRow({ id: `slot_${i + 1}`, title: t(session, "photo_row", { num: i + 1 }) })
  );

  await sendList(session, {
    body: t(session, "which_photo"),
    button: t(session, "which_photo_button"),
    sections: [{ rows }],
  });
}

export async function beginPhotoReplacement(session: Session, slot: number): Promise<void> {
  if (await revisionCapReached(session)) return;
  const need = session.photos_needed ?? 0;
  if (slot < 1 || slot > need) {
    await askWhichPhoto(session);
    return;
  }
  await updateSession(session.id, {
    state: "AWAITING_PHOTOS",
    replacing_slot: slot,
    retry_count: 0,
    ack_due_at: null,
  });
  await send(session, t(session, "send_replacement", { slot }));
}
