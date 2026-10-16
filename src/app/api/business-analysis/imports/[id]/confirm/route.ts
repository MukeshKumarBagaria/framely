import { z } from "zod";
import { commitSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { commitImportBatch } from "@/business-analysis/server/services/import-service";

export const maxDuration = 60;

/**
 * Commits the next batch of valid rows in one database transaction and
 * reports progress. The client calls this until `remaining` is 0, so large
 * files never depend on a single long request.
 */
export const POST = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) =>
  commitImportBatch(ctx, z.string().uuid().parse(params.id), await readJson(req, commitSchema)));
