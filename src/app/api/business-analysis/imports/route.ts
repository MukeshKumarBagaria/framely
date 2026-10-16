import { z } from "zod";
import { REPORT_TYPES } from "@/business-analysis/domain/accounting-policy";
import { pageSchema } from "@/business-analysis/schemas";
import { getServerEnv } from "@/business-analysis/server/env";
import { AppError } from "@/business-analysis/server/errors";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { listImports, uploadImport } from "@/business-analysis/server/services/import-service";

export const maxDuration = 60;

export const GET = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const q = readQuery(req, pageSchema);
  return { ...(await listImports(ctx, q.page, q.pageSize)), page: q.page, pageSize: q.pageSize };
});

/**
 * Uploads a report: validates type and size, parses it, detects the report
 * type, stages every row with its validation result, and stores the original
 * privately. Nothing touches the ledgers until the import is confirmed.
 */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const limit = getServerEnv().maxUploadMb * 1024 * 1024;
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > limit + 64 * 1024) throw new AppError("too_large", `Files can be up to ${getServerEnv().maxUploadMb} MB.`);
  if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) throw new AppError("unsupported", "Send the file as multipart form data.");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("bad_request", "Attach a file.");
  const hint = z.enum(REPORT_TYPES).nullable().catch(null).parse(form.get("reportType") || null);
  return uploadImport(ctx, file, hint);
});
