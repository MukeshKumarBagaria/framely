import { z } from "zod";
import { voidSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { voidMovement } from "@/business-analysis/server/services/inventory-service";

/** Voids a movement (a production batch is voided as a whole); the row stays in the ledger. */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const { reason } = await readJson(req, voidSchema);
  await voidMovement(ctx, z.string().uuid().parse(params.id), reason);
  return { ok: true };
});
