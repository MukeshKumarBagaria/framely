// Shared shapes for the import pipeline:
//   file → RawTable (reader) → column mapping (header detection) →
//   normalized records (adapter) → validated StagedRow[] (pipeline)
import type { BusinessSettings, ReportType } from "../domain/accounting-policy";

export type Cell = string | number | boolean | null;

export type FileFormat = "csv" | "xlsx" | "pdf";

export type RawTable = {
  /** Sheet name (XLSX), "page 1–3" (PDF) or "csv". */
  name: string;
  rows: Cell[][];
  /** 1-based source row number of rows[i] in the original file. */
  rowNumbers: number[];
  /** Reader-level problems, e.g. PDF lines that did not fit the column grid. */
  warnings: string[];
};

export type ParsedDocument = {
  format: FileFormat;
  tables: RawTable[];
  warnings: string[];
};

export type FieldKind = "text" | "amount" | "date" | "integer" | "number";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  aliases: string[];
  description?: string;
};

export type ColumnMapping = Record<string, string | null>;

export type MappingOptions = Record<string, string | number | boolean | null>;

export type ImportMapping = {
  sheetName?: string;
  headerRowIndex: number;
  headers: string[];
  fields: ColumnMapping;
  options: MappingOptions;
};

export type Issue = { code: string; message: string; field?: string };

export type RowContext = {
  settings: BusinessSettings;
  options: MappingOptions;
  timeZone: string;
  today: string;
  /** File-level facts the adapter computed in prepare(). */
  file: Record<string, unknown>;
};

export type AdapterRow = Record<string, Cell>;

export type NormalizeResult<T> = {
  record: T | null;
  errors: Issue[];
  warnings: Issue[];
  /** Key used to find the same record twice in one file (e.g. sub-order no). */
  naturalKey?: string;
  /** Values the fingerprint is computed from. Defaults to the whole raw row. */
  fingerprintBasis?: unknown;
  /** Among in-file duplicates, the row with the highest rank is kept. */
  rank?: number;
};

export type ImportAdapter<T = unknown> = {
  reportType: ReportType;
  platform: "meesho" | "meta" | "other";
  label: string;
  description: string;
  fields: FieldDef[];
  /** Options the user can set on the mapping screen. */
  optionDefs?: { key: string; label: string; choices: { value: string; label: string }[]; default: string }[];
  /** Scan all mapped rows once (e.g. detect the date order of the file). */
  prepare?: (rows: AdapterRow[], ctx: Omit<RowContext, "file">) => { file: Record<string, unknown>; warnings: Issue[] };
  normalize: (row: AdapterRow, ctx: RowContext) => NormalizeResult<T>;
  /** Duplicate natural keys are intended (one row per component), not conflicts. */
  allowsRepeatedKeys?: boolean;
};

export type StagedRowStatus = "valid" | "invalid" | "duplicate_in_file";

export type StagedRow = {
  sourceRowNumber: number;
  raw: Record<string, Cell>;
  normalized: unknown | null;
  fingerprint: string | null;
  status: StagedRowStatus;
  errors: Issue[];
  warnings: Issue[];
};

export type PrepareSummary = {
  reportType: ReportType;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  warnings: Issue[];
  unmappedRequired: string[];
  /** Extraction quality concerns that must be acknowledged before commit (PDF). */
  needsReview: boolean;
  fileFacts: Record<string, unknown>;
};
