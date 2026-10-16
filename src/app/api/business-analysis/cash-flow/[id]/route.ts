import { z } from "zod";
import { voidSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { voidCashTransaction } from "@/business-analysis/server/services/cash-flow-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const { reason } = await readJson(req, voidSchema);
  await voidCashTransaction(ctx, z.string().uuid().parse(params.id), reason);
  return { ok: true };
});
