import * as XLSX from "xlsx";

export type TableColumn = { key: string; label: string; format?: "money" | "number" | "percent" | "date" | "text" };
export type TableData = { name: string; columns: TableColumn[]; rows: Record<string, unknown>[] };

const NUMERIC = /^-?\d+(\.\d+)?$/;

/**
 * Spreadsheet apps execute cells that start with = + - @ (CSV injection).
 * Text cells are prefixed with an apostrophe; genuine numbers are left alone.
 */
export function safeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (NUMERIC.test(s)) return s;
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function csvEscape(s: string): string {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 CSV with a BOM so Excel shows ₹ and Indian text correctly. */
export function toCsv(table: TableData): string {
  const header = table.columns.map((c) => csvEscape(c.label)).join(",");
  const lines = table.rows.map((r) => table.columns.map((c) => csvEscape(safeCell(r[c.key]))).join(","));
  return `﻿${[header, ...lines].join("\r\n")}\r\n`;
}

/** One worksheet per table; money and counts are written as numbers. */
export function toXlsx(tables: TableData[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const t of tables) {
    const aoa: unknown[][] = [t.columns.map((c) => c.label)];
    for (const r of t.rows) {
      aoa.push(t.columns.map((c) => {
        const v = r[c.key];
        if (v === null || v === undefined || v === "") return null;
        if ((c.format === "money" || c.format === "number" || c.format === "percent") && NUMERIC.test(String(v))) return Number(v);
        return safeCell(v);
      }));
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = t.columns.map((c) => ({ wch: Math.min(48, Math.max(10, c.label.length + 2)) }));
    // Number formats: Indian grouping is a display preference of Excel's
    // locale; a two-decimal format keeps paise visible everywhere.
    t.columns.forEach((c, ci) => {
      if (c.format !== "money") return;
      for (let ri = 1; ri < aoa.length; ri++) {
        const ref = XLSX.utils.encode_cell({ r: ri, c: ci });
        const cell = ws[ref];
        if (cell && cell.t === "n") cell.z = "#,##0.00";
      }
    });
    let name = t.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
    for (let i = 2; used.has(name); i++) name = `${t.name.slice(0, 28)} ${i}`;
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}
