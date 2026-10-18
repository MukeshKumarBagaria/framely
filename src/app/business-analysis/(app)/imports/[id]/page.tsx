import { notFound } from "next/navigation";
import { z } from "zod";
import { ADAPTERS } from "@/business-analysis/imports/registry";
import { AppError } from "@/business-analysis/server/errors";
import { pageContext } from "@/business-analysis/server/page-guard";
import { getImport, importStatusCounts, listImportRows } from "@/business-analysis/server/services/import-service";
import { ImportReview, type FullAdapterInfo } from "@/business-analysis/ui/import-review";
import { PageHeader } from "@/business-analysis/ui/kit";

export default async function ImportReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await pageContext("writer");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 50;
  const status = (sp.status ?? "").replace(/[^a-z_]/g, "").slice(0, 30);
  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = await load(ctx, id, status, page, pageSize);
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
  const { imp, rows, counts } = data;
  const adapters: FullAdapterInfo[] = Object.values(ADAPTERS).map((a) => ({
    reportType: a.reportType, label: a.label, description: a.description,
    fields: a.fields.map((f) => ({ key: f.key, label: f.label, required: f.required, description: f.description })),
    optionDefs: a.optionDefs,
  }));
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={imp.file_name} description={`${ADAPTERS[imp.report_type].label} — review before anything is saved to your books.`} />
      <ImportReview imp={imp} rows={rows.rows} total={rows.total} counts={counts} page={page} pageSize={pageSize} statusFilter={status} adapters={adapters} canAdmin={ctx.can("admin")} />
    </div>
  );
}

async function load(ctx: Awaited<ReturnType<typeof pageContext>>, id: string, status: string, page: number, pageSize: number) {
  const [imp, rows, counts] = await Promise.all([getImport(ctx, id), listImportRows(ctx, id, { status: status || undefined, page, pageSize }), importStatusCounts(ctx, id)]);
  return { imp, rows, counts };
}
