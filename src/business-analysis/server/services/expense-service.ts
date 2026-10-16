import "server-only";
import { randomUUID } from "node:crypto";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { getServerEnv } from "../env";
import { AppError, fromDatabaseError, unwrap } from "../errors";

export type ExpenseRow = {
  id: string;
  expense_date: string;
  category_id: string;
  amount: number;
  tax_amount: number;
  tax_treatment: string;
  vendor: string | null;
  payment_method: string | null;
  payment_status: string;
  payment_date: string | null;
  reference_number: string | null;
  notes: string | null;
  attachment_path: string | null;
  reflected_in_settlement: boolean;
  is_recurring_template: boolean;
  recurrence: { frequency: string; interval: number; startDate: string; endDate?: string | null } | null;
  recurring_template_id: string | null;
  source: string;
  status: "active" | "reversed";
  reversal_of_id: string | null;
  reversal_reason: string | null;
  created_at: string;
  updated_at: string;
  expense_categories: { name: string; slug: string; treatment: string } | null;
};

export async function listCategories(ctx: BusinessContext) {
  const res = await ctx.supabase.from("expense_categories").select("id, name, slug, treatment, parent_id, is_system, is_active")
    .eq("business_id", ctx.businessId).order("name");
  return unwrap(res) as { id: string; name: string; slug: string; treatment: string; parent_id: string | null; is_system: boolean; is_active: boolean }[];
}

export async function saveCategory(ctx: BusinessContext, id: string | null, input: { name: string; treatment: string; parent_id?: string | null; is_active: boolean }) {
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "category";
  const res = id
    ? await ctx.supabase.from("expense_categories").update({ name: input.name, treatment: input.treatment, parent_id: input.parent_id ?? null, is_active: input.is_active })
        .eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("expense_categories").insert({ ...input, slug: `${slug}_${randomUUID().slice(0, 4)}`, business_id: ctx.businessId }).select("id").single();
  return unwrap(res);
}

export async function listExpenses(
  ctx: BusinessContext,
  q: { from: string; to: string; category?: string; paymentStatus?: string; search?: string | null; templates?: boolean; page: number; pageSize: number; sort?: string | null; dir: "asc" | "desc" },
) {
  let query = ctx.supabase
    .from("expenses")
    .select("*, expense_categories(name, slug, treatment)", { count: "exact" })
    .eq("business_id", ctx.businessId);
  if (q.templates) {
    query = query.eq("is_recurring_template", true);
  } else {
    query = query.eq("is_recurring_template", false).gte("expense_date", q.from).lte("expense_date", q.to);
  }
  if (q.category) query = query.eq("category_id", q.category);
  if (q.paymentStatus) query = query.eq("payment_status", q.paymentStatus);
  if (q.search) {
    const s = q.search.replace(/[%,()*]/g, " ").trim();
    if (/^[0-9a-f-]{36}$/i.test(s)) query = query.eq("id", s);
    else if (s) query = query.or(`vendor.ilike.%${s}%,reference_number.ilike.%${s}%,notes.ilike.%${s}%`);
  }
  const sortCol = ["expense_date", "amount", "vendor", "created_at"].includes(q.sort ?? "") ? q.sort! : "expense_date";
  query = query.order(sortCol, { ascending: q.dir === "asc" }).order("created_at", { ascending: false });
  const from = (q.page - 1) * q.pageSize;
  const res = await query.range(from, from + q.pageSize - 1);
  return { rows: unwrap(res) as ExpenseRow[], total: res.count ?? 0 };
}

export async function saveExpense(ctx: BusinessContext, id: string | null, input: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "save_expense", { p_business_id: ctx.businessId, p_payload: { ...input, id } });
}

export async function reverseExpense(ctx: BusinessContext, id: string, input: { reason: string; kind: "error" | "refund"; reversal_date?: string | null }) {
  return rpcOne<string>(ctx.supabase, "reverse_expense", {
    p_expense_id: id, p_reason: input.reason, p_kind: input.kind, p_reversal_date: input.reversal_date ?? null,
  });
}

export async function generateRecurring(ctx: BusinessContext, until: string) {
  return rpcOne<number>(ctx.supabase, "generate_recurring_expenses", { p_business_id: ctx.businessId, p_until: until });
}

export async function expenseAudit(ctx: BusinessContext, id: string) {
  if (!ctx.can("admin")) return [];
  const res = await ctx.supabase.from("audit_logs").select("id, action, before, after, created_at, user_id")
    .eq("business_id", ctx.businessId).eq("entity", "expenses").eq("record_id", id).order("created_at");
  return unwrap(res) as { id: number; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; created_at: string; user_id: string | null }[];
}

// ---- Receipts in private storage ---------------------------------------------------

const RECEIPT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadReceipt(ctx: BusinessContext, file: File): Promise<string> {
  const env = getServerEnv();
  const ext = RECEIPT_TYPES[file.type];
  if (!ext) throw new AppError("unsupported", "Receipts must be PDF, JPEG, PNG or WebP.");
  if (file.size > Math.min(env.maxUploadMb, 10) * 1024 * 1024) throw new AppError("too_large", "Receipt is too large (max 10 MB).");
  const path = `${ctx.businessId}/receipts/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const { error } = await ctx.supabase.storage.from(env.storageBucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new AppError("internal", "Could not store the receipt. Check that the storage bucket exists.");
  return path;
}

/** A short-lived signed URL (60 s) for a stored document of this business. */
export async function signedDocumentUrl(ctx: BusinessContext, path: string): Promise<string> {
  if (!path.startsWith(`${ctx.businessId}/`)) throw new AppError("forbidden", "That document belongs to another business.");
  const env = getServerEnv();
  const { data, error } = await ctx.supabase.storage.from(env.storageBucket).createSignedUrl(path, 60);
  if (error || !data) throw fromDatabaseError({ code: "P0002", message: "Document not found." });
  return data.signedUrl;
}
