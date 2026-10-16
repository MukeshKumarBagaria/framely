import { z } from "zod";
import { mappingUpdateSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { discardImport, getImport, importStatusCounts, listImportRows, remapImport } from "@/business-analysis/server/services/import-service";

const id = z.string().uuid();
const rowsQuery = z.object({
  status: z.string().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
});

export const GET = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const importId = id.parse(params.id);
  const q = readQuery(req, rowsQuery);
  const [imp, rows, counts] = await Promise.all([getImport(ctx, importId), listImportRows(ctx, importId, q), importStatusCounts(ctx, importId)]);
  return { import: imp, rows: rows.rows, total: rows.total, counts, page: q.page, pageSize: q.pageSize };
});

/** Applies a new column mapping / report type / options to the staged rows. */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, mappingUpdateSchema);
  return remapImport(ctx, id.parse(params.id), input);
});

/** Discards an import that has not been committed. */
export const DELETE = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ ctx, params }) => {
  await discardImport(ctx, id.parse(params.id));
  return { ok: true };
});
