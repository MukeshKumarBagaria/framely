// Template JSON contract — PRD §6 "Template Document Specification (JSON schema v1)".
// This is a ❄ CONTRACT per the PRD: geometry is pixels at print resolution in trim
// space (origin top-left of trim area). Bleed extends outward; only layers with
// `bleed: true` may draw past the trim edges.
import { z } from "zod";

const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color");

const layerId = z.string().regex(/^[a-z0-9-]{1,32}$/);

const fieldKey = z.string().regex(/^[a-z][a-z0-9_]{0,23}$/);

const layerCommon = z.object({
  id: layerId,
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
  kind: z.enum(["rect", "ellipse", "line"]),
  w: z.number().positive(),
  h: z.number().positive(),
  fill: z.union([hexColor, z.literal("none")]).default("none"),
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
  w: z.number().positive(),
  h: z.number().positive(),
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(1).max(12), // 1 = January
  // Optional override; when absent the renderer derives the month name from
  // `month` (so the date-of-birth picker updates it automatically).
  title: z.string().optional(),
  weekdayLabels: z.array(z.string()).length(7).default(["S", "M", "T", "W", "T", "F", "S"]),
  highlightDay: z.number().int().min(1).max(31).optional(),
  font: z.string(), // grid (weekday letters + date numbers)
  titleFont: z.string(), // the month label — usually a script face
  titleSizePx: z.number().positive(),
  headerSizePx: z.number().positive(),
  cellSizePx: z.number().positive(),
  color: hexColor, // date numbers
  titleColor: hexColor,
  headerColor: hexColor,
  heartColor: hexColor.default("#E23B3B"),
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
