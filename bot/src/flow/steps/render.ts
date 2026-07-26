// Step 6 of §8.2 — render and preview.
//
// Version numbering follows §20.2's drill exactly: the first render is v1 with
// revision_count 0; "change photo, change text, approve" ends at v3 with
// revision_count 2. `current_render` is what tells us whether a render has ever
// happened, so the two counters can't drift apart.
import { logger } from "../../logger.ts";
import { t } from "../../i18n/index.ts";
import { photoPaths } from "../../media/photos.ts";
import { appendTimeline, readFile, writeMeta } from "../../media/storage.ts";
import { defaultOutputs, lowDpiWarnings, render, type RenderWarning } from "../../render/client.ts";
import { getDesign, rendererKey } from "../designs.ts";
import { escalateToHuman } from "../human.ts";
import { send, sendButtons, sendDocumentBuffer, sendImageBuffer } from "../send.ts";
import { updateSession, type Session } from "../sessions.ts";

export function rendersDone(session: Pick<Session, "current_render" | "revision_count">): number {
  return session.current_render ? session.revision_count + 1 : 0;
}

export function nextRenderNumber(session: Pick<Session, "current_render" | "revision_count">): number {
  return rendersDone(session) + 1;
}

export async function startRender(session: Session): Promise<void> {
  if (!session.template_id || !session.folder_path) {
    await escalateToHuman(session, "unknown_state");
    return;
  }

  const design = await getDesign(session.template_id);
  if (!design) {
    await escalateToHuman(session, "no_designs");
    return;
  }

  const revision = nextRenderNumber(session);

  await updateSession(session.id, { state: "RENDERING", ack_due_at: null });
  await send(session, t(session, "rendering"));

  const photos = await photoPaths(session.id, design.photos_needed);

  let result;
  try {
    result = await render({
      sessionId: session.id,
      designId: rendererKey(design),
      folder: session.folder_path,
      photos,
      fields: session.field_values ?? {},
      outputs: defaultOutputs(),
      revision,
      ...(session.photo_layout_id ? { photoLayoutId: session.photo_layout_id } : {}),
    });
  } catch (err) {
    // §12.4 / §19 E8 — never show the customer an error.
    logger.error({ err, sessionId: session.id }, "render failed");
    await send(session, t(session, "render_failed"));
    await escalateToHuman(session, "render_failed", { notifyCustomer: false });
    return;
  }

  const warnings = result.warnings ?? [];
  const updated = await updateSession(session.id, {
    current_render: result.preview,
    current_print: result.print,
    revision_count: revision > 1 ? revision - 1 : session.revision_count,
    render_warnings: warnings,
    state: "AWAITING_APPROVAL",
    retry_count: 0,
  });

  await appendTimeline(session.folder_path, `render_v${revision}`, {
    preview: result.preview,
    print: result.print,
    warnings: warnings.length,
  });
  await writeMeta(session.folder_path, {
    session_id: session.id,
    phone: session.phone_e164,
    design_id: design.id,
    fields: session.field_values ?? {},
    photos,
    revisions: updated.revision_count,
    approved_render: result.preview,
    final_file: result.print,
  });

  await sendPreview(updated, result.preview, result.print, warnings);
}

/**
 * §19 E9 — if the preview upload keeps failing, fall back to sending the print
 * PDF as a document. A customer who can see *something* can still approve.
 */
export async function sendPreview(
  session: Session,
  previewPath: string,
  printPath: string | undefined,
  warnings: RenderWarning[]
): Promise<void> {
  if (!session.folder_path) return;

  let sent = false;
  for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
    try {
      const buf = await readFile(session.folder_path, previewPath);
      await sendImageBuffer(session, buf, "image/png", "preview.png", t(session, "preview_caption"));
      sent = true;
    } catch (err) {
      logger.warn({ err, sessionId: session.id, attempt }, "preview send failed");
    }
  }

  if (!sent && printPath) {
    try {
      const pdf = await readFile(session.folder_path, printPath);
      await sendDocumentBuffer(session, pdf, "application/pdf", "your-frame.pdf", t(session, "preview_caption"));
      sent = true;
    } catch (err) {
      logger.error({ err, sessionId: session.id }, "print fallback failed too");
    }
  }

  if (!sent) {
    await send(session, t(session, "render_failed"));
    await escalateToHuman(session, "render_failed", { notifyCustomer: false });
    return;
  }

  const lowDpi = lowDpiWarnings(warnings);
  const firstLowDpi = lowDpi[0];
  if (firstLowDpi?.slot) {
    // §12.3 — surface quality problems *before* approval. This is the cheapest
    // refund prevention in the whole flow.
    await sendButtons(session, {
      body: t(session, "low_dpi_warning", { slot: firstLowDpi.slot }),
      buttons: [
        { id: `replace_${firstLowDpi.slot}`, title: t(session, "btn_replace_photo", { slot: firstLowDpi.slot }) },
        { id: "dpi_ok", title: t(session, "btn_photo_fine") },
      ],
    });
    return;
  }

  await sendApprovalButtons(session);
}

export async function sendApprovalButtons(session: Session): Promise<void> {
  await sendButtons(session, {
    body: t(session, "preview_question"),
    buttons: [
      { id: "approve", title: t(session, "btn_approve") },
      { id: "change_photo", title: t(session, "btn_change_photo") },
      { id: "change_text", title: t(session, "btn_change_text") },
    ],
  });
}

/** Used when a customer replies with something unparseable at AWAITING_APPROVAL. */
export async function resendPreview(session: Session): Promise<void> {
  if (session.current_render && session.folder_path) {
    await sendPreview(session, session.current_render, undefined, []);
    return;
  }
  await sendApprovalButtons(session);
}
