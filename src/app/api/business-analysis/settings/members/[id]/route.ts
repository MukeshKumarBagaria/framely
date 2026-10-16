import { z } from "zod";
import { memberUpdateSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { updateMember } from "@/business-analysis/server/services/settings-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "owner" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, memberUpdateSchema);
  await updateMember(ctx, z.string().uuid().parse(params.id), input.role, input.is_active);
  return { ok: true };
});
