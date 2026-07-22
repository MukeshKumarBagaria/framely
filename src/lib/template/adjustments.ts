// Customer-side, per-session customizations that any template supports without
// re-authoring it. This is deliberately generic: it operates on layer *types*,
// not on a specific template, so every present and future template gets these
// controls for free.
//
//   • layerOffsets     — nudge any element (fix "the ring sits a bit off")
//   • photoCornerRadius — round every photo slot's corners at once
//   • dob              — drive every calendar layer (month/year/heart day)
//
// Offsets live in the *base* (unscaled) template coordinate space, so they
// survive a resize: applyAdjustments runs on the base doc, then scaleTemplateDoc
// scales the result — offsets scale along with everything else.
import type { TemplateDoc } from "./schema";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type LayerOffset = { dx: number; dy: number };

export type DOB = { year: number; month: number; day: number }; // month 1-12

export type Adjustments = {
  layerOffsets: Record<string, LayerOffset>;
  photoCornerRadius: number; // base-doc px; 0 = square corners
  dob: DOB | null; // null when a template has no calendar
  textScale: Record<string, number>; // field key → font-size multiplier (default 1)
};

export function defaultAdjustments(doc: TemplateDoc): Adjustments {
  const calendar = doc.layers.find((l) => l.type === "calendar");
  const dob =
    calendar && calendar.type === "calendar"
      ? { year: calendar.year, month: calendar.month, day: calendar.highlightDay ?? 1 }
      : null;
  return { layerOffsets: {}, photoCornerRadius: 0, dob, textScale: {} };
}

// Field keys whose text can be resized (those a text layer binds to).
export function resizableFieldKeys(doc: TemplateDoc): Set<string> {
  const keys = new Set<string>();
  for (const layer of doc.layers) {
    if (layer.type === "text" && layer.binds) keys.add(layer.binds);
  }
  return keys;
}

// Pure: returns a new doc with the customizations baked in. Does NOT apply
// layerOffsets (those are applied as live, draggable transforms in the canvas
// so dragging stays smooth) — it only bakes the value-based customizations that
// must also be present in the exported print file.
export function applyAdjustments(doc: TemplateDoc, adj: Adjustments): TemplateDoc {
  return {
    ...doc,
    layers: doc.layers.map((layer) => {
      if (layer.type === "photoSlot" && adj.photoCornerRadius > 0) {
        const maxRadius = Math.min(layer.w, layer.h) / 2;
        return {
          ...layer,
          shape: "rounded" as const,
          cornerRadius: Math.min(adj.photoCornerRadius, maxRadius),
        };
      }
      if (layer.type === "calendar" && adj.dob) {
        return {
          ...layer,
          year: adj.dob.year,
          month: adj.dob.month,
          highlightDay: adj.dob.day,
          title: MONTH_NAMES[adj.dob.month - 1],
        };
      }
      if (layer.type === "text" && layer.binds) {
        const factor = adj.textScale[layer.binds];
        if (factor && factor !== 1) {
          return { ...layer, sizePx: Math.max(8, Math.min(600, layer.sizePx * factor)) };
        }
      }
      return layer;
    }),
  };
}

// Largest useful corner radius for a template's photo slots (half the shortest
// side of the smallest slot), so the slider can't exceed a full pill.
export function maxPhotoCornerRadius(doc: TemplateDoc): number {
  const slots = doc.layers.filter((l) => l.type === "photoSlot");
  if (slots.length === 0) return 0;
  return Math.min(...slots.map((s) => (s.type === "photoSlot" ? Math.min(s.w, s.h) / 2 : Infinity)));
}
