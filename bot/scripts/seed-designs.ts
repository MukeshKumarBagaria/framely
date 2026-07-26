// Seed the `designs` catalog from the renderer's template folders.
//
// The renderer already stores everything that matters — photo count, field
// definitions, occasions — in src/data/templates/<slug>/template.json. Copying
// it by hand into SQL would guarantee drift, so this reads the source of truth
// and upserts. Re-run it after adding a template; it's idempotent.
//
//   npm run seed
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../src/db/index.ts";
import { logger } from "../src/logger.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(HERE, "..", "..", "src", "data", "templates");

type TemplateDoc = {
  meta: { name: string; occasion: string[] };
  inputs: {
    photos: { min: number; max: number };
    fields: { key: string; label: string; maxLen: number; required?: boolean }[];
  };
};

type Manifest = { id: string; slug: string; productId: string; status: "draft" | "published" };

/**
 * Customer-facing names. Row titles are capped at 24 characters (§9.2) and
 * regional scripts eat that fast, so these are deliberately short. Anything not
 * listed falls back to "<n>-Photo Frame".
 */
const NAMES: Record<string, Record<string, string>> = {
  "PF-000001": { en: "5-Photo Birthday", hi: "5 फोटो जन्मदिन" },
  "PF-000002": { en: "8-Photo Collage", hi: "8 फोटो कोलाज" },
  "PF-000003": { en: "11-Photo Collage", hi: "11 फोटो कोलाज" },
  "PF-000006": { en: "Kids Birthday", hi: "बच्चों का जन्मदिन" },
};

/** Field prompts the customer sees, keyed by the template's field key. */
const FIELD_LABELS: Record<string, Record<string, string>> = {
  name: { en: "the name", hi: "नाम" },
  greeting: { en: "the greeting", hi: "शुभकामना" },
  headline: { en: "the headline", hi: "मुख्य पंक्ति" },
  heading: { en: "the heading", hi: "शीर्षक" },
  message: { en: "your message", hi: "आपका संदेश" },
  label: { en: "the name / relationship", hi: "नाम / रिश्ता" },
  caption: { en: "the caption", hi: "कैप्शन" },
  occasion: { en: "the occasion", hi: "अवसर" },
  emojis: { en: "emojis (optional)", hi: "इमोजी (वैकल्पिक)" },
};

function labelFor(key: string, fallback: string): Record<string, string> {
  return FIELD_LABELS[key] ?? { en: fallback };
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, "utf8")) as T;
}

async function main(): Promise<void> {
  const folders = (await fs.readdir(TEMPLATES_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let inserted = 0;
  let sortOrder = 0;

  for (const folder of folders) {
    const dir = path.join(TEMPLATES_DIR, folder);
    const manifest = await readJson<Manifest>(path.join(dir, "manifest.json"));
    const doc = await readJson<TemplateDoc>(path.join(dir, "template.json"));

    if (manifest.status !== "published") {
      logger.info({ slug: manifest.slug }, "skipping draft template");
      continue;
    }

    const occasions = doc.meta.occasion.length ? doc.meta.occasion : ["other"];
    const photos = doc.inputs.photos.min;

    const fields = doc.inputs.fields.map((f) => ({
      key: f.key,
      label_i18n: labelFor(f.key, f.label),
      maxLen: f.maxLen,
      required: f.required ?? false,
    }));

    for (const occasion of occasions) {
      // One catalog entry per (template, occasion); the renderer key stays the
      // slug (see migration 002).
      const id = occasions.length > 1 ? `${manifest.slug}-${occasion}` : manifest.slug;
      const name = NAMES[manifest.slug] ?? { en: `${photos}-Photo Frame` };

      await query(
        `insert into designs
           (id, occasion, name_i18n, photos_needed, fields, sample_image_url,
            active, sort_order, renderer_template_id)
         values ($1,$2,$3,$4,$5,$6,true,$7,$8)
         on conflict (id) do update set
           occasion = excluded.occasion,
           name_i18n = excluded.name_i18n,
           photos_needed = excluded.photos_needed,
           fields = excluded.fields,
           sample_image_url = excluded.sample_image_url,
           sort_order = excluded.sort_order,
           renderer_template_id = excluded.renderer_template_id`,
        [
          id,
          occasion,
          JSON.stringify(name),
          photos,
          JSON.stringify(fields),
          // Must be publicly reachable HTTPS when sent (§9.4). Relative paths
          // are prefixed with DESIGN_ASSET_BASE_URL at send time.
          `designs/${manifest.slug}.jpg`,
          sortOrder++,
          manifest.slug,
        ]
      );
      inserted++;
      logger.info({ id, occasion, photos, fields: fields.length }, "design upserted");
    }
  }

  logger.info({ designs: inserted }, "seed complete");
  logger.warn(
    "Upload a sample image for each design to DESIGN_ASSET_BASE_URL/designs/<slug>.jpg — " +
      "WhatsApp needs a public HTTPS URL, ≤5 MB, JPEG/PNG (§9.4)."
  );
  await pool.end();
}

main().catch((err) => {
  logger.error({ err }, "seed failed");
  process.exit(1);
});
