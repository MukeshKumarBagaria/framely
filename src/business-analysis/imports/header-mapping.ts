// Locating the header row and matching columns to an adapter's fields.
// Platforms rename columns and fix typos between exports ("Commision" vs
// "Commission"), so matching normalises case and punctuation and accepts a
// configured alias as a prefix of a longer header. User-defined aliases from
// Settings are tried before the built-in ones.
import type { Cell, ColumnMapping, FieldDef, RawTable } from "./types";

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

/** Makes header names unique ("Amount", "Amount (2)") so raw rows can be keyed by header. */
export function uniqueHeaders(row: Cell[]): string[] {
  const seen = new Map<string, number>();
  return row.map((cell, i) => {
    const base = String(cell ?? "").trim() || `Column ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

function aliasMatches(header: string, alias: string): "exact" | "prefix" | null {
  const h = normalizeHeader(header);
  const a = normalizeHeader(alias);
  if (!h || !a) return null;
  if (h === a) return "exact";
  if (a.length >= 8 && h.startsWith(a)) return "prefix";
  return null;
}

/**
 * Maps each field to the best header. A header is used by at most one field;
 * exact matches win over prefix matches, and earlier aliases over later ones.
 */
export function autoMap(headers: string[], fields: FieldDef[], customAliases: Record<string, string[]> = {}): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  type Candidate = { field: string; header: string; score: number };
  const candidates: Candidate[] = [];

  for (const field of fields) {
    const aliases = [...(customAliases[field.key] ?? []), field.label, ...field.aliases];
    aliases.forEach((alias, aliasIndex) => {
      for (const header of headers) {
        const m = aliasMatches(header, alias);
        if (!m) continue;
        // Higher is better: exact beats prefix; custom/earlier aliases beat later ones.
        const score = (m === "exact" ? 10_000 : 5_000) - aliasIndex * 10 + Math.min(normalizeHeader(alias).length, 99) / 100;
        candidates.push({ field: field.key, header, score });
      }
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates) {
    if (mapping[c.field] || used.has(c.header)) continue;
    mapping[c.field] = c.header;
    used.add(c.header);
  }
  for (const f of fields) if (!(f.key in mapping)) mapping[f.key] = null;
  return mapping;
}

export type HeaderDetection = {
  headerRowIndex: number;
  headers: string[];
  mapping: ColumnMapping;
  matchedRequired: number;
  requiredCount: number;
  matchedTotal: number;
  score: number;
};

/** Scans the first rows of a table for the row that best matches the fields. */
export function detectHeader(
  table: RawTable,
  fields: FieldDef[],
  customAliases: Record<string, string[]> = {},
  maxScan = 25,
): HeaderDetection | null {
  let best: HeaderDetection | null = null;
  const required = fields.filter((f) => f.required);
  for (let i = 0; i < Math.min(table.rows.length, maxScan); i++) {
    const row = table.rows[i];
    const nonEmpty = row.filter((c) => c !== null && String(c).trim() !== "").length;
    if (nonEmpty < 2) continue;
    const headers = uniqueHeaders(row);
    const mapping = autoMap(headers, fields, customAliases);
    const matchedRequired = required.filter((f) => mapping[f.key]).length;
    const matchedTotal = fields.filter((f) => mapping[f.key]).length;
    const score = matchedRequired * 100 + matchedTotal;
    if (!best || score > best.score) {
      best = { headerRowIndex: i, headers, mapping, matchedRequired, requiredCount: required.length, matchedTotal, score };
    }
  }
  return best && best.matchedTotal > 0 ? best : null;
}

/** Confidence that a table is this report type, 0–1. */
export function detectionConfidence(d: HeaderDetection | null): number {
  if (!d) return 0;
  const req = d.requiredCount === 0 ? 1 : d.matchedRequired / d.requiredCount;
  return Math.round(req * 0.8 * 100 + Math.min(d.matchedTotal, 10) * 2) / 100;
}

export function rowObject(headers: string[], row: Cell[]): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  headers.forEach((h, i) => {
    const v = row[i];
    out[h] = v === undefined ? null : v;
  });
  return out;
}

export function isBlankRow(row: Cell[]): boolean {
  return row.every((c) => c === null || String(c).trim() === "");
}
