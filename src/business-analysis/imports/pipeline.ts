// Turns a parsed table into staged, validated rows ready for the database.
// Pure: no I/O, so the whole of parsing, mapping, validation and duplicate
// detection is unit-tested without Supabase.
import type { BusinessSettings, ReportType } from "../domain/accounting-policy";
import { fingerprint } from "./fingerprint";
import { autoMap, detectHeader, isBlankRow, rowObject, uniqueHeaders } from "./header-mapping";
import { getAdapter } from "./registry";
import type {
  AdapterRow,
  ColumnMapping,
  ImportMapping,
  Issue,
  MappingOptions,
  PrepareSummary,
  RawTable,
  StagedRow,
} from "./types";

export type PrepareInput = {
  reportType: ReportType;
  table: RawTable;
  settings: BusinessSettings;
  timeZone: string;
  today: string;
  /** User overrides from the mapping screen. */
  fields?: ColumnMapping;
  options?: MappingOptions;
  headerRowIndex?: number;
  /** True for PDF imports: rows must be reviewed and acknowledged. */
  requiresReview?: boolean;
  readerWarnings?: string[];
};

export type PrepareResult = {
  mapping: ImportMapping;
  rows: StagedRow[];
  summary: PrepareSummary;
};

export function prepareImport(input: PrepareInput): PrepareResult {
  const adapter = getAdapter(input.reportType);
  const customAliases = input.settings.imports.customAliases[input.reportType] ?? {};
  const detected = input.headerRowIndex === undefined ? detectHeader(input.table, adapter.fields, customAliases) : null;
  const headerRowIndex = input.headerRowIndex ?? detected?.headerRowIndex ?? 0;
  const headerRow = input.table.rows[headerRowIndex] ?? [];
  const headers = uniqueHeaders(headerRow);

  const auto = detected?.mapping ?? autoMap(headers, adapter.fields, customAliases);
  const fields: ColumnMapping = {};
  for (const f of adapter.fields) {
    const override = input.fields?.[f.key];
    // An explicit null from the user un-maps a column; undefined keeps the auto match.
    fields[f.key] = override === undefined ? auto[f.key] ?? null : override && headers.includes(override) ? override : null;
  }
  const options: MappingOptions = {};
  for (const def of adapter.optionDefs ?? []) {
    options[def.key] = input.options?.[def.key] ?? def.default;
  }
  for (const [k, v] of Object.entries(input.options ?? {})) if (!(k in options)) options[k] = v;

  const mapping: ImportMapping = { sheetName: input.table.name, headerRowIndex, headers, fields, options };
  const unmappedRequired = adapter.fields.filter((f) => f.required && !fields[f.key]).map((f) => f.label);

  // ---- Data rows -------------------------------------------------------------
  const data: { sourceRowNumber: number; raw: Record<string, StagedRow["raw"][string]>; mapped: AdapterRow }[] = [];
  for (let i = headerRowIndex + 1; i < input.table.rows.length; i++) {
    const row = input.table.rows[i];
    if (isBlankRow(row)) continue;
    const raw = rowObject(headers, row);
    const mapped: AdapterRow = {};
    for (const f of adapter.fields) mapped[f.key] = fields[f.key] ? raw[fields[f.key] as string] ?? null : null;
    data.push({ sourceRowNumber: input.table.rowNumbers[i] ?? i + 1, raw, mapped });
  }

  const fileWarnings: Issue[] = (input.readerWarnings ?? []).map((m) => ({ code: "reader", message: m }));
  const baseCtx = { settings: input.settings, options, timeZone: input.timeZone, today: input.today };
  const prepared = adapter.prepare ? adapter.prepare(data.map((d) => d.mapped), baseCtx) : { file: {}, warnings: [] };
  fileWarnings.push(...prepared.warnings);

  if (unmappedRequired.length > 0) {
    const rows: StagedRow[] = data.map((d) => ({
      sourceRowNumber: d.sourceRowNumber,
      raw: d.raw,
      normalized: null,
      fingerprint: null,
      status: "invalid",
      errors: [{ code: "unmapped_required", message: `Map the required column(s): ${unmappedRequired.join(", ")}` }],
      warnings: [],
    }));
    return { mapping, rows, summary: summarize(input.reportType, rows, fileWarnings, unmappedRequired, true, prepared.file) };
  }

  // ---- Normalize ---------------------------------------------------------------
  const ctx = { ...baseCtx, file: prepared.file };
  const occurrences = new Map<string, number>();
  const staged: (StagedRow & { naturalKey?: string; rank: number })[] = data.map((d) => {
    const result = adapter.normalize(d.mapped, ctx);
    const ok = result.record !== null && result.errors.length === 0;
    let fp: string | null = null;
    if (ok) {
      // Identical rows within one file get distinct fingerprints by order of
      // appearance, so genuine repeats (two identical charges) are kept while
      // the same file imported twice still produces the same fingerprints.
      const basis = result.fingerprintBasis ?? d.raw;
      const base = fingerprint(input.reportType, basis);
      const n = occurrences.get(base) ?? 0;
      occurrences.set(base, n + 1);
      fp = n === 0 ? base : fingerprint(input.reportType, { basis, occurrence: n });
      if (n > 0 && adapter.allowsRepeatedKeys) {
        result.warnings.push({ code: "identical_row", message: "An identical row appears earlier in this file; both are imported." });
      }
    }
    return {
      sourceRowNumber: d.sourceRowNumber,
      raw: d.raw,
      normalized: ok ? result.record : null,
      fingerprint: fp,
      status: ok ? "valid" : "invalid",
      errors: result.errors,
      warnings: result.warnings,
      naturalKey: result.naturalKey,
      rank: result.rank ?? 0,
    };
  });

  // ---- In-file duplicates by natural key --------------------------------------
  if (!adapter.allowsRepeatedKeys) {
    const groups = new Map<string, typeof staged>();
    for (const r of staged) {
      if (r.status !== "valid" || !r.naturalKey) continue;
      const g = groups.get(r.naturalKey) ?? [];
      g.push(r);
      groups.set(r.naturalKey, g);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      // Exact repeats keep the first occurrence. Otherwise keep the most
      // advanced lifecycle state; among equal states, the last (newest) row.
      const same = (a: (typeof group)[number], b: (typeof group)[number]) =>
        JSON.stringify(a.normalized) === JSON.stringify(b.normalized);
      const allIdentical = group.every((r) => same(r, group[0]));
      const keeper = allIdentical ? group[0] : group.reduce((best, r) => (r.rank >= best.rank ? r : best));
      for (const r of group) {
        if (r === keeper) continue;
        const identical = same(r, keeper);
        r.status = "duplicate_in_file";
        r.warnings.push({
          code: identical ? "duplicate_row" : "superseded_in_file",
          message: identical
            ? `Duplicate of row ${keeper.sourceRowNumber}.`
            : `The same record appears again in row ${keeper.sourceRowNumber} with different values; that row is used.`,
        });
      }
    }
  }

  const rows: StagedRow[] = staged.map(({ naturalKey: _k, rank: _r, ...rest }) => rest);
  const needsReview = Boolean(input.requiresReview);
  return { mapping, rows, summary: summarize(input.reportType, rows, fileWarnings, [], needsReview, prepared.file) };
}

function summarize(
  reportType: ReportType,
  rows: StagedRow[],
  warnings: Issue[],
  unmappedRequired: string[],
  needsReview: boolean,
  fileFacts: Record<string, unknown>,
): PrepareSummary {
  return {
    reportType,
    totalRows: rows.length,
    validRows: rows.filter((r) => r.status === "valid").length,
    invalidRows: rows.filter((r) => r.status === "invalid").length,
    duplicateRows: rows.filter((r) => r.status === "duplicate_in_file").length,
    warnings,
    unmappedRequired,
    needsReview,
    fileFacts,
  };
}

/** Error report rows for download (CSV/XLSX). */
export function errorReportRows(rows: { sourceRowNumber: number; status: string; errors: Issue[]; warnings: Issue[]; raw: Record<string, unknown> }[]) {
  return rows
    .filter((r) => r.errors.length > 0 || r.warnings.length > 0 || r.status !== "valid")
    .map((r) => ({
      "Source row": r.sourceRowNumber,
      Status: r.status,
      Errors: r.errors.map((e) => e.message).join("; "),
      Warnings: r.warnings.map((w) => w.message).join("; "),
      ...Object.fromEntries(Object.entries(r.raw).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])),
    }));
}
