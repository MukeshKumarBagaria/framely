import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/business-analysis/server/errors";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { signedDocumentUrl, uploadReceipt } from "@/business-analysis/server/services/expense-service";

/** Uploads a receipt to the private bucket; returns its storage path for the expense. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("bad_request", "Attach a file.");
  return { path: await uploadReceipt(ctx, file) };
});

/** Redirects to a 60-second signed URL. Storage RLS restricts receipts to accountants and admins. */
export const GET = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const { path } = readQuery(req, z.object({ path: z.string().min(10).max(500) }));
  return NextResponse.redirect(await signedDocumentUrl(ctx, path), { headers: { "cache-control": "no-store" } });
});
