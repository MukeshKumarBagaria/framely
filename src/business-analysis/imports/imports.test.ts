import { PDFDocument, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, settingsSchema } from "../domain/accounting-policy";
import type { OrderLineRecord, SettlementLineRecord } from "./normalized";
import { errorReportRows, prepareImport } from "./pipeline";
import { ImportFileError, detectFormat, linesToTable, readDocument } from "./readers";
import { detectReportTypes } from "./registry";
import type { RawTable } from "./types";

const enc = (s: string) => new TextEncoder().encode(s);
const base = { settings: DEFAULT_SETTINGS, timeZone: "Asia/Kolkata", today: "2026-10-16" };

// Exactly the columns of the Meesho order export, including its own typo
// ("Commision"). Rows cover delivered, cancelled, RTO, missing packet id,
// quantity 2, a duplicate and an exact duplicate.
const MEESHO_HEADER =
  "Reason for Credit Entry,Sub Order No,Catalog ID,Order Date,Order source,Customer State,Product Name,SKU,Size,Quantity," +
  "Supplier Listed Price (Incl. GST + Commission),Supplier Discounted Price (Incl GST and Commision),Packet Id";
const MEESHO_CSV = [
  MEESHO_HEADER,
  "DELIVERED,149532165782_1,112233,2026-10-01,Meesho,Maharashtra,Couple Photo Frame 8x10,PF-0001,8x10,1,499,399,PKT001",
  "CANCELLED,149532165783_1,112233,2026-10-02,Meesho,Gujarat,Couple Photo Frame 8x10,PF-0001,8x10,1,499,399,",
  "RTO_LOCKED,149532165784_1,112244,2026-10-03,Meesho,Delhi,\"Set of 2 Frames, Wooden\",PF-0002-S2,A4,2,\"1,099\",899,PKT003",
  "DELIVERED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage Frame,pf-0003 ,12x18,1,799,649,PKT004",
  "DELIVERED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage Frame,pf-0003 ,12x18,1,799,649,PKT004",
].join("\n");

async function prepareCsv(csv: string, reportType: Parameters<typeof prepareImport>[0]["reportType"], extra: Partial<Parameters<typeof prepareImport>[0]> = {}) {
  const doc = await readDocument("report.csv", enc(csv));
  return prepareImport({ ...base, reportType, table: doc.tables[0], ...extra });
}

describe("Meesho order CSV", () => {
  it("is detected as a Meesho order report", async () => {
    const doc = await readDocument("orders.csv", enc(MEESHO_CSV));
    const [best] = detectReportTypes(doc.tables, DEFAULT_SETTINGS);
    expect(best.reportType).toBe("meesho_orders");
    expect(best.detection.mapping).toMatchObject({
      status: "Reason for Credit Entry",
      sub_order_no: "Sub Order No",
      discounted_price: "Supplier Discounted Price (Incl GST and Commision)",
      listed_price: "Supplier Listed Price (Incl. GST + Commission)",
      packet_id: "Packet Id",
    });
  });

  it("normalises every row and preserves raw values and statuses", async () => {
    const { rows, summary } = await prepareCsv(MEESHO_CSV, "meesho_orders");
    expect(summary).toMatchObject({ totalRows: 5, validRows: 4, invalidRows: 0, duplicateRows: 1 });
    const [delivered, cancelled, rto, collage] = rows.map((r) => r.normalized as OrderLineRecord);
    expect(delivered).toMatchObject({
      external_order_id: "149532165782",
      external_line_id: "149532165782_1",
      status: "delivered",
      raw_status: "DELIVERED",
      order_date: "2026-10-01",
      sale_amount: "399.00",
      listed_amount: "499.00",
      packet_id: "PKT001",
    });
    expect(cancelled).toMatchObject({ status: "cancelled", packet_id: null });
    expect(rto).toMatchObject({ status: "rto", raw_status: "RTO_LOCKED", quantity: 2, sale_amount: "1798.00", listed_amount: "2198.00" });
    expect(collage.sku).toBe("pf-0003");
    expect(rows[0].raw["Supplier Discounted Price (Incl GST and Commision)"]).toBe("399");
    expect(rows.map((r) => r.sourceRowNumber)).toEqual([2, 3, 4, 5, 6]);
  });

  it("flags the price-basis assumption on multi-quantity lines", async () => {
    const { rows } = await prepareCsv(MEESHO_CSV, "meesho_orders");
    expect(rows[2].warnings.map((w) => w.code)).toContain("price_basis_assumed");
    const lineTotal = await prepareCsv(MEESHO_CSV, "meesho_orders", { options: { priceBasis: "line_total" } });
    expect((lineTotal.rows[2].normalized as OrderLineRecord).sale_amount).toBe("899.00");
  });

  it("marks exact duplicates and produces stable fingerprints", async () => {
    const a = await prepareCsv(MEESHO_CSV, "meesho_orders");
    const b = await prepareCsv(MEESHO_CSV, "meesho_orders");
    expect(a.rows[4].status).toBe("duplicate_in_file");
    expect(a.rows[4].warnings[0].code).toBe("duplicate_row");
    expect(a.rows.map((r) => r.fingerprint)).toEqual(b.rows.map((r) => r.fingerprint));
    expect(new Set(a.rows.filter((r) => r.status === "valid").map((r) => r.fingerprint)).size).toBe(4);
  });

  it("keeps the most advanced status when a sub-order appears twice with different values", async () => {
    const csv = [MEESHO_HEADER,
      "SHIPPED,1001_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,1001_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
    ].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_orders");
    expect(rows[0]).toMatchObject({ status: "duplicate_in_file" });
    expect(rows[0].warnings[0].code).toBe("superseded_in_file");
    expect(rows[1]).toMatchObject({ status: "valid" });
  });

  it("rejects invalid amounts, dates and quantities with row-level errors", async () => {
    const csv = [MEESHO_HEADER,
      "DELIVERED,2001_1,1,31-02-2026,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,2002_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,0,499,399,P1",
      "DELIVERED,2003_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,39x9,P1",
      "DELIVERED,,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,2005_1,1,2027-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,2006_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,-5,P1",
    ].join("\n");
    const { rows, summary } = await prepareCsv(csv, "meesho_orders");
    expect(summary.validRows).toBe(0);
    expect(rows.map((r) => r.errors[0]?.code)).toEqual([
      "invalid_date", "out_of_range", "invalid_amount", "missing_value", "future_date", "negative_amount",
    ]);
    const report = errorReportRows(rows);
    expect(report).toHaveLength(6);
    expect(report[0]).toMatchObject({ "Source row": 2, Status: "invalid", "Sub Order No": "2001_1" });
  });

  it("keeps unknown statuses as warnings, excluded from revenue", async () => {
    const csv = [MEESHO_HEADER, "DISPUTE_RAISED,3001_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_orders");
    expect(rows[0].status).toBe("valid");
    expect((rows[0].normalized as OrderLineRecord).status).toBe("unknown");
    expect(rows[0].warnings[0].code).toBe("unknown_status");
  });

  it("finds the header below title rows and reads day-first dates", async () => {
    const csv = ["Meesho Supplier Panel export", "Generated 16/10/2026", "", MEESHO_HEADER,
      "DELIVERED,4001_1,1,05-10-2026,Meesho,Goa,Frame,PF-1,S,1,499,399,P1"].join("\n");
    const { rows, mapping } = await prepareCsv(csv, "meesho_orders");
    expect(mapping.headerRowIndex).toBe(2);
    expect((rows[0].normalized as OrderLineRecord).order_date).toBe("2026-10-05");
  });

  it("detects month-first files", async () => {
    const csv = [MEESHO_HEADER,
      "DELIVERED,5001_1,1,10/05/2026,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,5002_1,1,10/25/2026,Meesho,Goa,Frame,PF-1,S,1,499,399,P1"].join("\n");
    const { rows, summary } = await prepareCsv(csv, "meesho_orders", { today: "2026-12-01" });
    expect(summary.warnings.map((w) => w.code)).toContain("date_order_mdy");
    expect((rows[0].normalized as OrderLineRecord).order_date).toBe("2026-10-05");
  });

  it("supports renamed columns through configured aliases", async () => {
    const renamed = MEESHO_CSV.replace("Sub Order No", "Suborder Reference");
    const plain = await prepareCsv(renamed, "meesho_orders");
    expect(plain.summary.unmappedRequired).toEqual(["Sub Order No"]);
    const settings = settingsSchema.parse({ imports: { customAliases: { meesho_orders: { sub_order_no: ["Suborder Reference"] } } } });
    const configured = await prepareCsv(renamed, "meesho_orders", { settings });
    expect(configured.summary.unmappedRequired).toEqual([]);
    expect(configured.summary.validRows).toBe(4);
  });

  it("lets the user override a mapping", async () => {
    const { mapping } = await prepareCsv(MEESHO_CSV, "meesho_orders", { fields: { listed_price: null } });
    expect(mapping.fields.listed_price).toBeNull();
  });

  it("reads Windows-1252 and BOM-prefixed files", async () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...enc(MEESHO_CSV)]);
    const doc = await readDocument("orders.csv", bom);
    expect(doc.tables[0].rows[0][0]).toBe("Reason for Credit Entry");
    const latin = new Uint8Array([...enc(`${MEESHO_HEADER}\nDELIVERED,6001_1,1,2026-10-01,Meesho,Goa,Caf`), 0xe9, ...enc(" Frame,PF-1,S,1,499,399,P1")]);
    const { rows } = prepareImport({ ...base, reportType: "meesho_orders", table: (await readDocument("o.csv", latin)).tables[0] });
    expect((rows[0].normalized as OrderLineRecord).product_name).toBe("Café Frame");
  });
});

describe("Meesho settlement report", () => {
  const header = "Sub Order No,Transaction ID,Payment Date,Live Order Status,Final Settlement Amount,Total Sale Amount (Incl. Shipping & GST),Meesho Commission (Incl. GST),Fixed Fee (Incl. GST),Shipping Charge (Incl. GST),TCS,TDS";

  it("detects deductions shown as negative numbers and splits components", async () => {
    const csv = [header,
      "149532165782_1,UTR001,2026-10-10,DELIVERED,349.50,399.00,0,-20.00,-25.00,-3.50,-1.00",
      "149532165784_1,UTR001,2026-10-10,RTO,-60.00,0,0,0,-60.00,0,0",
    ].join("\n");
    const { rows, summary } = await prepareCsv(csv, "meesho_settlements");
    expect(summary.validRows).toBe(2);
    const first = rows[0].normalized as SettlementLineRecord;
    expect(first).toMatchObject({ external_settlement_id: "UTR001", settlement_date: "2026-10-10", net_amount: "349.50", external_line_id: "149532165782_1" });
    expect(first.components).toEqual([
      { type: "sale", amount: "399.00" },
      { type: "platform_fee", amount: "-20.00" },
      { type: "shipping_fee", amount: "-25.00" },
      { type: "tcs", amount: "-3.50" },
      { type: "tds", amount: "-1.00" },
    ]);
    expect(summary.warnings.find((w) => w.code === "sign_convention")?.message).toContain("negative numbers");
  });

  it("detects deductions shown as positive amounts", async () => {
    const csv = [header, "149532165782_1,UTR9,2026-10-10,DELIVERED,349.50,399.00,0,20.00,25.00,3.50,1.00"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_settlements");
    const rec = rows[0].normalized as SettlementLineRecord;
    expect(rec.components.find((c) => c.type === "shipping_fee")?.amount).toBe("-25.00");
    expect(rec.components.reduce((t, c) => t + Number(c.amount), 0)).toBeCloseTo(349.5, 2);
  });

  it("records an unexplained remainder explicitly so components equal the payout", async () => {
    const csv = [header, "1_1,U1,2026-10-10,DELIVERED,340.00,399.00,0,-20.00,-25.00,-3.50,-1.00"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_settlements");
    const rec = rows[0].normalized as SettlementLineRecord;
    expect(rec.components.find((c) => c.type === "adjustment")?.amount).toBe("-9.50");
    expect(rows[0].warnings.map((w) => w.code)).toContain("unexplained_remainder");
  });

  it("skips lines that have not been paid yet", async () => {
    const csv = [header, "1_1,,,DELIVERED,349.50,399.00,0,-20,-25,-3.5,-1"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_settlements");
    expect(rows[0].status).toBe("invalid");
    expect(rows[0].errors[0].code).toBe("not_yet_paid");
  });

  it("recognises the same payment even if only the order status changed", async () => {
    const a = await prepareCsv([header, "1_1,U1,2026-10-10,DELIVERED,349.50,399.00,0,-20,-25,-3.5,-1"].join("\n"), "meesho_settlements");
    const b = await prepareCsv([header, "1_1,U1,2026-10-10,RETURNED,349.50,399.00,0,-20,-25,-3.5,-1"].join("\n"), "meesho_settlements");
    expect(a.rows[0].fingerprint).toBe(b.rows[0].fingerprint);
  });

  it("keeps genuinely repeated identical lines distinct", async () => {
    const line = "1_1,U1,2026-10-10,DELIVERED,-10.00,0,0,0,-10.00,0,0";
    const { rows } = await prepareCsv([header, line, line].join("\n"), "meesho_settlements");
    expect(rows.every((r) => r.status === "valid")).toBe(true);
    expect(rows[0].fingerprint).not.toBe(rows[1].fingerprint);
  });

  it("stores net-only rows as unclassified (excluded from fee totals)", async () => {
    const csv = ["Sub Order No,Payment Date,Final Settlement Amount", "1_1,2026-10-10,350.00"].join("\n");
    const { rows, summary } = await prepareCsv(csv, "meesho_settlements");
    expect((rows[0].normalized as SettlementLineRecord).components).toEqual([{ type: "unclassified", amount: "350.00" }]);
    expect(summary.warnings.map((w) => w.code)).toContain("no_breakdown");
  });
});

describe("other adapters", () => {
  it("classifies returns vs RTO", async () => {
    const csv = ["Sub Order No,Return Type,Return Status,Return Created Date,Return Reason",
      "1_1,Courier Return (RTO),RTO Delivered,05-10-2026,Customer unavailable",
      "2_1,Customer Return,Return Picked Up,06-10-2026,Wrong size",
      "3_1,Customer Return,Return Delivered,07-10-2026,Damaged"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_returns");
    expect(rows.map((r) => (r.normalized as { status: string }).status)).toEqual(["rto", "return_requested", "returned"]);
  });

  it("imports Meta daily rows and rejects multi-day summaries and totals", async () => {
    const csv = ["Reporting starts,Reporting ends,Campaign name,Ad set name,Ad name,Amount spent (INR),Impressions,Clicks (all),Purchases,Purchases conversion value",
      "2026-10-01,2026-10-01,Diwali,Broad,Video 1,250.50,10000,120,3,1497",
      "2026-10-01,2026-10-07,Diwali,Broad,Video 1,1750,70000,800,20,9980"].join("\n");
    const { rows } = await prepareCsv(csv, "meta_ads");
    expect(rows[0]).toMatchObject({ status: "valid", normalized: { spend: "250.50", impressions: 10000, metric_date: "2026-10-01" } });
    expect(rows[1].errors[0].code).toBe("multi_day_row");
  });

  it("classifies fee statements and never treats charges as credits", async () => {
    const csv = ["Date,Type,Amount,Reference", "05-10-2026,Ads Cost,500,INV1", "06-10-2026,Late dispatch penalty,50,INV2", "07-10-2026,Claim settled,120,CLM1"].join("\n");
    const { rows } = await prepareCsv(csv, "platform_fees");
    expect(rows.map((r) => (r.normalized as SettlementLineRecord).components[0])).toEqual([
      { type: "ads_fee", amount: "-500.00" },
      { type: "penalty", amount: "-50.00" },
      { type: "claim", amount: "120.00" },
    ]);
    expect((rows[0].normalized as SettlementLineRecord).settlement_kind).toBe("fee_statement");
  });
});

describe("file readers", () => {
  it("rejects unsupported or mislabelled files", () => {
    expect(() => detectFormat("photo.jpg", enc("x"))).toThrow(ImportFileError);
    expect(() => detectFormat("orders.csv", enc("%PDF-1.7 ..."))).toThrow(/contents are PDF/);
    expect(() => detectFormat("orders.xlsx", enc("a,b,c"))).toThrow(/valid XLSX/);
    expect(() => detectFormat("orders.csv", new Uint8Array([0x61, 0x00, 0x62]))).toThrow(/not a text CSV/);
  });

  it("reads XLSX numbers, text and date-formatted cells without timezone drift", async () => {
    const ws = XLSX.utils.aoa_to_sheet([MEESHO_HEADER.split(","), ["DELIVERED", "7001_1", 1, new Date(Date.UTC(2026, 9, 1)), "Meesho", "Goa", "Frame", "PF-1", "S", 1, 499.5, 399.99, "P1"]], { cellDates: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Summary"]]), "Summary");
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    const doc = await readDocument("orders.xlsx", bytes);
    expect(doc.tables.map((t) => t.name)).toEqual(["Summary", "Orders"]);
    const [best] = detectReportTypes(doc.tables, DEFAULT_SETTINGS);
    expect(best.tableIndex).toBe(1);
    const { rows } = prepareImport({ ...base, reportType: "meesho_orders", table: doc.tables[1] });
    expect(rows[0].normalized).toMatchObject({ order_date: "2026-10-01", sale_amount: "399.99", listed_amount: "499.50" });
  });

  it("rebuilds a table from a text PDF and requires review", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.addPage([900, 600]);
    const cells = [
      ["Reason for Credit Entry", "Sub Order No", "Order Date", "SKU", "Quantity", "Supplier Discounted Price"],
      ["DELIVERED", "8001_1", "01-10-2026", "PF-1", "1", "399.00"],
      ["RTO_LOCKED", "8002_1", "02-10-2026", "PF-2", "2", "798.00"],
    ];
    page.drawText("Order report — page 1", { x: 40, y: 580, size: 12, font });
    cells.forEach((r, i) => r.forEach((c, j) => page.drawText(c, { x: 30 + j * 145, y: 540 - i * 18, size: 9, font })));
    const doc = await readDocument("orders.pdf", await pdf.save());
    expect(doc.format).toBe("pdf");
    expect(doc.warnings[0]).toMatch(/reconstructed/);
    const { rows, summary } = prepareImport({ ...base, reportType: "meesho_orders", table: doc.tables[0], requiresReview: true });
    expect(summary).toMatchObject({ validRows: 2, needsReview: true });
    expect(rows.map((r) => (r.normalized as OrderLineRecord).external_line_id)).toEqual(["8001_1", "8002_1"]);
  });

  it("detects image-only (scanned) PDFs instead of importing nothing silently", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([600, 800]);
    await expect(readDocument("scan.pdf", await pdf.save())).rejects.toMatchObject({ code: "pdf_no_text" });
  });

  it("rejects a corrupt PDF", async () => {
    await expect(readDocument("bad.pdf", enc("%PDF-1.7\nnot really a pdf"))).rejects.toBeInstanceOf(ImportFileError);
  });

  it("joins wrapped PDF lines to the row above", () => {
    const line = (y: number, cells: [string, number][]) => ({ y, page: 1, cells: cells.map(([text, x0]) => ({ text, x0, x1: x0 + 40 })) });
    const table: RawTable = linesToTable([
      line(500, [["Sub Order No", 10], ["Product Name", 100], ["Amount", 300]]),
      line(480, [["1_1", 10], ["Wooden photo", 100], ["399", 300]]),
      line(470, [["frame 8x10", 100]]),
    ], "p");
    expect(table.rows).toEqual([["Sub Order No", "Product Name", "Amount"], ["1_1", "Wooden photo frame 8x10", "399"]]);
  });
});
