import { z } from "zod";
import { movementSchema, pageSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { listMovements, recordMovement } from "@/business-analysis/server/services/inventory-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, pageSchema.extend({ materialId: z.string().uuid().optional() }));
  return listMovements(ctx, q);
});

/** Appends a ledger movement. Stock is never edited directly. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, movementSchema);
  return { id: await recordMovement(ctx, input) };
});
