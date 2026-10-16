import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute } from "@/business-analysis/server/http";
import { importDocumentUrl } from "@/business-analysis/server/services/import-service";

/** Downloads the original report via a 60-second signed URL (admins only). */
export const GET = apiRoute<{ id: string }>({ minRole: "admin" }, async ({ ctx, params }) =>
  NextResponse.redirect(await importDocumentUrl(ctx, z.string().uuid().parse(params.id)), { headers: { "cache-control": "no-store" } }));
