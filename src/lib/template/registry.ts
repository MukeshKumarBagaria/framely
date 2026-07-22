// Template library registry — stands in for the `templates` table (Technical
// Plan §7) until Supabase is wired up. **Server-only** (uses node:fs), which
// is fine because every caller today is a Server Component.
//
// Scalable-by-convention: to add template #2, create a new folder here —
//   src/data/templates/<slug>/manifest.json   { id, slug, productId, status }
//   src/data/templates/<slug>/template.json   the schema-v1 doc (§6)
//   src/data/templates/<slug>/assets/         source files for any asset://
//                                              references (provenance/original
//                                              files — mirrors the `assets`
//                                              table's org-owned rows)
//   public/templates/<slug>/assets/           the browser/worker-servable
//                                              copies those asset:// URLs
//                                              resolve to (mirrors the
//                                              `assets` Storage bucket)
// — and it's picked up automatically, no registry edits required.
import fs from "node:fs";
import path from "node:path";
import { parseTemplate, type TemplateDoc } from "./schema";

const TEMPLATES_DIR = path.join(process.cwd(), "src", "data", "templates");

const manifestSchemaShape = ["id", "slug", "productId", "status"] as const;

export type TemplateManifest = {
  id: string;
  slug: string;
  productId: string;
  status: "draft" | "published";
};

export type TemplateEntry = {
  manifest: TemplateManifest;
  doc: TemplateDoc;
};

function assertManifest(value: unknown, folder: string): TemplateManifest {
  if (typeof value !== "object" || value === null) {
    throw new Error(`templates/${folder}/manifest.json must be an object`);
  }
  for (const key of manifestSchemaShape) {
    if (!(key in value)) {
      throw new Error(`templates/${folder}/manifest.json is missing required field "${key}"`);
    }
  }
  return value as TemplateManifest;
}

function loadTemplateFolder(folder: string): TemplateEntry {
  const dir = path.join(TEMPLATES_DIR, folder);
  const manifestRaw = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf-8"));
  const manifest = assertManifest(manifestRaw, folder);
  const docRaw = JSON.parse(fs.readFileSync(path.join(dir, "template.json"), "utf-8"));
  // FR-TPL-3: "doc always validates against zod schema on save" — enforced
  // here at load time too, so a malformed seed fails loudly instead of
  // shipping a broken template.
  const doc = parseTemplate(docRaw);
  return { manifest, doc };
}

let cache: TemplateEntry[] | null = null;

export function getTemplates(): TemplateEntry[] {
  if (cache) return cache;
  const folders = fs
    .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  cache = folders.map(loadTemplateFolder);
  return cache;
}

export function getPublishedTemplates(): TemplateEntry[] {
  return getTemplates().filter((t) => t.manifest.status === "published");
}

export function getTemplateBySlug(slug: string): TemplateEntry | undefined {
  return getTemplates().find((t) => t.manifest.slug === slug);
}
