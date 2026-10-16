import { z } from "zod";
import { adAccountSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveAdAccount } from "@/business-analysis/server/services/advertising-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) =>
  saveAdAccount(ctx, z.string().uuid().parse(params.id), await readJson(req, adAccountSchema)));
