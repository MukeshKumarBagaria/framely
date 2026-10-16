import { exportSchema } from "@/business-analysis/schemas";
import { AppError } from "@/business-analysis/server/errors";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { log } from "@/business-analysis/server/logger";
import { buildExport } from "@/business-analysis/server/services/report-export-service";

export const maxDuration = 60;

export const GET = apiRoute({}, async ({ req, ctx, requestId }) => {
  const request = readQuery(req, exportSchema);
  if (request.report === "import_errors" && !ctx.can("writer")) {
    throw new AppError("forbidden", "Import reports are available to accountants and admins.");
  }
  const file = await buildExport(ctx, request);
  log.info("export", { requestId, report: request.report, format: request.format });
  const body = typeof file.body === "string" ? file.body : Buffer.from(file.body);
  return new Response(body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.fileName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
