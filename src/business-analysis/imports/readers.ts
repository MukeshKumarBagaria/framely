// File readers: CSV (papaparse), XLSX/XLS (SheetJS) and PDF (pdfjs-dist).
// Each produces RawTable[] — rows of cells with their original row numbers —
// and never interprets meaning; that is the adapters' job.
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Cell, FileFormat, ParsedDocument, RawTable } from "./types";

export class ImportFileError extends Error {
  constructor(
    public readonly code:
      | "unsupported_type"
      | "empty_file"
      | "too_many_rows"
      | "pdf_no_text"
      | "pdf_encrypted"
      | "pdf_unreadable"
      | "xlsx_unreadable"
      | "csv_unreadable",
    message: string,
  ) {
    super(message);
    this.name = "ImportFileError";
  }
}

export const MAX_ROWS = 100_000;

const EXTENSIONS: Record<string, FileFormat> = { csv: "csv", txt: "csv", xlsx: "xlsx", xls: "xlsx", pdf: "pdf" };

/** Format from the file's magic bytes, cross-checked against its extension. */
export function detectFormat(fileName: string, bytes: Uint8Array): FileFormat {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const byExt = EXTENSIONS[ext];
  const head = bytes.subarray(0, 8);
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
  const isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04; // PK..
  const isOle = head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0; // legacy .xls
  const byMagic: FileFormat | null = isPdf ? "pdf" : isZip || isOle ? "xlsx" : null;

  if (!byExt) {
    throw new ImportFileError("unsupported_type", `Unsupported file type ".${ext}". Upload a CSV, XLSX or PDF report.`);
  }
  if (byMagic && byMagic !== byExt) {
    throw new ImportFileError(
      "unsupported_type",
      `The file is named .${ext} but its contents are ${byMagic.toUpperCase()}. Rename it or export it again.`,
    );
  }
  if (!byMagic && byExt !== "csv") {
    throw new ImportFileError("unsupported_type", `The file does not look like a valid ${byExt.toUpperCase()} file.`);
  }
  if (!byMagic) {
    // A "CSV" must be text: reject binary content early.
    const sample = bytes.subarray(0, 4096);
    let control = 0;
    for (const b of sample) if (b === 0 || (b < 9 && b !== 0)) control++;
    if (control > 0) throw new ImportFileError("unsupported_type", "The file is not a text CSV.");
  }
  return byExt;
}

export async function readDocument(fileName: string, bytes: Uint8Array): Promise<ParsedDocument> {
  if (bytes.byteLength === 0) throw new ImportFileError("empty_file", "The file is empty.");
  const format = detectFormat(fileName, bytes);
  if (format === "csv") return { format, tables: [readCsv(bytes)], warnings: [] };
  if (format === "xlsx") return { format, tables: readWorkbook(bytes), warnings: [] };
  return readPdf(bytes);
}

// ---- CSV -----------------------------------------------------------------------

function decodeText(bytes: Uint8Array): string {
  let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // Excel on Windows often saves CSV as Windows-1252; U+FFFD means the UTF-8
  // decode failed somewhere.
  if (text.includes("�")) {
    try {
      text = new TextDecoder("windows-1252").decode(bytes);
    } catch {
      /* keep the UTF-8 attempt */
    }
  }
  return text;
}

export function readCsv(bytes: Uint8Array): RawTable {
  const text = decodeText(bytes);
  const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: false, dynamicTyping: false });
  const fatal = result.errors.find((e) => e.type === "Delimiter" && result.data.length <= 1);
  if (fatal) throw new ImportFileError("csv_unreadable", "Could not read the CSV: no column delimiter was found.");

  const rows: Cell[][] = [];
  const rowNumbers: number[] = [];
  result.data.forEach((r, i) => {
    if (!Array.isArray(r) || r.every((c) => String(c ?? "").trim() === "")) return;
    rows.push(r.map((c) => (c === undefined || c === null ? null : String(c))));
    rowNumbers.push(i + 1);
  });
  if (rows.length > MAX_ROWS) throw new ImportFileError("too_many_rows", `The file has more than ${MAX_ROWS.toLocaleString("en-IN")} rows; split it by date range.`);
  const warnings = result.errors
    .filter((e) => e.type !== "Delimiter")
    .slice(0, 20)
    .map((e) => `Row ${(e.row ?? 0) + 1}: ${e.message}`);
  return { name: "csv", rows, rowNumbers, warnings };
}

// ---- XLSX ------------------------------------------------------------------------

function excelCell(cell: XLSX.CellObject | undefined): Cell {
  if (!cell) return null;
  switch (cell.t) {
    case "s":
      return String(cell.v ?? "");
    case "b":
      return Boolean(cell.v);
    case "e":
    case "z":
      return null;
    case "d": {
      const d = cell.v instanceof Date ? cell.v : new Date(String(cell.v));
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    case "n": {
      const v = Number(cell.v);
      // Dates are numbers with a date format. Decode the serial with SheetJS's
      // timezone-free calendar maths instead of going through Date.
      if (cell.z && XLSX.SSF.is_date(String(cell.z))) {
        const p = XLSX.SSF.parse_date_code(v);
        if (!p) return null;
        const date = `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
        return p.H || p.M || p.S
          ? `${date} ${String(p.H).padStart(2, "0")}:${String(p.M).padStart(2, "0")}:${String(Math.floor(p.S)).padStart(2, "0")}`
          : date;
      }
      return Number.isFinite(v) ? v : null;
    }
    default:
      return cell.v === undefined || cell.v === null ? null : String(cell.v);
  }
}

export function readWorkbook(bytes: Uint8Array): RawTable[] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(bytes, { type: "array", dense: true, cellNF: true, cellDates: false, sheetRows: MAX_ROWS + 50 });
  } catch {
    throw new ImportFileError("xlsx_unreadable", "Could not read the workbook. Make sure it is not password-protected or corrupted.");
  }
  const tables: RawTable[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const dense = (ws as unknown as { "!data"?: (XLSX.CellObject | undefined)[][] })["!data"];
    const rows: Cell[][] = [];
    const rowNumbers: number[] = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row: Cell[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = dense ? dense[r]?.[c] : (ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined);
        row.push(excelCell(cell));
      }
      if (row.every((v) => v === null || String(v).trim() === "")) continue;
      rows.push(row);
      rowNumbers.push(r + 1);
    }
    if (rows.length > MAX_ROWS) throw new ImportFileError("too_many_rows", `Sheet "${name}" has more than ${MAX_ROWS.toLocaleString("en-IN")} rows.`);
    if (rows.length > 0) tables.push({ name, rows, rowNumbers, warnings: [] });
  }
  if (tables.length === 0) throw new ImportFileError("empty_file", "The workbook has no data.");
  return tables;
}

// ---- PDF -------------------------------------------------------------------------
//
// PDF.js extracts positioned text, not tables. Rows are rebuilt by grouping
// text on (nearly) the same baseline; columns by splitting each line at wide
// horizontal gaps and aligning the pieces to the x-positions of the header
// row. This works for the machine-generated tabular statements marketplaces
// produce; it cannot read scanned pages, which are detected and rejected.

type TextPiece = { text: string; x: number; y: number; width: number; height: number };
type PdfLine = { y: number; page: number; height?: number; cells: { text: string; x0: number; x1: number }[] };

async function loadPdfJs() {
  // The legacy build runs in Node without DOM globals.
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

export async function extractPdfLines(bytes: Uint8Array): Promise<{ lines: PdfLine[]; pages: number; textItems: number }> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableFontFace: true,
    useSystemFonts: false,
    enableXfa: false,
    verbosity: 0,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    await task.destroy().catch(() => undefined);
    const name = (e as { name?: string })?.name ?? "";
    if (name === "PasswordException") {
      throw new ImportFileError("pdf_encrypted", "This PDF is password-protected. Remove the password or download the CSV/XLSX version.");
    }
    throw new ImportFileError("pdf_unreadable", "Could not read this PDF.");
  }

  const lines: PdfLine[] = [];
  let textItems = 0;
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const pieces: TextPiece[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const text = item.str.replace(/\s+/g, " ");
        if (text.trim() === "") continue;
        textItems++;
        pieces.push({
          text,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: Math.abs(item.height || item.transform[3] || 10),
        });
      }
      lines.push(...groupLines(pieces, p));
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return { lines, pages: doc.numPages, textItems };
}

function groupLines(pieces: TextPiece[], page: number): PdfLine[] {
  const sorted = pieces.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: TextPiece[][] = [];
  for (const piece of sorted) {
    const last = groups[groups.length - 1];
    const tolerance = Math.max(2, piece.height * 0.45);
    if (last && Math.abs(last[0].y - piece.y) <= tolerance) last.push(piece);
    else groups.push([piece]);
  }
  return groups.map((g) => {
    g.sort((a, b) => a.x - b.x);
    const cells: PdfLine["cells"] = [];
    for (const piece of g) {
      const prev = cells[cells.length - 1];
      const gap = prev ? piece.x - prev.x1 : Infinity;
      // Gaps wider than ~1.2 character heights separate columns.
      if (prev && gap < piece.height * 1.2) {
        prev.text += (gap > piece.height * 0.15 ? " " : "") + piece.text;
        prev.x1 = Math.max(prev.x1, piece.x + piece.width);
      } else {
        cells.push({ text: piece.text, x0: piece.x, x1: piece.x + piece.width });
      }
    }
    for (const c of cells) c.text = c.text.trim();
    return { y: g[0].y, page, height: Math.max(...g.map((p) => p.height)), cells };
  });
}

/** Aligns PDF lines to the column anchors of a header line. Exported for tests. */
export function linesToTable(lines: PdfLine[], name: string): RawTable {
  const warnings: string[] = [];
  if (lines.length === 0) return { name, rows: [], rowNumbers: [], warnings };

  // Header: among the first 40 lines, the one with the most cells.
  const scan = lines.slice(0, 40);
  const headerIdx = scan.reduce((best, l, i) => (l.cells.length > scan[best].cells.length ? i : best), 0);
  const header = lines[headerIdx];
  const anchors = header.cells.map((c) => c.x0);
  const headerKey = header.cells.map((c) => c.text.toLowerCase()).join("|");

  const columnFor = (x0: number, x1: number): number => {
    const mid = (x0 + x1) / 2;
    let col = 0;
    for (let i = 0; i < anchors.length; i++) {
      const next = anchors[i + 1] ?? Infinity;
      // A cell belongs to the column whose span contains its left edge, or
      // (for right-aligned numbers) its midpoint.
      if ((x0 >= anchors[i] - 3 && x0 < next - 3) || (mid >= anchors[i] && mid < next)) {
        col = i;
        break;
      }
      if (x0 >= anchors[i]) col = i;
    }
    return col;
  };

  const rows: Cell[][] = [header.cells.map((c) => c.text)];
  const rowNumbers: number[] = [1];
  let skippedShort = 0;
  let merged = 0;
  let collisions = 0;

  let prevLine: PdfLine = header;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const key = line.cells.map((c) => c.text.toLowerCase()).join("|");
    if (key === headerKey) continue; // header repeated on a new page
    const row: Cell[] = anchors.map(() => null);
    for (const cell of line.cells) {
      const col = columnFor(cell.x0, cell.x1);
      if (row[col] !== null) {
        collisions++;
        row[col] = `${row[col]} ${cell.text}`;
      } else {
        row[col] = cell.text;
      }
    }
    // A wrapped continuation of the previous row: same page, set tightly
    // below it, first column empty and fewer than half the columns filled.
    // (A page footer such as "Page 1 of 3" sits far below and is skipped.)
    const filled = row.filter((c) => c !== null).length;
    const prev = rows[rows.length - 1];
    const lineHeight = line.height ?? 10;
    const tight = line.page === prevLine.page && prevLine.y - line.y <= lineHeight * 1.6;
    if (rows.length > 1 && tight && row[0] === null && filled < anchors.length / 2) {
      row.forEach((c, ci) => {
        if (c !== null) prev[ci] = prev[ci] === null ? c : `${prev[ci]} ${c}`;
      });
      merged++;
      prevLine = line;
      continue;
    }
    if (filled < 2) {
      skippedShort++;
      continue;
    }
    rows.push(row);
    rowNumbers.push(rows.length);
    prevLine = line;
  }

  if (skippedShort) warnings.push(`${skippedShort} short line(s) such as titles, totals or page numbers were skipped.`);
  if (merged) warnings.push(`${merged} wrapped line(s) were joined to the row above.`);
  if (collisions) warnings.push(`${collisions} text fragment(s) fell into an already-filled column and were joined; check those rows.`);
  return { name, rows, rowNumbers, warnings };
}

export async function readPdf(bytes: Uint8Array): Promise<ParsedDocument> {
  const { lines, pages, textItems } = await extractPdfLines(bytes);
  if (textItems < 10) {
    throw new ImportFileError(
      "pdf_no_text",
      "This PDF has no extractable text — it looks scanned or image-only. OCR is not supported; download the CSV or XLSX version of the report instead.",
    );
  }
  const table = linesToTable(lines, pages === 1 ? "page 1" : `pages 1–${pages}`);
  return {
    format: "pdf",
    tables: [table],
    warnings: [
      "Tables were reconstructed from PDF text positions. Review every row in the preview; CSV or XLSX exports are more reliable.",
      ...table.warnings,
    ],
  };
}
