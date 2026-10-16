import { z } from "zod";
import { rollbackSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { rollbackImportBatch } from "@/business-analysis/server/services/import-service";

export const maxDuration = 60;

/** Reverses the next batch of an import's changes (admin only); call until `remaining` is 0. */
export const POST = apiRoute<{ id: string }>({ minRole: "admin" }, async ({ req, ctx, params }) => {
  const { reason } = await readJson(req, rollbackSchema);
  return rollbackImportBatch(ctx, z.string().uuid().parse(params.id), reason);
});
