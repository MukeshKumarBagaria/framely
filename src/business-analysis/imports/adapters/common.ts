// Small, strict field readers shared by the adapters. Each returns either a
// value or pushes an Issue — they never coerce a bad value into a plausible one.
import { parseReportDate, type DateOrder, type IsoDate } from "../../domain/dates";
import { parseAmount, type Money } from "../../domain/money";
import type { AdapterRow, Cell, Issue } from "../types";

export function text(row: AdapterRow, key: string, max = 500): string | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  return s.length > max ? s.slice(0, max) : s;
}

/** Identifiers exported by spreadsheets as numbers ("1.23456789E+14") are restored to digits. */
export function identifier(row: AdapterRow, key: string): string | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  if (typeof v === "number") {
    return Number.isSafeInteger(v) ? String(v) : null;
  }
  const s = String(v).trim().replace(/^'+/, "");
  if (s === "") return null;
  return s;
}

export function amount(row: AdapterRow, key: string, issues: Issue[], label: string, required = false): Money | null {
  const parsed = parseAmount(row[key]);
  if (!parsed.ok) {
    issues.push({ code: "invalid_amount", field: key, message: `${label}: ${parsed.reason}` });
    return null;
  }
  if (parsed.value === null && required) {
    issues.push({ code: "missing_value", field: key, message: `${label} is missing` });
  }
  return parsed.value;
}

export function integer(row: AdapterRow, key: string, issues: Issue[], label: string, opts: { required?: boolean; min?: number; max?: number } = {}): number | null {
  const v = row[key];
  if (v === null || v === undefined || String(v).trim() === "") {
    if (opts.required) issues.push({ code: "missing_value", field: key, message: `${label} is missing` });
    return null;
  }
  const s = String(v).trim().replace(/,/g, "");
  if (!/^-?\d+(\.0+)?$/.test(s)) {
    issues.push({ code: "invalid_number", field: key, message: `${label}: "${String(v).trim()}" is not a whole number` });
    return null;
  }
  const n = Number(s);
  if ((opts.min !== undefined && n < opts.min) || (opts.max !== undefined && n > opts.max)) {
    issues.push({ code: "out_of_range", field: key, message: `${label}: ${n} is out of range` });
    return null;
  }
  return n;
}

export function date(
  row: AdapterRow,
  key: string,
  issues: Issue[],
  label: string,
  order: DateOrder,
  timeZone: string,
  required = false,
): IsoDate | null {
  const v = row[key];
  if (v === null || v === undefined || String(v).trim() === "") {
    if (required) issues.push({ code: "missing_value", field: key, message: `${label} is missing` });
    return null;
  }
  const parsed = parseReportDate(v, order, timeZone);
  if (!parsed) {
    issues.push({ code: "invalid_date", field: key, message: `${label}: "${String(v).trim()}" is not a valid date` });
    return null;
  }
  return parsed;
}

export function columnValues(rows: AdapterRow[], key: string): Cell[] {
  return rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
}

/** Dates more than two days in the future are almost always a day/month mix-up. */
export function checkNotFuture(value: IsoDate | null, today: IsoDate, label: string, issues: Issue[], field: string) {
  if (!value) return;
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 2);
  if (value > limit.toISOString().slice(0, 10)) {
    issues.push({ code: "future_date", field, message: `${label} ${value} is in the future` });
  }
}
