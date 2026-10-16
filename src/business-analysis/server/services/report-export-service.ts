import "server-only";
import { describePolicy } from "../../domain/accounting-policy";
import { formatDateIN, formatDateTimeIN } from "../../domain/dates";
import { computeCashFlow, expenseBreakdown } from "../../domain/financial-calculations";
import { dec, formatCompactINR, formatINR, formatPercent } from "../../domain/money";
import { bucketForRange } from "../../domain/periods";
import { profitAndLossStatement, verifyStatement } from "../../domain/statements";
import { CASH_TXN_LABELS, ORDER_STATUS_LABELS, RECON_STATUS_LABELS, type CashTxnType, type OrderStatus } from "../../domain/statuses";
import { errorReportRows } from "../../imports/pipeline";
import type { ExportRequest } from "../../schemas";
import type { BusinessContext } from "../auth";
import { AppError } from "../errors";
import { log } from "../logger";
import { PdfReport, type PdfCell, type PdfColumn } from "../reports/pdf";
import { toCsv, toXlsx, type TableData } from "../reports/tabular";
import { listCashTransactions } from "./cash-flow-service";
import { getPeriodPnl, getSkuProfitability } from "./dashboard-service";
import { listExpenses } from "./expense-service";
import { buildSeries } from "./financial-data";
import { importErrorRows } from "./import-service";
import { getInventorySnapshot } from "./inventory-service";
import { listOrderLines } from "./order-service";
import { listReconciliationLines } from "./reconciliation-service";

const LIMITATIONS = [
  "These are management figures for decision-making, not audited financial statements.",
  "Product costs are recipe-based estimates unless an actual cost was recorded for the order line.",
  "Platform fees, shipping and deductions are included only where a settlement report has been imported; recent orders may not have one yet.",
  "Advertising-platform attributed revenue is the platform's own attribution. It is never added to sales.",
  "Depreciation and income tax are not calculated automatically; net profit is an estimate unless income tax is recorded.",
];

export type ExportFile = { body: Uint8Array | string; contentType: string; fileName: string };

const MAX_EXPORT_ROWS = 20_000;

async function collect<T>(fetchPage: (page: number) => Promise<{ rows: T[]; total: number }>, pageSize: number): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const { rows, total } = await fetchPage(page);
    out.push(...rows);
    if (rows.length < pageSize || out.length >= total) break;
    if (out.length >= MAX_EXPORT_ROWS) throw new AppError("too_large", `More than ${MAX_EXPORT_ROWS.toLocaleString("en-IN")} rows; narrow the date range.`);
  }
  return out;
}

const money = (v: string | null | undefined) => (v === null || v === undefined ? "" : v);
const d = (iso: string | null | undefined) => (iso ? formatDateIN(String(iso).slice(0, 10)) : "");

export async function buildExport(ctx: BusinessContext, req: ExportRequest): Promise<ExportFile> {
  const filters = { preset: req.preset, from: req.from, to: req.to, channel: req.channel, sku: req.sku, status: req.status, settlement: req.settlement };
  const base = await getPeriodPnl(ctx, filters);
  const { pnl, settings, filters: resolved } = base;
  const period = resolved.period.current;
  const periodLabel = `${formatDateIN(period.from)} – ${formatDateIN(period.to)}`;
  const generated = formatDateTimeIN(new Date(), ctx.business.timeZone);
  const stamp = `${period.from}_${period.to}`;

  const tables: TableData[] = [];
  let pdf: ((r: PdfReport) => Promise<void> | void) | null = null;
  let title = "Report";

  const statement = profitAndLossStatement(pnl);
  const mismatches = verifyStatement(statement);
  if (mismatches.length > 0) {
    // Never ship a statement whose lines do not add up.
    log.error("statement_mismatch", { mismatches });
    throw new AppError("internal", "The statement failed its arithmetic self-check; export cancelled.");
  }
  const statementTable: TableData = {
    name: "Profit and loss",
    columns: [
      { key: "section", label: "Section" },
      { key: "line", label: "Line" },
      { key: "amount", label: "Amount (INR)", format: "money" },
      { key: "note", label: "Note" },
    ],
    rows: statement.map((r) => ({ section: r.section, line: r.line, amount: money(r.amount), note: r.note ?? "" })),
  };
  const pdfStatement = (r: PdfReport) => {
    r.heading("Profit and loss");
    const cols: PdfColumn[] = [{ label: "Line", width: 5 }, { label: "Amount", width: 2, align: "right" }, { label: "Note", width: 4 }];
    const rows: PdfCell[][] = statement.map((s) => [
      { text: s.kind === "item" ? `   ${s.line}` : s.line, bold: s.kind !== "item" && s.kind !== "note" },
      { text: s.amount === null ? "—" : formatINR(s.amount), negative: s.amount !== null && dec(s.amount).isNegative(), bold: s.kind === "total" || s.kind === "subtotal" },
      { text: s.note ?? "" },
    ]);
    r.table(cols, rows);
  };
  const pdfKpis = (r: PdfReport) =>
    r.kpis([
      { label: "Net sales (excl. GST)", value: formatINR(pnl.revenue.netSales, { decimals: 0 }) },
      { label: "Gross profit", value: formatINR(pnl.grossProfit, { decimals: 0 }), negative: dec(pnl.grossProfit).isNegative(), note: pnl.margins.gross ? `${formatPercent(pnl.margins.gross)} margin` : undefined },
      { label: "Operating profit", value: pnl.operatingProfit === null ? "—" : formatINR(pnl.operatingProfit, { decimals: 0 }), negative: pnl.operatingProfit !== null && dec(pnl.operatingProfit).isNegative() },
      { label: pnl.netProfitIsEstimate ? "Net profit (estimate)" : "Net profit", value: pnl.netProfit === null ? "—" : formatINR(pnl.netProfit, { decimals: 0 }), negative: pnl.netProfit !== null && dec(pnl.netProfit).isNegative(), note: pnl.margins.net ? `${formatPercent(pnl.margins.net)} margin` : undefined },
      { label: "Total expenses", value: pnl.totalExpenses === null ? "—" : formatINR(pnl.totalExpenses, { decimals: 0 }) },
      { label: "Advertising", value: pnl.advertising.total === null ? "—" : formatINR(pnl.advertising.total, { decimals: 0 }) },
      { label: "Delivered order lines", value: pnl.counts.deliveredLines.toLocaleString("en-IN") },
      { label: "Return/RTO rate", value: formatPercent(pnl.rates.returnRtoRate) },
    ]);
  const pdfAssumptions = (r: PdfReport) => {
    r.heading("Accounting assumptions");
    r.paragraphs(describePolicy(settings, base.settingsEffectiveFrom));
    r.heading("Limitations");
    r.paragraphs(LIMITATIONS);
  };
  const seriesTable = (bucket: "week" | "month"): TableData => {
    const points = buildSeries(base.days, period, bucket, settings, resolved.segment);
    return {
      name: bucket === "week" ? "Weekly summary" : "Monthly summary",
      columns: [
        { key: "period", label: bucket === "week" ? "Week commencing" : "Month" },
        { key: "netSales", label: "Net sales", format: "money" },
        { key: "grossProfit", label: "Gross profit", format: "money" },
        { key: "costs", label: "Total expenses", format: "money" },
        { key: "profit", label: resolved.segment ? "Contribution" : "Net profit", format: "money" },
        { key: "margin", label: "Margin %", format: "percent" },
        { key: "delivered", label: "Delivered lines", format: "number" },
        { key: "returnRate", label: "Return/RTO %", format: "percent" },
        { key: "ads", label: "Advertising", format: "money" },
      ],
      rows: points.map((p) => ({
        period: p.label,
        netSales: p.pnl.revenue.netSales,
        grossProfit: p.pnl.grossProfit,
        costs: money(p.pnl.totalExpenses),
        profit: money(resolved.segment ? p.pnl.contributionBeforeAds : p.pnl.netProfit),
        margin: money(resolved.segment ? p.pnl.margins.contribution : p.pnl.margins.net),
        delivered: p.pnl.counts.deliveredLines,
        returnRate: money(p.pnl.rates.returnRtoRate),
        ads: money(p.pnl.advertising.total),
      })),
    };
  };
  const pdfSeries = (r: PdfReport, t: TableData) => {
    r.heading(t.name);
    r.barChart(t.rows.map((x) => String(x.period)), [
      { name: "Net sales", values: t.rows.map((x) => Number(x.netSales || 0)) },
      { name: resolved.segment ? "Contribution" : "Net profit", values: t.rows.map((x) => Number(x.profit || 0)) },
    ], (v) => formatCompactINR(String(v)));
    r.table(
      t.columns.map((c) => ({ label: c.label, width: c.key === "period" ? 2.2 : 1.3, align: c.format && c.format !== "text" ? "right" : "left" })),
      t.rows.map((row) => t.columns.map((c) => {
        const v = row[c.key];
        if (c.format === "money") return { text: v === "" || v === undefined ? "—" : formatINR(String(v), { decimals: 0 }), negative: dec(String(v || 0)).isNegative() };
        if (c.format === "percent") return { text: v === "" ? "—" : formatPercent(String(v)) };
        return { text: String(v ?? "") };
      })),
      { size: 7 },
    );
  };

  switch (req.report) {
    case "profit_loss": {
      title = "Profit and loss statement";
      tables.push(statementTable);
      const breakdown = expenseBreakdown(pnl);
      tables.push({ name: "Expense breakdown", columns: [{ key: "label", label: "Cost" }, { key: "amount", label: "Amount (INR)", format: "money" }], rows: breakdown.map((b) => ({ label: b.label, amount: b.amount })) });
      const monthly = seriesTable(bucketForRange(period.from, period.to) === "month" ? "month" : "week");
      tables.push(monthly);
      const orders = await collect((page) => listOrderLines(ctx, { ...filters, page, pageSize: 200, dir: "desc", sort: "order_date" }), 200);
      pdf = async (r) => {
        pdfKpis(r);
        pdfStatement(r);
        r.heading("Expense breakdown");
        r.table([{ label: "Cost", width: 4 }, { label: "Amount", width: 2, align: "right" }, { label: "Share", width: 1.2, align: "right" }],
          breakdown.map((b) => [{ text: b.label }, { text: formatINR(b.amount) }, { text: pnl.totalExpenses && !dec(pnl.totalExpenses).isZero() ? formatPercent(dec(b.amount).dividedBy(pnl.totalExpenses).times(100)) : "—" }]));
        pdfSeries(r, monthly);
        r.heading(`Appendix: order lines (${orders.length.toLocaleString("en-IN")}${orders.length >= 300 ? ", first 300 shown" : ""})`);
        r.table(
          [{ label: "Date", width: 1.3 }, { label: "Sub-order", width: 2.2 }, { label: "SKU", width: 1.8 }, { label: "Status", width: 1.4 }, { label: "Sale", width: 1.3, align: "right" }, { label: "Cost", width: 1.3, align: "right" }, { label: "Contribution", width: 1.5, align: "right" }],
          orders.slice(0, 300).map((o) => [
            { text: d(o.orderDate) }, { text: o.externalLineId }, { text: o.sku ?? "" }, { text: ORDER_STATUS_LABELS[o.status] },
            { text: formatINR(o.saleAmountExclGst) }, { text: formatINR(o.lineCost) }, { text: formatINR(o.contribution), negative: dec(o.contribution).isNegative() },
          ]),
          { size: 7 },
        );
        pdfAssumptions(r);
      };
      break;
    }
    case "weekly_summary":
    case "monthly_report": {
      const bucket = req.report === "weekly_summary" ? "week" : "month";
      title = bucket === "week" ? "Weekly business summary" : "Monthly financial report";
      const t = seriesTable(bucket);
      tables.push(t, statementTable);
      pdf = (r) => {
        pdfKpis(r);
        pdfSeries(r, t);
        pdfStatement(r);
        pdfAssumptions(r);
      };
      break;
    }
    case "product_profitability": {
      title = "Product profitability";
      const skus = await getSkuProfitability(ctx, period, settings, req.channel);
      const t: TableData = {
        name: "Product profitability",
        columns: [
          { key: "sku", label: "SKU" }, { key: "product", label: "Product" }, { key: "lines", label: "Order lines", format: "number" },
          { key: "kept", label: "Kept sales", format: "number" }, { key: "lost", label: "Returned/RTO/lost", format: "number" },
          { key: "netSales", label: "Net sales", format: "money" }, { key: "cogs", label: "COGS", format: "money" },
          { key: "loss", label: "Return/RTO loss", format: "money" }, { key: "deductions", label: "Platform deductions", format: "money" },
          { key: "contribution", label: "Contribution (before ads)", format: "money" }, { key: "margin", label: "Margin %", format: "percent" },
          { key: "missing", label: "Lines without cost", format: "number" },
        ],
        rows: skus.map((s) => ({
          sku: s.sku, product: s.productName ?? "", lines: s.lines, kept: s.netSoldLines, lost: s.lossLines, netSales: s.netSales, cogs: s.cogs,
          loss: s.lossCost, deductions: s.deductions, contribution: s.contribution, margin: money(s.margin), missing: s.missingCostLines,
        })),
      };
      tables.push(t);
      pdf = (r) => {
        r.table(
          [{ label: "SKU", width: 2 }, { label: "Kept", width: 0.8, align: "right" }, { label: "Lost", width: 0.8, align: "right" }, { label: "Net sales", width: 1.5, align: "right" }, { label: "COGS", width: 1.4, align: "right" }, { label: "Deductions", width: 1.4, align: "right" }, { label: "Contribution", width: 1.6, align: "right" }, { label: "Margin", width: 1, align: "right" }],
          skus.map((s) => [{ text: s.sku }, { text: String(s.netSoldLines) }, { text: String(s.lossLines) }, { text: formatINR(s.netSales) }, { text: formatINR(s.cogs) }, { text: formatINR(s.deductions) }, { text: formatINR(s.contribution), negative: dec(s.contribution).isNegative() }, { text: formatPercent(s.margin) }]),
          { size: 7 },
        );
        pdfAssumptions(r);
      };
      break;
    }
    case "expense_breakdown":
    case "expenses": {
      title = req.report === "expenses" ? "Expense ledger" : "Expense breakdown";
      const list = await collect((page) => listExpenses(ctx, { from: period.from, to: period.to, page, pageSize: 500, dir: "desc" }), 500);
      const breakdown = expenseBreakdown(pnl);
      const ledger: TableData = {
        name: "Expenses",
        columns: [
          { key: "date", label: "Date" }, { key: "category", label: "Category" }, { key: "vendor", label: "Vendor" },
          { key: "amount", label: "Amount (INR)", format: "money" }, { key: "tax", label: "Tax", format: "money" },
          { key: "taxTreatment", label: "Tax treatment" }, { key: "paymentStatus", label: "Payment" }, { key: "paymentDate", label: "Paid on" },
          { key: "method", label: "Method" }, { key: "reference", label: "Reference" }, { key: "deducted", label: "Deducted by platform" },
          { key: "status", label: "Status" }, { key: "notes", label: "Notes" },
        ],
        rows: list.map((e) => ({
          date: d(e.expense_date), category: e.expense_categories?.name ?? "", vendor: e.vendor ?? "", amount: String(e.amount), tax: String(e.tax_amount),
          taxTreatment: e.tax_treatment, paymentStatus: e.payment_status, paymentDate: d(e.payment_date), method: e.payment_method ?? "",
          reference: e.reference_number ?? "", deducted: e.reflected_in_settlement ? "yes" : "no",
          status: e.reversal_of_id ? "reversal" : e.status, notes: e.notes ?? "",
        })),
      };
      const breakdownTable: TableData = { name: "Breakdown", columns: [{ key: "label", label: "Cost" }, { key: "amount", label: "Amount (INR)", format: "money" }], rows: breakdown.map((b) => ({ label: b.label, amount: b.amount })) };
      if (req.report === "expenses") tables.push(ledger, breakdownTable);
      else tables.push(breakdownTable, ledger);
      pdf = (r) => {
        r.heading("Costs in profit");
        r.table([{ label: "Cost", width: 4 }, { label: "Amount", width: 2, align: "right" }], breakdown.map((b) => [{ text: b.label }, { text: formatINR(b.amount) }]));
        r.heading(`Expense entries (${list.length})`);
        r.table(
          [{ label: "Date", width: 1.2 }, { label: "Category", width: 2 }, { label: "Vendor", width: 2.2 }, { label: "Amount", width: 1.4, align: "right" }, { label: "Payment", width: 1.1 }, { label: "Status", width: 1.1 }],
          list.slice(0, 500).map((e) => [{ text: d(e.expense_date) }, { text: e.expense_categories?.name ?? "" }, { text: e.vendor ?? "" }, { text: formatINR(String(e.amount)), negative: Number(e.amount) < 0 }, { text: e.payment_status }, { text: e.reversal_of_id ? "reversal" : e.status }]),
          { size: 7 },
        );
        pdfAssumptions(r);
      };
      break;
    }
    case "reconciliation": {
      title = "Meesho reconciliation";
      const lines = await collect((page) => listReconciliationLines(ctx, period, settings, { page, pageSize: 500 }), 500);
      tables.push({
        name: "Reconciliation",
        columns: [
          { key: "date", label: "Order date" }, { key: "line", label: "Sub-order" }, { key: "order", label: "Order" }, { key: "sku", label: "SKU" },
          { key: "status", label: "Order status" }, { key: "expected", label: "Expected (sale value)", format: "money" },
          { key: "settledSale", label: "Settled sale", format: "money" }, { key: "deductions", label: "Deductions", format: "money" },
          { key: "taxes", label: "TCS/TDS", format: "money" }, { key: "net", label: "Net settled", format: "money" },
          { key: "difference", label: "Difference", format: "money" }, { key: "recon", label: "Reconciliation" },
          { key: "settlements", label: "Settlements", format: "number" }, { key: "last", label: "Last settled" },
        ],
        rows: lines.map((l) => ({
          date: d(l.orderDate), line: l.externalLineId, order: l.externalOrderId, sku: l.sku ?? "", status: ORDER_STATUS_LABELS[l.status as OrderStatus] ?? l.status,
          expected: l.expected, settledSale: l.settledSale, deductions: l.deductions, taxes: l.taxesWithheld, net: l.settledNet,
          difference: l.difference, recon: RECON_STATUS_LABELS[l.settlementStatus], settlements: l.settlementCount, last: d(l.lastSettlementDate),
        })),
      });
      pdf = (r) => {
        r.table(
          [{ label: "Sub-order", width: 2.2 }, { label: "Status", width: 1.2 }, { label: "Expected", width: 1.3, align: "right" }, { label: "Settled", width: 1.3, align: "right" }, { label: "Difference", width: 1.3, align: "right" }, { label: "Result", width: 1.8 }],
          lines.slice(0, 1500).map((l) => [{ text: l.externalLineId }, { text: ORDER_STATUS_LABELS[l.status as OrderStatus] ?? l.status }, { text: formatINR(l.expected) }, { text: formatINR(l.settledSale) }, { text: formatINR(l.difference), negative: dec(l.difference).isNegative() }, { text: RECON_STATUS_LABELS[l.settlementStatus] }]),
          { size: 7 },
        );
      };
      break;
    }
    case "inventory": {
      title = "Inventory report";
      const inv = await getInventorySnapshot(ctx, settings, period.to);
      tables.push({
        name: "Inventory",
        columns: [
          { key: "name", label: "Material" }, { key: "sku", label: "SKU" }, { key: "category", label: "Category" }, { key: "unit", label: "Unit" },
          { key: "quantity", label: "Ledger quantity", format: "number" }, { key: "estimated", label: "Estimated quantity", format: "number" },
          { key: "avg", label: "Weighted avg cost", format: "money" }, { key: "value", label: "Value (INR)", format: "money" },
          { key: "estimatedValue", label: "Estimated value", format: "money" }, { key: "reorder", label: "Reorder at", format: "number" },
          { key: "low", label: "Low stock" }, { key: "last", label: "Last movement" },
        ],
        rows: inv.items.map((i) => ({
          name: i.name, sku: i.sku ?? "", category: i.category, unit: i.unit, quantity: i.quantity, estimated: i.estimatedQuantity ?? "",
          avg: i.averageUnitCost ?? "", value: i.value, estimatedValue: i.estimatedValue ?? "", reorder: i.reorderThreshold,
          low: i.belowReorder ? "yes" : "", last: d(i.lastMovementDate),
        })),
      });
      pdf = (r) => {
        r.kpis([{ label: "Stock value (ledger)", value: formatINR(inv.totalValue, { decimals: 0 }) }, { label: inv.isEstimate ? "Estimated value" : "Valuation", value: formatINR(inv.totalEstimatedValue ?? inv.totalValue, { decimals: 0 }), note: inv.isEstimate ? "After estimated usage" : "Weighted average" }, { label: "Low-stock items", value: String(inv.lowStock.length) }, { label: "As of", value: formatDateIN(inv.asOf) }]);
        r.table(
          [{ label: "Material", width: 3 }, { label: "Qty", width: 1.2, align: "right" }, { label: "Est. qty", width: 1.2, align: "right" }, { label: "Avg cost", width: 1.3, align: "right" }, { label: "Value", width: 1.4, align: "right" }, { label: "Reorder", width: 1, align: "right" }],
          inv.items.map((i) => [{ text: `${i.name}${i.belowReorder ? " (low)" : ""}`, negative: i.belowReorder }, { text: `${i.quantity} ${i.unit}` }, { text: i.estimatedQuantity ?? "—" }, { text: i.averageUnitCost ? formatINR(i.averageUnitCost) : "—" }, { text: formatINR(i.value) }, { text: i.reorderThreshold }]),
          { size: 7.5 },
        );
      };
      break;
    }
    case "cash_flow": {
      title = "Cash flow statement";
      const txns = await collect((page) => listCashTransactions(ctx, { from: period.from, to: period.to, page, pageSize: 500 }), 500);
      const summary = computeCashFlow(base.inputs.cash);
      tables.push({
        name: "Cash flow",
        columns: [{ key: "direction", label: "Direction" }, { key: "type", label: "Type" }, { key: "amount", label: "Amount (INR)", format: "money" }, { key: "entries", label: "Entries", format: "number" }],
        rows: [
          ...summary.inflows.map((x) => ({ direction: "In", type: CASH_TXN_LABELS[x.txnType], amount: x.amount, entries: x.entries })),
          ...summary.outflows.map((x) => ({ direction: "Out", type: CASH_TXN_LABELS[x.txnType], amount: x.amount, entries: x.entries })),
          { direction: "", type: "Net cash flow", amount: summary.net, entries: "" },
        ],
      });
      tables.push({
        name: "Transactions",
        columns: [{ key: "date", label: "Date" }, { key: "direction", label: "In/Out" }, { key: "type", label: "Type" }, { key: "amount", label: "Amount (INR)", format: "money" }, { key: "account", label: "Account" }, { key: "reference", label: "Reference" }, { key: "description", label: "Description" }, { key: "status", label: "Status" }],
        rows: txns.map((t) => ({
          date: d(String(t.txn_date)), direction: t.direction === "in" ? "In" : "Out", type: CASH_TXN_LABELS[t.txn_type as CashTxnType] ?? String(t.txn_type),
          amount: String(t.amount), account: String(t.payment_account ?? ""), reference: String(t.external_reference ?? ""), description: String(t.description ?? ""),
          status: t.voided_at ? `void: ${t.void_reason ?? ""}` : "active",
        })),
      });
      pdf = (r) => {
        r.kpis([{ label: "Cash in", value: formatINR(summary.totalIn, { decimals: 0 }) }, { label: "Cash out", value: formatINR(summary.totalOut, { decimals: 0 }) }, { label: "Net cash flow", value: formatINR(summary.net, { decimals: 0 }), negative: dec(summary.net).isNegative() }, { label: "Operating cash flow", value: formatINR(summary.operatingNet, { decimals: 0 }), negative: dec(summary.operatingNet).isNegative(), note: "Excludes capital & loans" }]);
        r.table([{ label: "Direction", width: 1 }, { label: "Type", width: 3 }, { label: "Amount", width: 2, align: "right" }, { label: "Entries", width: 1, align: "right" }],
          tables[0].rows.map((x) => [{ text: String(x.direction) }, { text: String(x.type), bold: x.type === "Net cash flow" }, { text: formatINR(String(x.amount)) }, { text: String(x.entries) }]));
        r.heading("Transactions");
        r.table([{ label: "Date", width: 1.2 }, { label: "In/Out", width: 0.8 }, { label: "Type", width: 2 }, { label: "Amount", width: 1.5, align: "right" }, { label: "Description", width: 3 }],
          txns.filter((t) => !t.voided_at).slice(0, 1000).map((t) => [{ text: d(String(t.txn_date)) }, { text: t.direction === "in" ? "In" : "Out" }, { text: CASH_TXN_LABELS[t.txn_type as CashTxnType] ?? "" }, { text: formatINR(String(t.amount)), negative: t.direction === "out" }, { text: String(t.description ?? "") }]),
          { size: 7 });
        r.paragraphs(["Cash is dated by payment or settlement date. Delivered orders are never treated as cash received until a settlement is recorded."]);
      };
      break;
    }
    case "orders": {
      title = "Order lines";
      const orders = await collect((page) => listOrderLines(ctx, { ...filters, page, pageSize: 200, dir: "desc", sort: "order_date" }), 200);
      tables.push({
        name: "Orders",
        columns: [
          { key: "date", label: "Order date" }, { key: "order", label: "Order" }, { key: "line", label: "Sub-order" }, { key: "channel", label: "Channel" },
          { key: "sku", label: "SKU" }, { key: "product", label: "Product" }, { key: "qty", label: "Qty", format: "number" }, { key: "status", label: "Status" },
          { key: "rawStatus", label: "Platform status" }, { key: "listed", label: "Listed (incl. GST)", format: "money" }, { key: "sale", label: "Sale (incl. GST)", format: "money" },
          { key: "saleExcl", label: "Sale (excl. GST)", format: "money" }, { key: "material", label: "Material", format: "money" }, { key: "packaging", label: "Packaging", format: "money" },
          { key: "costBasis", label: "Cost basis" }, { key: "fees", label: "Platform fees", format: "money" }, { key: "shipping", label: "Shipping", format: "money" },
          { key: "returns", label: "Return charges", format: "money" }, { key: "contribution", label: "Contribution", format: "money" },
          { key: "ads", label: "Allocated ads (estimate)", format: "money" }, { key: "settlement", label: "Settlement" },
        ],
        rows: orders.map((o) => ({
          date: d(o.orderDate), order: o.externalOrderId, line: o.externalLineId, channel: o.channel, sku: o.sku ?? "", product: o.productName ?? "", qty: o.quantity,
          status: ORDER_STATUS_LABELS[o.status], rawStatus: o.rawStatus ?? "", listed: o.listedAmount, sale: o.saleAmount, saleExcl: o.saleAmountExclGst,
          material: o.materialCost, packaging: o.packagingCost, costBasis: o.costBasis, fees: o.platformFees, shipping: o.shippingFees, returns: o.returnFees,
          contribution: o.contribution, ads: o.allocatedAdCost ?? "", settlement: RECON_STATUS_LABELS[o.settlementStatus],
        })),
      });
      break;
    }
    case "import_errors": {
      if (!req.importId) throw new AppError("bad_request", "Choose an import.");
      const { imp, rows } = await importErrorRows(ctx, req.importId);
      title = `Import report — ${imp.file_name}`;
      const report = errorReportRows(rows.map((r) => ({ sourceRowNumber: r.source_row_number, status: r.status, errors: r.errors, warnings: r.warnings, raw: r.raw })));
      const keys = report.length > 0 ? Object.keys(report[0]) : ["Source row", "Status", "Errors", "Warnings"];
      tables.push({ name: "Import issues", columns: keys.map((k) => ({ key: k, label: k })), rows: report });
      pdf = (r) => {
        r.kpis([{ label: "Rows", value: String(imp.total_rows) }, { label: "Valid", value: String(imp.valid_rows) }, { label: "Invalid", value: String(imp.invalid_rows) }, { label: "Duplicates", value: String(imp.duplicate_rows) }]);
        r.table([{ label: "Row", width: 0.7 }, { label: "Status", width: 1.4 }, { label: "Errors", width: 4 }, { label: "Warnings", width: 4 }],
          report.slice(0, 2000).map((x) => [{ text: String(x["Source row"]) }, { text: String(x.Status) }, { text: String(x.Errors), negative: Boolean(x.Errors) }, { text: String(x.Warnings) }]), { size: 7 });
      };
      break;
    }
  }

  const fileBase = `framely-${req.report.replace(/_/g, "-")}-${stamp}`;
  if (req.format === "csv") {
    return { body: toCsv(tables[0]), contentType: "text/csv; charset=utf-8", fileName: `${fileBase}.csv` };
  }
  if (req.format === "xlsx") {
    return { body: toXlsx(tables), contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName: `${fileBase}.xlsx` };
  }
  const report = await PdfReport.create({ title, business: ctx.business.name, period: periodLabel, generated });
  if (pdf) await pdf(report);
  else {
    const t = tables[0];
    report.table(t.columns.slice(0, 9).map((c) => ({ label: c.label, width: 1, align: c.format && c.format !== "text" ? "right" : "left" })),
      t.rows.slice(0, 2000).map((row) => t.columns.slice(0, 9).map((c) => ({ text: c.format === "money" && row[c.key] !== "" ? formatINR(String(row[c.key])) : String(row[c.key] ?? "") }))), { size: 6.5 });
  }
  return { body: await report.save(), contentType: "application/pdf", fileName: `${fileBase}.pdf` };
}
