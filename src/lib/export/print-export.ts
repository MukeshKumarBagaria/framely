"use client";

// Client-side stand-in for the real print pipeline (Technical Plan §6): the
// actual product renders on a server worker with skia-canvas + pdf-lib and
// sets full MediaBox/TrimBox/BleedBox. Here, with no worker yet, we
// re-rasterize the same Konva scene graph the customer is already looking at
// — same render-core, so preview and "print" file match exactly (the
// parity rule §6 cares about) — and wrap it into a physically-sized PDF with
// pdf-lib, the library the Technical Plan names for this job.
import { PDFDocument } from "pdf-lib";
import type Konva from "konva";
import type { TemplateDoc } from "@/lib/template/schema";

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Re-rasterizes the live stage at full print resolution regardless of
// on-screen display size — Konva redraws the vector/text scene graph at the
// requested pixelRatio rather than upscaling a small bitmap.
function fullResDataUrl(stage: Konva.Stage, doc: TemplateDoc) {
  const pixelRatio = doc.canvas.widthPx / stage.width();
  return stage.toDataURL({ mimeType: "image/png", pixelRatio });
}

const mmToPt = (mm: number) => (mm * 72) / 25.4;

export function downloadPng(stage: Konva.Stage, doc: TemplateDoc, filename: string) {
  triggerDownload(fullResDataUrl(stage, doc), filename);
}

export async function downloadPdf(stage: Konva.Stage, doc: TemplateDoc, filename: string) {
  const dataUrl = fullResDataUrl(stage, doc);
  const pngBytes = await (await fetch(dataUrl)).arrayBuffer();

  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(pngBytes);

  // pdf-lib pages are in points (1/72"); page size = the product's physical
  // trim size (bleed/crop marks are worker-only concerns for now).
  const pageWidth = mmToPt(doc.canvas.widthMm);
  const pageHeight = mmToPt(doc.canvas.heightMm);
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(pngImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function slugifyFilename(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
