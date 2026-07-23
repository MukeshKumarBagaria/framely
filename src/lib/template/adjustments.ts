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
import type { TemplateDoc, Layer } from "./schema";

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
  photoCornerRadius: number; // base-doc px; 0 = square corners
  photoBorder: PhotoBorder | null; // null = keep each slot's authored border
  photoCrops: Record<string, PhotoCrop>; // slot id → zoom/pan inside the frame
  dob: DOB | null; // null when a template has no calendar
  textScale: Record<string, number>; // field key → font-size multiplier (default 1)
  textColors: Record<string, string>; // field key → hex override
  textFonts: Record<string, string>; // field key → font-family override
  accentColors: Record<string, string>; // layer id → hex override
  calendarColors: Partial<Record<CalendarColorRole, string>>;
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
    photoCornerRadius: 0,
    photoBorder: null,
    photoCrops: {},
    dob,
    textScale: {},
    textColors: {},
    textFonts: {},
    accentColors: {},
    calendarColors: {},
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

function adjustLayer(layer: Layer, adj: Adjustments): Layer {
  switch (layer.type) {
    case "photoSlot": {
      let next = layer;
      if (adj.photoCornerRadius > 0) {
        const maxRadius = Math.min(layer.w, layer.h) / 2;
        next = {
          ...next,
          shape: "rounded" as const,
          cornerRadius: Math.min(adj.photoCornerRadius, maxRadius),
        };
      }
      // Only restyle slots the template already framed — see photoBorderDefault.
      if (adj.photoBorder && layer.border) {
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
      let next = layer;
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
      let next = layer;
      if (layer.binds) {
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
      const color = adj.accentColors[layer.id];
      if (!color) return layer;
      // Recolour whichever channel the shape actually draws with: a filled
      // banner takes a new fill, a hairline rule takes a new stroke.
      if (layer.fill !== "none") return { ...layer, fill: color };
      if (layer.stroke) return { ...layer, stroke: { ...layer.stroke, color } };
      return layer;
    }

    default:
      return layer;
  }
}

// Pure: returns a new doc with the customizations baked in. Does NOT apply
// layerOffsets (those are applied as live, draggable transforms in the canvas
// so dragging stays smooth) — it only bakes the value-based customizations that
// must also be present in the exported print file.
export function applyAdjustments(doc: TemplateDoc, adj: Adjustments): TemplateDoc {
  return {
    ...doc,
    canvas: adj.background ? { ...doc.canvas, background: adj.background } : doc.canvas,
    layers: doc.layers.map((layer) => adjustLayer(layer, adj)),
  };
}
