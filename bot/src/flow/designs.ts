// The `designs` catalog (§6). "Do not hardcode your 4 templates in the bot.
// Adding template #5 should be one INSERT, not a deploy."
import { query, queryOne } from "../db/index.ts";
import { t, type StringKey } from "../i18n/index.ts";
import type { Lang } from "../whatsapp/types.ts";

export type DesignField = {
  key: string;
  label_i18n: Record<string, string>;
  maxLen: number;
  required?: boolean;
};

export type Design = {
  id: string;
  occasion: string;
  name_i18n: Record<string, string>;
  photos_needed: number;
  fields: DesignField[];
  sample_image_url: string;
  active: boolean;
  sort_order: number;
  /** Null = the catalog id is also the renderer's key (see migration 002). */
  renderer_template_id: string | null;
};

/** What the renderer is actually asked to draw (§12.1 `designId`). */
export function rendererKey(design: Pick<Design, "id" | "renderer_template_id">): string {
  return design.renderer_template_id ?? design.id;
}

export async function listDesigns(occasion: string): Promise<Design[]> {
  const res = await query<Design>(
    `select * from designs where occasion = $1 and active order by sort_order, id`,
    [occasion]
  );
  return res.rows;
}

export async function getDesign(id: string): Promise<Design | null> {
  return queryOne<Design>("select * from designs where id = $1", [id]);
}

export async function listOccasions(): Promise<string[]> {
  const res = await query<{ occasion: string }>(
    "select distinct occasion from designs where active order by occasion"
  );
  return res.rows.map((r) => r.occasion);
}

export function designName(design: Design, lang: Lang | null): string {
  const dict = design.name_i18n ?? {};
  return dict[lang ?? "en"] ?? dict.en ?? design.id;
}

export function fieldLabel(field: DesignField, lang: Lang | null): string {
  const dict = field.label_i18n ?? {};
  return dict[lang ?? "en"] ?? dict.en ?? field.key;
}

/**
 * Occasion keys map to i18n strings by convention (`occ_birthday`), so a new
 * occasion is a DB insert plus one line per language file — and falls back to
 * the raw key rather than breaking the menu if the string is missing.
 */
export function occasionLabel(occasion: string, lang: Lang | null): string {
  const key = `occ_${occasion}` as StringKey;
  const label = t(lang ?? "en", key);
  return label === key ? occasion : label;
}
