import "server-only";
import { settingsSchema, type ReportType } from "../../domain/accounting-policy";
import { todayIn } from "../../domain/dates";
import { sha256Hex } from "../../imports/fingerprint";
import { prepareImport } from "../../imports/pipeline";
import { ImportFileError, readDocument } from "../../imports/readers";
import { detectReportTypes, getAdapter } from "../../imports/registry";
import { chunk, toImportRowInserts } from "../../imports/staging";
import type { Cell, ImportMapping, PrepareSummary, RawTable } from "../../imports/types";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { getServerEnv } from "../env";
import { AppError, fromDatabaseError, unwrap } from "../errors";
import { log } from "../logger";
import { getCurrentSettings, saveSettings } from "./settings-service";

export type ImportRecord = {
  id: string;
  platform: string;
  report_type: ReportType;
  file_name: string;
  file_format: "csv" | "xlsx" | "pdf";
  mime_type: string | null;
  file_size_bytes: number;
  checksum_sha256: string;
  storage_path: string | null;
  sheet_name: string | null;
  status: string;
  mapping: ImportMapping;
  parse_summary: PrepareSummary & {
    detections?: { reportType: ReportType; tableName: string; confidence: number }[];
    tables?: string[];
    readerWarnings?: string[];
    storageWarning?: string;
    duplicateOf?: { id: string; fileName: string; committedAt: string | null } | null;
  };
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  inserted_count: number;
  updated_count: number;
  unchanged_count: number;
  rejected_count: number;
  reverted_count: number;
  error_summary: string | null;
  duplicate_of_import_id: string | null;
  created_at: string;
  committed_at: string | null;
  rolled_back_at: string | null;
  rollback_reason: string | null;
};

const EDITABLE = ["staging", "parsed", "needs_review", "failed"];
const ROW_CHUNK = 500;

function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "report";
  return base.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "report";
}

function fileError(e: unknown): never {
  if (e instanceof ImportFileError) {
    const code = e.code === "too_many_rows" ? "too_large" : e.code === "unsupported_type" ? "unsupported" : "bad_request";
    throw new AppError(code, e.message, { reason: e.code });
  }
  throw e;
}

async function insertRows(ctx: BusinessContext, importId: string, rows: ReturnType<typeof toImportRowInserts>) {
  for (const part of chunk(rows, ROW_CHUNK)) {
    const res = await ctx.supabase.from("document_import_rows").insert(part);
    if (res.error) throw fromDatabaseError(res.error, "Could not stage the rows.");
  }
}

export async function uploadImport(ctx: BusinessContext, file: File, hint: ReportType | null): Promise<{ id: string }> {
  const env = getServerEnv();
  const maxBytes = env.maxUploadMb * 1024 * 1024;
  if (file.size === 0) throw new AppError("bad_request", "The file is empty.");
  if (file.size > maxBytes) throw new AppError("too_large", `Files can be up to ${env.maxUploadMb} MB.`);

  const fileName = safeFileName(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checksum = sha256Hex(bytes);
  const doc = await readDocument(fileName, bytes).catch(fileError);
  const { settings } = await getCurrentSettings(ctx);
  const today = todayIn(ctx.business.timeZone);

  const detections = detectReportTypes(doc.tables, settings);
  const chosen = hint ? detections.find((d) => d.reportType === hint) : detections[0];
  if (!chosen && !hint) {
    throw new AppError("bad_request", "This file was not recognised as a supported report. Choose the report type and try again.");
  }
  const reportType: ReportType = hint ?? chosen!.reportType;
  const table: RawTable = doc.tables[chosen?.tableIndex ?? 0];
  const adapter = getAdapter(reportType);

  const prepared = prepareImport({
    reportType,
    table,
    settings,
    timeZone: ctx.business.timeZone,
    today,
    headerRowIndex: chosen?.detection.headerRowIndex,
    requiresReview: doc.format === "pdf",
    readerWarnings: doc.warnings,
  });

  // The same file committed before: rows will be recognised as duplicates,
  // but say so up front.
  const prior = unwrap(
    await ctx.supabase.from("document_imports").select("id, file_name, committed_at")
      .eq("business_id", ctx.businessId).eq("checksum_sha256", checksum).eq("report_type", reportType)
      .eq("status", "committed").order("committed_at", { ascending: false }).limit(1).maybeSingle(),
  ) as { id: string; file_name: string; committed_at: string | null } | null;

  const summary = {
    ...prepared.summary,
    detections: detections.slice(0, 5).map((d) => ({ reportType: d.reportType, tableName: doc.tables[d.tableIndex].name, confidence: d.confidence })),
    tables: doc.tables.map((t) => t.name),
    readerWarnings: doc.warnings,
    duplicateOf: prior ? { id: prior.id, fileName: prior.file_name, committedAt: prior.committed_at } : null,
  };

  const created = unwrap(
    await ctx.supabase.from("document_imports").insert({
      business_id: ctx.businessId,
      platform: adapter.platform,
      report_type: reportType,
      file_name: fileName,
      file_format: doc.format,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      checksum_sha256: checksum,
      sheet_name: doc.format === "xlsx" ? table.name : null,
      status: "staging",
      mapping: prepared.mapping,
      parse_summary: summary,
      total_rows: prepared.summary.totalRows,
      valid_rows: prepared.summary.validRows,
      invalid_rows: prepared.summary.invalidRows,
      duplicate_rows: prepared.summary.duplicateRows,
      duplicate_of_import_id: prior?.id ?? null,
    }).select("id").single(),
  ) as { id: string };

  let storagePath: string | null = null;
  let storageWarning: string | undefined;
  if (env.storeDocuments) {
    const path = `${ctx.businessId}/imports/${created.id}/${fileName}`;
    const up = await ctx.supabase.storage.from(env.storageBucket).upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) {
      storageWarning = "The original file could not be stored (check the private storage bucket). The import itself is unaffected.";
      log.warn("import_document_not_stored", { importId: created.id, reason: up.error.message });
    } else {
      storagePath = path;
    }
  }

  try {
    await insertRows(ctx, created.id, toImportRowInserts(ctx.businessId, created.id, prepared.rows));
  } catch (e) {
    await ctx.supabase.from("document_imports").update({ status: "failed", error_summary: "Staging the rows failed. Discard this import and upload the file again." }).eq("id", created.id);
    throw e;
  }

  const status = prepared.summary.needsReview ? "needs_review" : "parsed";
  unwrap(
    await ctx.supabase.from("document_imports")
      .update({ status, storage_path: storagePath, parse_summary: { ...summary, storageWarning } })
      .eq("id", created.id).select("id").single(),
  );
  log.info("import_staged", { importId: created.id, reportType, rows: prepared.summary.totalRows, valid: prepared.summary.validRows });
  return created;
}

export async function getImport(ctx: BusinessContext, id: string): Promise<ImportRecord> {
  const row = unwrap(await ctx.supabase.from("document_imports").select("*").eq("business_id", ctx.businessId).eq("id", id).maybeSingle()) as ImportRecord | null;
  if (!row) throw new AppError("not_found", "Import not found.");
  return row;
}

export async function listImports(ctx: BusinessContext, page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const res = await ctx.supabase.from("document_imports")
    .select("id, report_type, file_name, file_format, file_size_bytes, status, total_rows, valid_rows, invalid_rows, duplicate_rows, inserted_count, updated_count, unchanged_count, rejected_count, reverted_count, created_at, committed_at, rolled_back_at, duplicate_of_import_id", { count: "exact" })
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  return { rows: unwrap(res) as Partial<ImportRecord>[], total: res.count ?? 0 };
}

export type ImportRow = {
  id: string;
  source_row_number: number;
  raw: Record<string, Cell>;
  normalized: Record<string, unknown> | null;
  status: string;
  errors: { code: string; message: string; field?: string }[];
  warnings: { code: string; message: string; field?: string }[];
  target_table: string | null;
  target_id: string | null;
};

export async function listImportRows(ctx: BusinessContext, id: string, opts: { status?: string; page: number; pageSize: number }) {
  let q = ctx.supabase.from("document_import_rows")
    .select("id, source_row_number, raw, normalized, status, errors, warnings, target_table, target_id", { count: "exact" })
    .eq("business_id", ctx.businessId).eq("import_id", id).order("source_row_number");
  if (opts.status === "problems") q = q.or("status.in.(invalid,duplicate_in_file,duplicate_existing,rejected,revert_skipped),warnings.neq.[]");
  else if (opts.status) q = q.eq("status", opts.status);
  const from = (opts.page - 1) * opts.pageSize;
  const res = await q.range(from, from + opts.pageSize - 1);
  return { rows: unwrap(res) as ImportRow[], total: res.count ?? 0 };
}

export async function importStatusCounts(ctx: BusinessContext, id: string): Promise<Record<string, number>> {
  const statuses = ["valid", "invalid", "duplicate_in_file", "duplicate_existing", "inserted", "updated", "unchanged", "rejected", "reverted", "revert_skipped"];
  const counts = await Promise.all(statuses.map(async (s) => {
    const res = await ctx.supabase.from("document_import_rows").select("id", { count: "exact", head: true })
      .eq("business_id", ctx.businessId).eq("import_id", id).eq("status", s);
    if (res.error) throw fromDatabaseError(res.error);
    return [s, res.count ?? 0] as const;
  }));
  return Object.fromEntries(counts.filter(([, n]) => n > 0));
}

async function allRows(ctx: BusinessContext, id: string): Promise<ImportRow[]> {
  const out: ImportRow[] = [];
  for (let page = 1; ; page++) {
    const { rows } = await listImportRows(ctx, id, { page, pageSize: 1000 });
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** Rebuilds the table from the staged raw rows so a new mapping can be applied without the original file. */
function tableFromRows(headers: string[], rows: ImportRow[], name: string): RawTable {
  return {
    name,
    rows: [headers, ...rows.map((r) => headers.map((h) => (r.raw[h] === undefined ? null : r.raw[h])))],
    rowNumbers: [0, ...rows.map((r) => r.source_row_number)],
    warnings: [],
  };
}

export async function remapImport(
  ctx: BusinessContext,
  id: string,
  update: { reportType?: ReportType; fields?: Record<string, string | null>; options?: Record<string, string | number | boolean | null>; saveAsDefault: boolean },
) {
  const imp = await getImport(ctx, id);
  if (!EDITABLE.includes(imp.status)) throw new AppError("conflict", `An import that is ${imp.status.replace("_", " ")} cannot be re-mapped.`);
  const reportType = update.reportType ?? imp.report_type;
  const rows = await allRows(ctx, id);
  const version = await getCurrentSettings(ctx);
  const prepared = prepareImport({
    reportType,
    table: tableFromRows(imp.mapping.headers, rows, imp.mapping.sheetName ?? imp.file_name),
    settings: version.settings,
    timeZone: ctx.business.timeZone,
    today: todayIn(ctx.business.timeZone),
    headerRowIndex: 0,
    fields: update.fields ?? (reportType === imp.report_type ? imp.mapping.fields : undefined),
    options: { ...(reportType === imp.report_type ? imp.mapping.options : {}), ...(update.options ?? {}) },
    requiresReview: imp.file_format === "pdf",
    readerWarnings: imp.parse_summary.readerWarnings,
  });
  // Keep the original sheet header row index for reference.
  const mapping = { ...prepared.mapping, headerRowIndex: imp.mapping.headerRowIndex, sheetName: imp.mapping.sheetName };

  const del = await ctx.supabase.from("document_import_rows").delete().eq("import_id", id).eq("business_id", ctx.businessId);
  if (del.error) throw fromDatabaseError(del.error);
  try {
    await insertRows(ctx, id, toImportRowInserts(ctx.businessId, id, prepared.rows));
  } catch (e) {
    await ctx.supabase.from("document_imports").update({ status: "failed", error_summary: "Re-mapping failed while staging rows. Discard and upload again." }).eq("id", id);
    throw e;
  }
  unwrap(await ctx.supabase.from("document_imports").update({
    report_type: reportType,
    platform: getAdapter(reportType).platform,
    mapping,
    parse_summary: { ...imp.parse_summary, ...prepared.summary },
    status: prepared.summary.needsReview ? "needs_review" : "parsed",
    total_rows: prepared.summary.totalRows,
    valid_rows: prepared.summary.validRows,
    invalid_rows: prepared.summary.invalidRows,
    duplicate_rows: prepared.summary.duplicateRows,
    error_summary: null,
  }).eq("id", id).select("id").single());

  // Remember non-default column names for next time (a new settings version).
  if (update.saveAsDefault && update.fields && ctx.can("admin")) {
    const adapter = getAdapter(reportType);
    const aliases = { ...(version.settings.imports.customAliases[reportType] ?? {}) };
    for (const field of adapter.fields) {
      const header = update.fields[field.key];
      if (header && ![field.label, ...field.aliases].includes(header)) {
        aliases[field.key] = [header, ...(aliases[field.key] ?? []).filter((a) => a !== header)].slice(0, 20);
      }
    }
    const next = settingsSchema.parse({
      ...version.settings,
      imports: { ...version.settings.imports, customAliases: { ...version.settings.imports.customAliases, [reportType]: aliases } },
    });
    await saveSettings(ctx, next, todayIn(ctx.business.timeZone), "Saved import column mapping");
  }
  return { ok: true };
}

export async function commitImportBatch(ctx: BusinessContext, id: string, opts: { acknowledgeWarnings: boolean; batchSize: number }) {
  const res = await ctx.supabase.rpc("commit_import_batch", {
    p_import_id: id, p_batch_size: opts.batchSize, p_acknowledge_warnings: opts.acknowledgeWarnings,
  });
  if (res.error) {
    const err = fromDatabaseError(res.error, "Committing this batch failed.");
    // A failed batch leaves the import recoverable: nothing in the batch was
    // applied, committed batches stay, and committing again resumes.
    if (err.code === "internal") {
      await ctx.supabase.from("document_imports").update({ status: "failed", error_summary: err.message }).eq("id", id).eq("business_id", ctx.businessId);
    }
    throw err;
  }
  return res.data as { processed: number; remaining: number; status: string; inserted: number; updated: number; unchanged: number; rejected: number };
}

export async function rollbackImportBatch(ctx: BusinessContext, id: string, reason: string) {
  return rpcOne<{ processed: number; remaining: number; status: string; reverted: number }>(ctx.supabase, "rollback_import_batch", {
    p_import_id: id, p_reason: reason, p_batch_size: 1000,
  });
}

export async function discardImport(ctx: BusinessContext, id: string) {
  const imp = await getImport(ctx, id);
  if (!EDITABLE.includes(imp.status)) throw new AppError("conflict", "Only imports that have not been committed can be discarded.");
  const del = await ctx.supabase.from("document_import_rows").delete().eq("import_id", id).eq("business_id", ctx.businessId);
  if (del.error) throw fromDatabaseError(del.error);
  unwrap(await ctx.supabase.from("document_imports").update({ status: "discarded" }).eq("id", id).select("id").single());
}

export async function importErrorRows(ctx: BusinessContext, id: string) {
  const imp = await getImport(ctx, id);
  const rows = await allRows(ctx, id);
  return { imp, rows };
}

export async function importDocumentUrl(ctx: BusinessContext, id: string) {
  if (!ctx.can("admin")) throw new AppError("forbidden", "Only admins can download original documents.");
  const imp = await getImport(ctx, id);
  if (!imp.storage_path) throw new AppError("not_found", "The original file was not stored for this import.");
  const { data, error } = await ctx.supabase.storage.from(getServerEnv().storageBucket).createSignedUrl(imp.storage_path, 60, { download: imp.file_name });
  if (error || !data) throw new AppError("not_found", "The stored file could not be found.");
  return data.signedUrl;
}
