// Template resizing: derive a doc for a different physical product size by
// linearly scaling every layer's geometry to the new canvas. This is a
// client-side preview/export convenience, not a merchant re-authoring tool —
// slot IDs and field bindings are untouched, so existing photo assignments
// and field values stay valid across a resize.
//
// Non-uniform per-axis scaling (scaleX may differ from scaleY when the
// target aspect ratio differs, e.g. portrait → square) keeps every layer's
// position/size proportional to the canvas it came from — it's a "stretch to
// fit," not a crop. Good enough for a v1 resize control; a merchant wanting
// pixel-perfect designs per size would still author one template per product
// (the normal PRD model), same as every other layer type in the doc.
import type { TemplateDoc, Layer } from "./schema";
import type { Product } from "./products";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mmToPx(mm: number, dpi: number) {
  return Math.round((mm * dpi) / 25.4);
}

function scaleLayer(layer: Layer, scaleX: number, scaleY: number): Layer {
  const avg = (scaleX + scaleY) / 2;
  const x = layer.x * scaleX;
  const y = layer.y * scaleY;

  switch (layer.type) {
    case "image":
      return { ...layer, x, y, w: Math.max(1, layer.w * scaleX), h: Math.max(1, layer.h * scaleY) };
    case "photoSlot":
      return {
        ...layer,
        x,
        y,
        w: Math.max(1, layer.w * scaleX),
        h: Math.max(1, layer.h * scaleY),
        cornerRadius: layer.cornerRadius !== undefined ? layer.cornerRadius * avg : undefined,
        border: layer.border ? { ...layer.border, width: Math.max(0, layer.border.width * avg) } : undefined,
      };
    case "text":
      return {
        ...layer,
        x,
        y,
        w: Math.max(1, layer.w * scaleX),
        sizePx: clamp(layer.sizePx * avg, 8, 900),
        letterSpacing: layer.letterSpacing * avg,
      };
    case "shape":
      return {
        ...layer,
        x,
        y,
        w: Math.max(1, layer.w * scaleX),
        h: Math.max(1, layer.h * scaleY),
        stroke: layer.stroke ? { ...layer.stroke, width: Math.max(0.5, layer.stroke.width * avg) } : undefined,
      };
    case "calendar":
      return {
        ...layer,
        x,
        y,
        w: Math.max(1, layer.w * scaleX),
        h: Math.max(1, layer.h * scaleY),
        titleSizePx: Math.max(4, layer.titleSizePx * avg),
        headerSizePx: Math.max(4, layer.headerSizePx * avg),
        cellSizePx: Math.max(4, layer.cellSizePx * avg),
      };
  }
}

export function scaleTemplateDoc(doc: TemplateDoc, target: Product): TemplateDoc {
  const widthPx = mmToPx(target.widthMm, target.dpi);
  const heightPx = mmToPx(target.heightMm, target.dpi);
  const scaleX = widthPx / doc.canvas.widthPx;
  const scaleY = heightPx / doc.canvas.heightPx;

  if (scaleX === 1 && scaleY === 1) return doc;

  return {
    ...doc,
    canvas: {
      ...doc.canvas,
      widthMm: target.widthMm,
      heightMm: target.heightMm,
      dpi: target.dpi,
      bleedMm: target.bleedMm,
      widthPx,
      heightPx,
    },
    layers: doc.layers.map((layer) => scaleLayer(layer, scaleX, scaleY)),
  };
}
