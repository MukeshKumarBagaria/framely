import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

// A small report layout engine on pdf-lib (already a Framely dependency):
// A4 pages with a branded header, KPI tiles, paginated tables with repeated
// headers, simple bar charts and wrapped text. Noto Sans is embedded (and
// subset) so ₹ and Indian text render correctly.

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 40;
const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.42, 0.42, 0.46);
const RULE = rgb(0.86, 0.86, 0.88);
const ZEBRA = rgb(0.965, 0.965, 0.97);
const ACCENT = rgb(0.06, 0.46, 0.43);
const NEGATIVE = rgb(0.75, 0.16, 0.18);

export const CHART_COLORS: RGB[] = [rgb(0.15, 0.39, 0.92), rgb(0.06, 0.6, 0.45), rgb(0.85, 0.47, 0.02), rgb(0.55, 0.36, 0.86)];

export type PdfColumn = { label: string; width: number; align?: "left" | "right" };
export type PdfCell = { text: string; negative?: boolean; bold?: boolean };

async function loadFonts(doc: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont; rupee: boolean }> {
  const dir = path.join(process.cwd(), "src", "business-analysis", "server", "reports", "fonts");
  try {
    doc.registerFontkit(fontkit);
    const [r, b] = await Promise.all([readFile(path.join(dir, "NotoSans-Regular.ttf")), readFile(path.join(dir, "NotoSans-Bold.ttf"))]);
    return { regular: await doc.embedFont(r, { subset: true }), bold: await doc.embedFont(b, { subset: true }), rupee: true };
  } catch {
    // Standard fonts have no ₹ glyph; amounts fall back to "Rs.".
    return { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold), rupee: false };
  }
}

export class PdfReport {
  private page!: PDFPage;
  private y = 0;
  private pageNo = 0;

  private constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: { regular: PDFFont; bold: PDFFont; rupee: boolean },
    private readonly meta: { title: string; business: string; period: string; generated: string },
  ) {}

  static async create(meta: { title: string; business: string; period: string; generated: string }) {
    const doc = await PDFDocument.create();
    doc.setTitle(`${meta.title} — ${meta.business}`);
    doc.setAuthor("Framely Business Analysis");
    doc.setCreator("Framely");
    const fonts = await loadFonts(doc);
    const report = new PdfReport(doc, fonts, meta);
    report.newPage(true);
    return report;
  }

  /** Makes amounts printable with the embedded font. */
  t(text: string): string {
    const clean = text.replace(/[​-‍﻿]/g, "");
    return this.fonts.rupee ? clean : clean.replace(/₹/g, "Rs.").replace(/[^\x20-\x7e]/g, "?");
  }

  private get width() {
    return A4[0] - MARGIN * 2;
  }

  private newPage(first = false) {
    this.page = this.doc.addPage(A4);
    this.pageNo++;
    const top = A4[1] - MARGIN;
    this.page.drawText("Framely", { x: MARGIN, y: top - 12, size: 13, font: this.fonts.bold, color: ACCENT });
    this.page.drawText(this.t("Business Analysis"), { x: MARGIN + 58, y: top - 12, size: 9, font: this.fonts.regular, color: MUTED });
    const right = this.t(this.meta.business);
    this.page.drawText(right, { x: A4[0] - MARGIN - this.fonts.regular.widthOfTextAtSize(right, 9), y: top - 12, size: 9, font: this.fonts.regular, color: MUTED });
    this.page.drawLine({ start: { x: MARGIN, y: top - 20 }, end: { x: A4[0] - MARGIN, y: top - 20 }, thickness: 0.6, color: RULE });
    const footer = this.t(`${this.meta.title} · ${this.meta.period} · generated ${this.meta.generated} · page ${this.pageNo}`);
    this.page.drawText(footer, { x: MARGIN, y: MARGIN - 18, size: 7.5, font: this.fonts.regular, color: MUTED });
    this.y = top - 36;
    if (first) {
      this.page.drawText(this.t(this.meta.title), { x: MARGIN, y: this.y - 16, size: 18, font: this.fonts.bold, color: INK });
      this.page.drawText(this.t(`Reporting period: ${this.meta.period}`), { x: MARGIN, y: this.y - 32, size: 10, font: this.fonts.regular, color: MUTED });
      this.page.drawText(this.t(`Generated: ${this.meta.generated}`), { x: MARGIN, y: this.y - 45, size: 10, font: this.fonts.regular, color: MUTED });
      this.y -= 62;
    }
  }

  private ensure(height: number) {
    if (this.y - height < MARGIN + 6) this.newPage();
  }

  private fit(text: string, font: PDFFont, size: number, width: number): string {
    let s = this.t(text);
    if (font.widthOfTextAtSize(s, size) <= width) return s;
    while (s.length > 1 && font.widthOfTextAtSize(`${s}…`, size) > width) s = s.slice(0, -1);
    return `${s}…`;
  }

  heading(text: string) {
    this.ensure(34);
    this.y -= 10;
    this.page.drawText(this.t(text), { x: MARGIN, y: this.y - 12, size: 12, font: this.fonts.bold, color: INK });
    this.y -= 22;
  }

  kpis(items: { label: string; value: string; note?: string; negative?: boolean }[]) {
    const cols = 4;
    const gap = 8;
    const w = (this.width - gap * (cols - 1)) / cols;
    const h = 46;
    for (let i = 0; i < items.length; i += cols) {
      this.ensure(h + gap);
      items.slice(i, i + cols).forEach((k, j) => {
        const x = MARGIN + j * (w + gap);
        this.page.drawRectangle({ x, y: this.y - h, width: w, height: h, borderColor: RULE, borderWidth: 0.6 });
        this.page.drawText(this.fit(k.label, this.fonts.regular, 7.5, w - 12), { x: x + 6, y: this.y - 13, size: 7.5, font: this.fonts.regular, color: MUTED });
        this.page.drawText(this.fit(k.value, this.fonts.bold, 12, w - 12), { x: x + 6, y: this.y - 30, size: 12, font: this.fonts.bold, color: k.negative ? NEGATIVE : INK });
        if (k.note) this.page.drawText(this.fit(k.note, this.fonts.regular, 6.5, w - 12), { x: x + 6, y: this.y - 41, size: 6.5, font: this.fonts.regular, color: MUTED });
      });
      this.y -= h + gap;
    }
  }

  table(columns: PdfColumn[], rows: PdfCell[][], opts: { size?: number; boldRows?: Set<number> } = {}) {
    const size = opts.size ?? 8;
    const rowH = size + 7;
    const total = columns.reduce((t, c) => t + c.width, 0);
    const widths = columns.map((c) => (c.width / total) * this.width);
    const drawHeader = () => {
      this.ensure(rowH * 2);
      let x = MARGIN;
      this.page.drawRectangle({ x: MARGIN, y: this.y - rowH, width: this.width, height: rowH, color: rgb(0.93, 0.94, 0.95) });
      columns.forEach((c, i) => {
        const text = this.fit(c.label, this.fonts.bold, size, widths[i] - 8);
        const tx = c.align === "right" ? x + widths[i] - 4 - this.fonts.bold.widthOfTextAtSize(text, size) : x + 4;
        this.page.drawText(text, { x: tx, y: this.y - rowH + 5, size, font: this.fonts.bold, color: INK });
        x += widths[i];
      });
      this.y -= rowH;
    };
    drawHeader();
    rows.forEach((row, ri) => {
      if (this.y - rowH < MARGIN + 6) {
        this.newPage();
        drawHeader();
      }
      if (ri % 2 === 1) this.page.drawRectangle({ x: MARGIN, y: this.y - rowH, width: this.width, height: rowH, color: ZEBRA });
      let x = MARGIN;
      row.forEach((cell, i) => {
        const font = cell.bold || opts.boldRows?.has(ri) ? this.fonts.bold : this.fonts.regular;
        const text = this.fit(cell.text, font, size, widths[i] - 8);
        const tx = columns[i]?.align === "right" ? x + widths[i] - 4 - font.widthOfTextAtSize(text, size) : x + 4;
        this.page.drawText(text, { x: tx, y: this.y - rowH + 5, size, font, color: cell.negative ? NEGATIVE : INK });
        x += widths[i];
      });
      this.y -= rowH;
    });
    this.y -= 6;
  }

  barChart(labels: string[], series: { name: string; values: number[] }[], format: (v: number) => string) {
    const h = 150;
    this.ensure(h + 40);
    const top = this.y;
    const chartLeft = MARGIN + 50;
    const chartW = this.width - 50;
    const values = series.flatMap((s) => s.values);
    const max = Math.max(1, ...values);
    const min = Math.min(0, ...values);
    const span = max - min || 1;
    const yFor = (v: number) => top - 10 - ((max - v) / span) * (h - 30);
    // Axis and gridlines
    for (let i = 0; i <= 4; i++) {
      const v = min + (span * i) / 4;
      const y = yFor(v);
      this.page.drawLine({ start: { x: chartLeft, y }, end: { x: chartLeft + chartW, y }, thickness: 0.4, color: RULE });
      const label = this.t(format(v));
      this.page.drawText(label, { x: chartLeft - 6 - this.fonts.regular.widthOfTextAtSize(label, 6.5), y: y - 2, size: 6.5, font: this.fonts.regular, color: MUTED });
    }
    const groupW = chartW / Math.max(1, labels.length);
    const barW = Math.max(2, Math.min(18, (groupW - 6) / series.length));
    labels.forEach((label, i) => {
      series.forEach((s, si) => {
        const v = s.values[i] ?? 0;
        const y0 = yFor(0);
        const y1 = yFor(v);
        const x = chartLeft + i * groupW + (groupW - barW * series.length) / 2 + si * barW;
        this.page.drawRectangle({ x, y: Math.min(y0, y1), width: barW - 1, height: Math.max(0.5, Math.abs(y1 - y0)), color: v < 0 ? NEGATIVE : CHART_COLORS[si % CHART_COLORS.length] });
      });
      if (labels.length <= 14 || i % Math.ceil(labels.length / 14) === 0) {
        const text = this.fit(label, this.fonts.regular, 6.5, groupW + 10);
        this.page.drawText(text, { x: chartLeft + i * groupW + groupW / 2 - this.fonts.regular.widthOfTextAtSize(text, 6.5) / 2, y: top - h + 6, size: 6.5, font: this.fonts.regular, color: MUTED });
      }
    });
    // Legend
    let lx = chartLeft;
    series.forEach((s, si) => {
      this.page.drawRectangle({ x: lx, y: top - h - 8, width: 7, height: 7, color: CHART_COLORS[si % CHART_COLORS.length] });
      this.page.drawText(this.t(s.name), { x: lx + 10, y: top - h - 7, size: 7.5, font: this.fonts.regular, color: INK });
      lx += 20 + this.fonts.regular.widthOfTextAtSize(this.t(s.name), 7.5) + 14;
    });
    this.y = top - h - 22;
  }

  paragraphs(lines: string[], size = 8.5) {
    for (const line of lines) {
      const words = this.t(`• ${line}`).split(" ");
      let current = "";
      const flush = () => {
        this.ensure(size + 5);
        this.page.drawText(current, { x: MARGIN, y: this.y - size, size, font: this.fonts.regular, color: INK });
        this.y -= size + 4;
        current = "  ";
      };
      for (const w of words) {
        const next = current ? `${current} ${w}` : w;
        if (this.fonts.regular.widthOfTextAtSize(next, size) > this.width && current.trim()) {
          flush();
          current = `  ${w}`;
        } else current = next;
      }
      if (current.trim()) flush();
      this.y -= 2;
    }
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}
