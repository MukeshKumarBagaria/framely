// Shapes staged rows for insertion into document_import_rows. Shared by the
// import service (via Supabase) and the database tests (via PGlite) so both
// stage exactly the same data.
import type { StagedRow } from "./types";

export type ImportRowInsert = {
  business_id: string;
  import_id: string;
  source_row_number: number;
  raw: Record<string, unknown>;
  normalized: unknown | null;
  fingerprint: string | null;
  status: StagedRow["status"];
  errors: unknown[];
  warnings: unknown[];
};

export function toImportRowInserts(businessId: string, importId: string, rows: StagedRow[]): ImportRowInsert[] {
  return rows.map((r) => ({
    business_id: businessId,
    import_id: importId,
    source_row_number: r.sourceRowNumber,
    raw: r.raw,
    normalized: r.normalized,
    fingerprint: r.fingerprint,
    status: r.status,
    errors: r.errors,
    warnings: r.warnings,
  }));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
