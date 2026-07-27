// Customer-side, per-session customizations that any template supports without
// re-authoring it. This is deliberately generic: it operates on layer *types*,
// not on a specific template, so every present and future template gets these
// controls for free.
//
//   • layerOffsets      — nudge any element (fix "the ring sits a bit off")
//   • photoCornerRadius — round every photo slot's corners at once
//   • photoBorder       — restyle the photo frames (width + colour)
//   • dob               — drive every calendar layer (month/year/heart day)
//   • textScale         — resize any bound text
//   • textColors        — recolour any bound text
//   • accentColors      — recolour decorative shapes and static text (hearts,
//                         rules, name banners…)
//   • calendarColors    — recolour each part of a calendar independently
//   • background        — recolour the page itself
//
// Offsets live in the *base* (unscaled) template coordinate space, so they
// survive a resize: applyAdjustments runs on the base doc, then scaleTemplateDoc
// scales the result — offsets scale along with everything else.
import type { TemplateDoc, Layer, PhotoSlotLayer, Field } from "./schema";

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

export const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type LayerOffset = { dx: number; dy: number };

export type DOB = { year: number; month: number; day: number }; // month 1-12

// The independently recolourable parts of a calendar layer.
export type CalendarColorRole = "title" | "header" | "date" | "heart" | "highlightText";

export const CALENDAR_COLOR_ROLES: { role: CalendarColorRole; label: string }[] = [
  { role: "title", label: "Month" },
  { role: "header", label: "Weekdays" },
  { role: "date", label: "Dates" },
  { role: "heart", label: "Heart" },
  { role: "highlightText", label: "Heart number" },
];

export type PhotoBorder = { width: number; color: string };

// How one photo sits inside its frame — see PRD §7.1 / photoSlot.crop.
export type PhotoCrop = { scale: number; offsetX: number; offsetY: number };

export const DEFAULT_CROP: PhotoCrop = { scale: 1, offsetX: 0, offsetY: 0 };

export type Adjustments = {
  layerOffsets: Record<string, LayerOffset>;
  photoLayoutId: string | null; // null = the template's default arrangement
  photoCornerRadius: number; // base-doc px; 0 = square corners
  photoBorder: PhotoBorder | null; // null = keep each slot's authored border
  photoCrops: Record<string, PhotoCrop>; // slot id → zoom/pan inside the frame
  dob: DOB | null; // null when a template has no calendar
  textScale: Record<string, number>; // field key → font-size multiplier (default 1)
  textColors: Record<string, string>; // field key → hex override
  textFonts: Record<string, string>; // field key → font-family override
  accentColors: Record<string, string>; // layer id → hex override
  calendarColors: Partial<Record<CalendarColorRole, string>>;
  layerScales: Record<string, number>; // layer id → uniform size multiplier (default 1)
  background: string | null; // canvas background override
  // A tiny order/batch reference (e.g. a Meesho order id) printed in a corner
  // so a merchant can tell one printed sheet from another. Empty = not shown.
  orderId: string;
  orderIdCorner: OrderIdCorner;
  // "auto" picks black or white to contrast the page background; otherwise a hex.
  orderIdColor: string;
};

export type OrderIdCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export const ORDER_ID_CORNERS: { value: OrderIdCorner; label: string }[] = [
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "top-right", label: "Top right" },
  { value: "top-left", label: "Top left" },
];

export function defaultAdjustments(doc: TemplateDoc): Adjustments {
  const calendar = doc.layers.find((l) => l.type === "calendar");
  const dob =
    calendar && calendar.type === "calendar"
      ? { year: calendar.year, month: calendar.month, day: calendar.highlightDay ?? 1 }
      : null;
  return {
    layerOffsets: {},
    photoLayoutId: null,
    photoCornerRadius: 0,
    photoBorder: null,
    photoCrops: {},
    dob,
    textScale: {},
    textColors: {},
    textFonts: {},
    accentColors: {},
    calendarColors: {},
    layerScales: {},
    background: null,
    orderId: "",
    orderIdCorner: "bottom-right",
    orderIdColor: "auto",
  };
}

// Font families available to the typography picker. Each must also be loaded in
// the document (see the Google Fonts link in app/layout.tsx) and registered in
// the canvas's FONT_FAMILIES list, or it won't paint.
export const FONT_CHOICES: { value: string; label: string }[] = [
  { value: "Inter", label: "Inter (sans)" },
  { value: "Playfair Display", label: "Playfair Display (serif)" },
  { value: "Great Vibes", label: "Great Vibes (script)" },
  { value: "Pinyon Script", label: "Pinyon Script (script)" },
  { value: "Kaushan Script", label: "Kaushan Script (brush)" },
];

// The template's own font for each bound field, so the picker opens on the real
// starting family and "reset" returns to the design's intent.
export function textFontDefaults(doc: TemplateDoc): Record<string, string> {
  const out: Record<string, string> = {};
  for (const layer of doc.layers) {
    if (layer.type === "text" && layer.binds && !(layer.binds in out)) {
      out[layer.binds] = layer.font;
    }
  }
  return out;
}

// Field keys whose text can be resized/recoloured (those a text layer binds to).
export function resizableFieldKeys(doc: TemplateDoc): Set<string> {
  const keys = new Set<string>();
  for (const layer of doc.layers) {
    if (layer.type === "text" && layer.binds) keys.add(layer.binds);
  }
  return keys;
}

// The template's own colour for each bound field, so a colour picker opens
// showing the real starting colour instead of an arbitrary default.
export function textColorDefaults(doc: TemplateDoc): Record<string, string> {
  const out: Record<string, string> = {};
  for (const layer of doc.layers) {
    if (layer.type === "text" && layer.binds && !(layer.binds in out)) {
      out[layer.binds] = layer.color;
    }
  }
  return out;
}

// Decorative layers a customer can recolour individually: filled shapes and
// static (unbound) text such as heart glyphs. Layers opt in by carrying a
// `label` — that keeps incidental structural shapes out of the UI and gives
// each control a human-readable name.
export type AccentLayer = { id: string; label: string; color: string };

export function accentLayers(doc: TemplateDoc): AccentLayer[] {
  const out: AccentLayer[] = [];
  for (const layer of doc.layers) {
    if (!layer.label) continue;
    if (layer.type === "shape" && layer.fill !== "none") {
      out.push({ id: layer.id, label: layer.label, color: layer.fill });
    } else if (layer.type === "shape" && layer.stroke) {
      out.push({ id: layer.id, label: layer.label, color: layer.stroke.color });
    } else if (layer.type === "text" && !layer.binds) {
      out.push({ id: layer.id, label: layer.label, color: layer.color });
    }
  }
  return out;
}

export function calendarColorDefaults(doc: TemplateDoc): Partial<Record<CalendarColorRole, string>> {
  const calendar = doc.layers.find((l) => l.type === "calendar");
  if (!calendar || calendar.type !== "calendar") return {};
  return {
    title: calendar.titleColor,
    header: calendar.headerColor,
    date: calendar.color,
    heart: calendar.heartColor,
    highlightText: calendar.highlightTextColor,
  };
}

// The authored photo-frame border, if the template has one. Only slots that
// already carry a border are restyled, so a borderless hero shot stays
// borderless while the framed collage cards stay editable.
export function photoBorderDefault(doc: TemplateDoc): PhotoBorder | null {
  for (const layer of doc.layers) {
    if (layer.type === "photoSlot" && layer.border) return { ...layer.border };
  }
  return null;
}

// Largest useful corner radius for a template's photo slots (half the shortest
// side of the smallest slot), so the slider can't exceed a full pill.
export function maxPhotoCornerRadius(doc: TemplateDoc): number {
  const slots = doc.layers.filter((l) => l.type === "photoSlot");
  if (slots.length === 0) return 0;
  return Math.min(...slots.map((s) => (s.type === "photoSlot" ? Math.min(s.w, s.h) / 2 : Infinity)));
}

// Uniformly scale a layer's geometry around its own centre. The factor is the
// layerScales override (default 1). Each type scales its relevant size fields
// and recentres x/y so the element grows outward from its midpoint.
function scaleLayerGeometry(layer: Layer, factor: number): Layer {
  if (!factor || factor === 1) return layer;

  switch (layer.type) {
    case "image": {
      const nw = Math.max(1, layer.w * factor);
      const nh = Math.max(1, layer.h * factor);
      return {
        ...layer,
        x: layer.x - (nw - layer.w) / 2,
        y: layer.y - (nh - layer.h) / 2,
        w: nw,
        h: nh,
      };
    }
    case "photoSlot": {
      const nw = Math.max(200, layer.w * factor);
      const nh = Math.max(200, layer.h * factor);
      return {
        ...layer,
        x: layer.x - (nw - layer.w) / 2,
        y: layer.y - (nh - layer.h) / 2,
        w: nw,
        h: nh,
        cornerRadius: layer.cornerRadius !== undefined ? layer.cornerRadius * factor : undefined,
        border: layer.border
          ? { ...layer.border, width: Math.max(0, layer.border.width * factor) }
          : undefined,
      };
    }
    case "text": {
      const nw = Math.max(1, layer.w * factor);
      return {
        ...layer,
        x: layer.x - (nw - layer.w) / 2,
        w: nw,
        sizePx: Math.max(8, Math.min(600, layer.sizePx * factor)),
        letterSpacing: layer.letterSpacing * factor,
      };
    }
    case "shape": {
      const nw = Math.max(1, layer.w * factor);
      const nh = Math.max(1, layer.h * factor);
      return {
        ...layer,
        x: layer.x - (nw - layer.w) / 2,
        y: layer.y - (nh - layer.h) / 2,
        w: nw,
        h: nh,
        cornerRadius: layer.cornerRadius !== undefined ? layer.cornerRadius * factor : undefined,
        stroke: layer.stroke
          ? { ...layer.stroke, width: Math.max(0.5, layer.stroke.width * factor) }
          : undefined,
      };
    }
    case "calendar": {
      const nw = Math.max(1, layer.w * factor);
      const nh = Math.max(1, layer.h * factor);
      return {
        ...layer,
        x: layer.x - (nw - layer.w) / 2,
        y: layer.y - (nh - layer.h) / 2,
        w: nw,
        h: nh,
        titleSizePx: Math.max(4, layer.titleSizePx * factor),
        headerSizePx: Math.max(4, layer.headerSizePx * factor),
        cellSizePx: Math.max(4, layer.cellSizePx * factor),
        titleBandPx: layer.titleBandPx !== undefined ? layer.titleBandPx * factor : undefined,
      };
    }
  }
}

function adjustLayer(layer: Layer, adj: Adjustments): Layer {
  // Apply the per-layer uniform scale first so that subsequent adjustments
  // (border restyling, colour overrides, etc.) operate on the already-scaled
  // geometry — matching what the user sees on the canvas.
  const scaleFactor = adj.layerScales[layer.id];
  const scaled = scaleLayerGeometry(layer, scaleFactor ?? 1);

  switch (scaled.type) {
    case "photoSlot": {
      let next = scaled;
      if (adj.photoCornerRadius > 0) {
        const maxRadius = Math.min(next.w, next.h) / 2;
        next = {
          ...next,
          shape: "rounded" as const,
          cornerRadius: Math.min(adj.photoCornerRadius, maxRadius),
        };
      }
      // Only restyle slots the template already framed — see photoBorderDefault.
      // Check the original (pre-scale) layer; `scaled` is already narrowed to
      // PhotoSlotLayer but `layer` is a union, so cast here for the border test.
      const origSlot = layer as typeof next;
      if (adj.photoBorder && origSlot.border) {
        next =
          adj.photoBorder.width > 0
            ? { ...next, border: { ...adj.photoBorder } }
            : { ...next, border: undefined };
      }
      const crop = adj.photoCrops[layer.id];
      if (crop) next = { ...next, crop };
      return next;
    }

    case "calendar": {
      let next = scaled;
      if (adj.dob) {
        next = {
          ...next,
          year: adj.dob.year,
          month: adj.dob.month,
          highlightDay: adj.dob.day,
          // Cleared rather than set: the renderer re-derives the label from the
          // new month, so titleAbbrev/titleUppercase still apply ("FEB", not
          // "February"). An authored custom title is stale once the month moves.
          title: undefined,
        };
      }
      const c = adj.calendarColors;
      if (c.title || c.header || c.date || c.heart || c.highlightText) {
        next = {
          ...next,
          titleColor: c.title ?? next.titleColor,
          headerColor: c.header ?? next.headerColor,
          color: c.date ?? next.color,
          heartColor: c.heart ?? next.heartColor,
          highlightTextColor: c.highlightText ?? next.highlightTextColor,
        };
      }
      return next;
    }

    case "text": {
      let next = scaled;
      if (layer.type === "text" && layer.binds) {
        const factor = adj.textScale[layer.binds];
        if (factor && factor !== 1) {
          next = { ...next, sizePx: Math.max(8, Math.min(600, next.sizePx * factor)) };
        }
        const color = adj.textColors[layer.binds];
        if (color) next = { ...next, color };
        const font = adj.textFonts[layer.binds];
        if (font) next = { ...next, font };
      } else {
        const color = adj.accentColors[layer.id];
        if (color) next = { ...next, color };
      }
      return next;
    }

    case "shape": {
      let next = scaled;
      const color = adj.accentColors[layer.id];
      if (!color) return next;
      // Recolour whichever channel the shape actually draws with: a filled
      // banner takes a new fill, a hairline rule takes a new stroke.
      if (next.fill !== "none") return { ...next, fill: color };
      if (next.stroke) return { ...next, stroke: { ...next.stroke, color } };
      return next;
    }

    default:
      return scaled;
  }
}

// --- photo layout variants -------------------------------------------------

// Helper to auto-generate fewer-photo layouts by merging adjacent slots
function generateMergedSlots(slots: PhotoSlotLayer[]): PhotoSlotLayer[] {
  const pairs: [number, number][] = [];
  const used = new Set<number>();
  for (let i = 0; i < slots.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < slots.length; j++) {
      if (used.has(j)) continue;
      const a = slots[i];
      const b = slots[j];
      const sameY = Math.abs(a.y - b.y) < 20 && Math.abs(a.h - b.h) < 20;
      const adjacentX = Math.abs((a.x + a.w) - b.x) < 200 || Math.abs((b.x + b.w) - a.x) < 200;
      const sameX = Math.abs(a.x - b.x) < 20 && Math.abs(a.w - b.w) < 20;
      const adjacentY = Math.abs((a.y + a.h) - b.y) < 200 || Math.abs((b.y + b.h) - a.y) < 200;

      if ((sameY && adjacentX) || (sameX && adjacentY)) {
        pairs.push([i, j]);
        used.add(i);
        used.add(j);
        break;
      }
    }
  }

  if (pairs.length === 0) return slots;

  const result: PhotoSlotLayer[] = [];
  for (const [i, j] of pairs) {
    const a = slots[i];
    const b = slots[j];
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxX = Math.max(a.x + a.w, b.x + b.w);
    const maxY = Math.max(a.y + a.h, b.y + b.h);
    result.push({
      ...a,
      id: `${a.id}_${b.id}`,
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    });
  }
  for (let i = 0; i < slots.length; i++) {
    if (!used.has(i)) result.push(slots[i]);
  }
  return result;
}

function getAvailableLayouts(doc: TemplateDoc): { id: string; label: string; slots: PhotoSlotLayer[] }[] {
  // If the template has authored layouts, use them.
  if (doc.photoLayouts && doc.photoLayouts.length > 0) {
    return doc.photoLayouts.map((l) => ({ id: l.id, label: l.label, slots: l.slots }));
  }

  // Otherwise, auto-generate by merging adjacent slots
  const defaultSlots = doc.layers.filter((l): l is PhotoSlotLayer => l.type === "photoSlot");
  const layouts: { id: string; label: string; slots: PhotoSlotLayer[] }[] = [];

  let current = defaultSlots;
  for (let step = 1; step <= 3; step++) {
    const merged = generateMergedSlots(current);
    if (merged.length === current.length) break; // no more merges possible

    layouts.push({
      id: `auto-merged-${step}`,
      label: `${merged.length} photos (${step === 1 ? "larger" : step === 2 ? "large" : "extra large"})`,
      slots: merged,
    });
    current = merged;
  }

  return layouts;
}

// The photo slots that render for the current selection: the chosen alternative
// layout, or the template's default (the slots authored in `layers`).
export function activePhotoSlots(doc: TemplateDoc, adj: Adjustments): PhotoSlotLayer[] {
  if (adj.photoLayoutId) {
    const layouts = getAvailableLayouts(doc);
    const layout = layouts.find((l) => l.id === adj.photoLayoutId);
    if (layout) return layout.slots;
  }
  return doc.layers.filter((l): l is PhotoSlotLayer => l.type === "photoSlot");
}

export type PhotoLayoutOption = { id: string | null; label: string; count: number };

// Picker options — auto-generated globally or authored per template.
export function photoLayoutOptions(doc: TemplateDoc): PhotoLayoutOption[] {
  const layouts = getAvailableLayouts(doc);
  if (layouts.length === 0) return [];
  const defaultCount = doc.layers.filter((l) => l.type === "photoSlot").length;
  return [
    { id: null, label: `Default (${defaultCount} photos)`, count: defaultCount },
    ...layouts.map((l) => ({ id: l.id, label: l.label, count: l.slots.length })),
  ];
}

// Replace the run of photoSlot layers with a different set, keeping their
// z-order slot (so decorative layers drawn after the photos stay on top).
function swapPhotoSlots(layers: Layer[], slots: PhotoSlotLayer[]): Layer[] {
  const firstIdx = layers.findIndex((l) => l.type === "photoSlot");
  const kept = layers.filter((l) => l.type !== "photoSlot");
  const insertAt =
    firstIdx < 0 ? kept.length : layers.slice(0, firstIdx).filter((l) => l.type !== "photoSlot").length;
  const result: Layer[] = [...kept];
  result.splice(insertAt, 0, ...slots);
  return result;
}

// Pure: returns a new doc with the customizations baked in. Does NOT apply
// layerOffsets (those are applied as live, draggable transforms in the canvas
// so dragging stays smooth) — it only bakes the value-based customizations that
// must also be present in the exported print file.
export function applyAdjustments(doc: TemplateDoc, adj: Adjustments): TemplateDoc {
  let layers = doc.layers;
  if (adj.photoLayoutId) {
    const layouts = getAvailableLayouts(doc);
    const layout = layouts.find((l) => l.id === adj.photoLayoutId);
    if (layout) layers = swapPhotoSlots(doc.layers, layout.slots);
  }
  return {
    ...doc,
    canvas: adj.background ? { ...doc.canvas, background: adj.background } : doc.canvas,
    layers: layers.map((layer) => adjustLayer(layer, adj)),
  };
}

// ---------------------------------------------------------------------------
// Layers eligible for the "Element sizes" panel: non-locked, visible elements
// that aren't bound text (those already have textScale sliders in the field
// section). Returns a label derived from the layer's own label, the bound
// field's label, or the raw id.
// ---------------------------------------------------------------------------
export type ScalableLayer = { id: string; label: string; type: string };

export function scalableLayers(doc: TemplateDoc): ScalableLayer[] {
  const fieldMap = new Map<string, Field>();
  for (const f of doc.inputs.fields) fieldMap.set(f.key, f);

  const out: ScalableLayer[] = [];
  for (const layer of doc.layers) {
    if (layer.locked) continue;
    if (layer.visible === false) continue;
    // Bound text already has a textScale slider in the field-input section.
    if (layer.type === "text" && layer.binds) continue;

    let label: string;
    if (layer.label) {
      label = layer.label;
    } else {
      // Produce a human-readable fallback from the type + id.
      const typeName = layer.type === "photoSlot" ? "Photo" : layer.type.charAt(0).toUpperCase() + layer.type.slice(1);
      label = `${typeName} (${layer.id})`;
    }
    out.push({ id: layer.id, label, type: layer.type });
  }
  return out;
}
