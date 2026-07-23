// Template JSON contract — PRD §6 "Template Document Specification (JSON schema v1)".
// This is a ❄ CONTRACT per the PRD: geometry is pixels at print resolution in trim
// space (origin top-left of trim area). Bleed extends outward; only layers with
// `bleed: true` may draw past the trim edges.
import { z } from "zod";

const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color");

// Same, but the 4-/8-digit alpha forms are allowed too. Only used where a
// colour must be able to fade to nothing (gradient stops) — the plain-colour
// fields stay strict so an `<input type="color">` can always round-trip them.
const hexColorAlpha = z
  .string()
  .regex(/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "must be a hex color, optionally with alpha");

const layerId = z.string().regex(/^[a-z0-9-]{1,32}$/);

const fieldKey = z.string().regex(/^[a-z][a-z0-9_]{0,23}$/);

const layerCommon = z.object({
  id: layerId,
  // Human-readable name for this layer. Purely presentational: the customizer
  // uses it to label per-layer controls (e.g. the accent-colour pickers)
  // instead of showing a raw layer id.
  label: z.string().max(40).optional(),
  x: z.number(),
  y: z.number(),
  rotation: z.number().min(-180).max(180).default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  bleed: z.boolean().default(false),
});

const imageSrc = z.string().refine(
  (v) => v.startsWith("asset://") || v.startsWith("https://") || v.startsWith("/"),
  "src must be asset://{uuid}, an https platform-CDN url, or a local /public path (dev only)"
);

export const imageLayerSchema = layerCommon.extend({
  type: z.literal("image"),
  src: imageSrc,
  role: z.enum(["background", "overlay", "sticker"]),
  w: z.number().positive(),
  h: z.number().positive(),
  fit: z.enum(["cover", "contain"]).default("cover"),
});

export const photoSlotLayerSchema = layerCommon.extend({
  type: z.literal("photoSlot"),
  w: z.number().min(200),
  h: z.number().min(200),
  shape: z.enum(["rect", "rounded", "circle", "heart"]).default("rect"),
  cornerRadius: z.number().min(0).optional(),
  fit: z.literal("cover").default("cover"),
  focal: z.enum(["faces", "center"]).default("faces"),
  // How the photo sits inside the frame (PRD §7.1 crop model). Baseline is a
  // cover-fit; `scale` ≥ 1 zooms in on that, and offsetX/offsetY ∈ [-1,1] pan
  // the visible window within the leftover range (0 = centred). Resolution
  // independent, so the on-screen crop reproduces exactly in the print render.
  crop: z
    .object({
      scale: z.number().min(1).max(5).default(1),
      offsetX: z.number().min(-1).max(1).default(0),
      offsetY: z.number().min(-1).max(1).default(0),
    })
    .optional(),
  border: z
    .object({
      width: z.number().min(0).max(120),
      color: hexColor,
    })
    .optional(),
});

export const textLayerSchema = layerCommon
  .extend({
    type: z.literal("text"),
    binds: fieldKey.optional(),
    text: z.string().optional(),
    font: z.string(),
    weight: z.number().min(100).max(900).default(400),
    sizePx: z.number().min(24).max(600),
    color: hexColor,
    align: z.enum(["left", "center", "right"]).default("left"),
    w: z.number().positive(),
    // Raised from the PRD §6.5 cap of 6 — a long message/letter block (e.g. a
    // birthday note) is a legitimate text layer and needs more wrap lines.
    maxLines: z.number().min(1).max(24).default(1),
    lineHeight: z.number().min(0.8).max(2).default(1.2),
    letterSpacing: z.number().min(-5).max(50).default(0),
    autoFit: z.boolean().default(false),
    italic: z.boolean().default(false),
  })
  .refine((l) => (l.binds ? !l.text : !!l.text), {
    message: "text layer must set exactly one of `binds` or `text`",
  });

export const shapeLayerSchema = layerCommon.extend({
  type: z.literal("shape"),
  // "ribbon" is a name-plate banner: a horizontal band with a V-notch cut into
  // each end (the classic pennant/award look).
  kind: z.enum(["rect", "ellipse", "line", "ribbon"]),
  w: z.number().positive(),
  h: z.number().positive(),
  cornerRadius: z.number().min(0).optional(), // rect only
  // Depth of the ribbon's end notches, in px. Defaults to h/2 (a 45° cut).
  notch: z.number().min(0).optional(), // ribbon only
  fill: z.union([hexColor, z.literal("none")]).default("none"),
  // Vertical/horizontal two-stop gradient. Takes precedence over `fill` when
  // present. Stops accept alpha, so a shape can fade to nothing — that's how a
  // photo is blended into the page background behind a block of text.
  fillGradient: z
    .object({
      from: hexColorAlpha,
      to: hexColorAlpha,
      direction: z.enum(["vertical", "horizontal"]).default("vertical"),
    })
    .optional(),
  stroke: z
    .object({
      width: z.number().positive(),
      color: hexColor,
      dash: z.array(z.number()).optional(),
    })
    .optional(),
});

// A month calendar laid out on a 7-column grid within [w × h]. The renderer
// computes the real weekday layout from `year`+`month`, so columns always
// line up and dates are correct — no per-cell layers to hand-place. A heart is
// drawn on `highlightDay` (a birthday, anniversary…). At runtime the customer's
// date-of-birth picker overrides year/month/highlightDay via applyAdjustments.
export const calendarLayerSchema = layerCommon.extend({
  type: z.literal("calendar"),
  // Presentation:
  //   "grid" — a full month grid, heart on `highlightDay`
  //   "day"  — a tear-off day card: month label above a large day number
  // Both read the same year/month/highlightDay, so one date-of-birth picker
  // drives either style.
  variant: z.enum(["grid", "day"]).default("grid"),
  w: z.number().positive(),
  h: z.number().positive(),
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(1).max(12), // 1 = January
  // Optional override; when absent the renderer derives the month name from
  // `month` (so the date-of-birth picker updates it automatically).
  title: z.string().optional(),
  // Use the 3-letter month ("Feb" rather than "February"). Composes with
  // titleUppercase — set both for the poster-style "FEB".
  titleAbbrev: z.boolean().default(false),
  titleUppercase: z.boolean().default(false),
  weekdayLabels: z.array(z.string()).length(7).default(["S", "M", "T", "W", "T", "F", "S"]),
  highlightDay: z.number().int().min(1).max(31).optional(),
  // How `highlightDay` is marked in the "grid" variant:
  //   "heart"    — the heart glyph replaces the date number
  //   "heartDay" — the date number is drawn *on top of* the heart
  //   "circle"   — a filled disc behind the date number
  highlightStyle: z.enum(["heart", "heartDay", "circle"]).default("heart"),
  font: z.string(), // grid dates ("grid") / the big day number ("day")
  titleFont: z.string(), // the month label — a script face in "grid", a sans in "day"
  titleSizePx: z.number().positive(),
  // "day" variant: explicit height of the month-label band, so the text can be
  // aligned to a background artwork's header instead of being derived from the
  // font size. Falls back to titleSizePx * 2.2.
  titleBandPx: z.number().positive().optional(),
  headerSizePx: z.number().positive(), // weekday letters ("grid" only)
  cellSizePx: z.number().positive(), // date cell size ("grid") / day-number size ("day")
  // Per-role weights, so a bold month label can sit over bold weekday letters
  // and regular date numbers without needing three separate font families.
  titleWeight: z.number().min(100).max(900).default(400),
  headerWeight: z.number().min(100).max(900).default(400),
  weight: z.number().min(100).max(900).default(400), // date numbers
  color: hexColor, // date numbers
  titleColor: hexColor,
  headerColor: hexColor,
  heartColor: hexColor.default("#E23B3B"),
  // Colour of the date number when it's drawn over the heart/disc.
  highlightTextColor: hexColor.default("#FFFFFF"),
});

export const layerSchema = z.discriminatedUnion("type", [
  imageLayerSchema,
  photoSlotLayerSchema,
  textLayerSchema,
  shapeLayerSchema,
  calendarLayerSchema,
]);

export const fieldSchema = z.object({
  key: fieldKey,
  label: z.string(),
  type: z.literal("text"),
  // Raised from the PRD §6.3 cap of 80 — short fields (names, dates) still stay
  // small via their own maxLen, but a message/letter field needs real room.
  maxLen: z.number().min(1).max(500),
  required: z.boolean().default(false),
  default: z.string().default(""),
});

export const templateSchema = z
  .object({
    schema: z.literal(1),
    meta: z.object({
      name: z.string().min(2).max(80),
      occasion: z.array(z.string()),
    }),
    canvas: z.object({
      widthMm: z.number().positive(),
      heightMm: z.number().positive(),
      dpi: z.number().min(150).max(600),
      bleedMm: z.number().min(0),
      widthPx: z.number().int().positive(),
      heightPx: z.number().int().positive(),
      background: hexColor,
    }),
    inputs: z.object({
      photos: z
        .object({ min: z.number().int().positive(), max: z.number().int().positive() })
        .refine((p) => p.min === p.max, "v1 rule: inputs.photos.min must equal max"),
      fields: z.array(fieldSchema),
    }),
    layers: z.array(layerSchema).min(1).max(60),
  })
  .superRefine((doc, ctx) => {
    const ids = new Set<string>();
    for (const layer of doc.layers) {
      if (ids.has(layer.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate layer id "${layer.id}"`, path: ["layers"] });
      }
      ids.add(layer.id);
    }

    const fieldKeys = new Set(doc.inputs.fields.map((f) => f.key));
    if (fieldKeys.size !== doc.inputs.fields.length) {
      ctx.addIssue({ code: "custom", message: "duplicate field keys in inputs.fields", path: ["inputs", "fields"] });
    }
    for (const layer of doc.layers) {
      if (layer.type === "text" && layer.binds && !fieldKeys.has(layer.binds)) {
        ctx.addIssue({
          code: "custom",
          message: `text layer "${layer.id}" binds to missing field "${layer.binds}"`,
          path: ["layers"],
        });
      }
    }

    const slotCount = doc.layers.filter((l) => l.type === "photoSlot").length;
    if (slotCount < 1) {
      ctx.addIssue({ code: "custom", message: "template needs at least 1 photoSlot layer", path: ["layers"] });
    }
    if (doc.inputs.photos.min !== slotCount) {
      ctx.addIssue({
        code: "custom",
        message: `inputs.photos.min/max (${doc.inputs.photos.min}) must equal the photoSlot count (${slotCount})`,
        path: ["inputs", "photos"],
      });
    }
  });

export type TemplateDoc = z.infer<typeof templateSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type PhotoSlotLayer = z.infer<typeof photoSlotLayerSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type ShapeLayer = z.infer<typeof shapeLayerSchema>;
export type CalendarLayer = z.infer<typeof calendarLayerSchema>;
export type Field = z.infer<typeof fieldSchema>;

export function parseTemplate(doc: unknown): TemplateDoc {
  return templateSchema.parse(doc);
}
