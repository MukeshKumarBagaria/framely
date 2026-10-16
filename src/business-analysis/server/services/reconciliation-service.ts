import "server-only";
import { statusSets, type BusinessSettings } from "../../domain/accounting-policy";
import { addDays, minIso, todayIn } from "../../domain/dates";
import { dec, money } from "../../domain/money";
import type { ReconStatus } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcAll, rpcOne } from "../db";
import { unwrap } from "../errors";
import { toCount, toMoney } from "../mappers";

type SummaryRow = {
  settlement_status: string;
  lines: number;
  expected_amount: number | string | null;
  settled_sale: number | string | null;
  settled_net: number | string | null;
  deductions: number | string | null;
  taxes_withheld: number | string | null;
  outstanding: number | string | null;
};

export type ReconciliationSummary = {
  byStatus: Record<string, { lines: number; expected: string; settledSale: string; settledNet: string; deductions: string; taxesWithheld: string; outstanding: string }>;
  outstanding: string;
  expected: string;
  settledNet: string;
  unlinkedItems: number;
  unlinkedAmount: string;
  duplicateLines: number;
};

export async function getReconciliationSummary(ctx: BusinessContext, range: { from: string; to: string }, settings: BusinessSettings): Promise<ReconciliationSummary> {
  const rows = await rpcAll<SummaryRow>(ctx.supabase, "reconciliation_summary", {
    p_business_id: ctx.businessId,
    p_from: range.from,
    p_to: range.to,
    p_expected: statusSets(settings).expectedSettlement,
    p_tolerance: settings.settlements.reconciliationTolerance,
  }, ["settlement_status"]);
  const byStatus: ReconciliationSummary["byStatus"] = {};
  for (const r of rows) {
    byStatus[r.settlement_status] = {
      lines: toCount(r.lines),
      expected: toMoney(r.expected_amount),
      settledSale: toMoney(r.settled_sale),
      settledNet: toMoney(r.settled_net),
      deductions: toMoney(r.deductions),
      taxesWithheld: toMoney(r.taxes_withheld),
      outstanding: toMoney(r.outstanding),
    };
  }
  const lineStatuses = Object.entries(byStatus).filter(([k]) => k !== "unlinked_settlement_items");
  return {
    byStatus,
    outstanding: money(lineStatuses.reduce((t, [, v]) => t.plus(v.outstanding), dec(0))),
    expected: money(lineStatuses.reduce((t, [, v]) => t.plus(v.expected), dec(0))),
    settledNet: money(lineStatuses.reduce((t, [, v]) => t.plus(v.settledNet), dec(0))),
    unlinkedItems: byStatus.unlinked_settlement_items?.lines ?? 0,
    unlinkedAmount: byStatus.unlinked_settlement_items?.settledNet ?? "0.00",
    duplicateLines: byStatus.duplicate_suspected?.lines ?? 0,
  };
}

/** Delivered lines still unsettled after the expected settlement lag. */
export async function getOverdue(ctx: BusinessContext, range: { from: string; to: string }, settings: BusinessSettings) {
  const cutoff = addDays(todayIn(ctx.business.timeZone), -settings.settlements.expectedSettlementLagDays);
  const to = minIso(range.to, cutoff);
  if (to < range.from) return { lines: 0, amount: "0.00" };
  const summary = await getReconciliationSummary(ctx, { from: range.from, to }, settings);
  const u = summary.byStatus.unsettled;
  return { lines: u?.lines ?? 0, amount: u?.outstanding ?? "0.00" };
}

export type ReconLine = {
  orderItemId: string;
  externalLineId: string;
  externalOrderId: string;
  orderDate: string;
  sku: string | null;
  status: string;
  expected: string;
  settledSale: string;
  settledNet: string;
  deductions: string;
  taxesWithheld: string;
  difference: string;
  settlementCount: number;
  lastSettlementDate: string | null;
  settlementStatus: ReconStatus;
};

export async function listReconciliationLines(
  ctx: BusinessContext,
  range: { from: string; to: string },
  settings: BusinessSettings,
  opts: { status?: ReconStatus; search?: string | null; page: number; pageSize: number },
): Promise<{ rows: ReconLine[]; total: number }> {
  const res = await ctx.supabase.rpc("reconciliation_lines", {
    p_business_id: ctx.businessId,
    p_from: range.from,
    p_to: range.to,
    p_expected: statusSets(settings).expectedSettlement,
    p_tolerance: settings.settlements.reconciliationTolerance,
    p_status: opts.status ?? null,
    p_search: opts.search ?? null,
    p_limit: opts.pageSize,
    p_offset: (opts.page - 1) * opts.pageSize,
  });
  const rows = unwrap(res) as Record<string, unknown>[];
  return {
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    rows: rows.map((r) => ({
      orderItemId: String(r.order_item_id),
      externalLineId: String(r.external_line_id),
      externalOrderId: String(r.external_order_id),
      orderDate: String(r.order_date),
      sku: (r.sku as string | null) ?? null,
      status: String(r.status),
      expected: toMoney(r.expected_amount as number),
      settledSale: toMoney(r.settled_sale as number),
      settledNet: toMoney(r.settled_net as number),
      deductions: toMoney(r.deductions as number),
      taxesWithheld: toMoney(r.taxes_withheld as number),
      difference: toMoney(r.difference as number),
      settlementCount: toCount(r.settlement_count as number),
      lastSettlementDate: (r.last_settlement_date as string | null) ?? null,
      settlementStatus: r.settlement_status as ReconStatus,
    })),
  };
}

export async function listUnlinkedItems(ctx: BusinessContext, range: { from: string; to: string }, page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const res = await ctx.supabase
    .from("settlement_items")
    .select("id, external_line_id, transaction_type, amount, transaction_date, external_reference, description, row_fingerprint, settlements!inner(external_settlement_id, settlement_date, voided_at)", { count: "exact" })
    .eq("business_id", ctx.businessId)
    .is("order_item_id", null)
    .is("voided_at", null)
    .is("settlements.voided_at", null)
    .gte("transaction_date", range.from)
    .lte("transaction_date", range.to)
    .order("transaction_date", { ascending: false })
    .range(from, from + pageSize - 1);
  return { rows: unwrap(res) as Record<string, unknown>[], total: res.count ?? 0 };
}

export async function listSettlements(ctx: BusinessContext, range: { from: string; to: string }) {
  const res = await ctx.supabase
    .from("settlements")
    .select("id, platform, external_settlement_id, settlement_kind, settlement_date, gross_amount, deductions_amount, net_amount, status, bank_received_amount, bank_received_on, bank_reference")
    .eq("business_id", ctx.businessId)
    .is("voided_at", null)
    .gte("settlement_date", range.from)
    .lte("settlement_date", range.to)
    .order("settlement_date", { ascending: false })
    .limit(500);
  return unwrap(res) as {
    id: string; platform: string; external_settlement_id: string; settlement_kind: string; settlement_date: string | null;
    gross_amount: number; deductions_amount: number; net_amount: number; status: string;
    bank_received_amount: number | null; bank_received_on: string | null; bank_reference: string | null;
  }[];
}

export async function matchItem(ctx: BusinessContext, settlementItemId: string, orderItemId: string | null) {
  return rpcOne(ctx.supabase, "match_settlement_item", { p_settlement_item_id: settlementItemId, p_order_item_id: orderItemId });
}

export async function recordBankReceipt(ctx: BusinessContext, input: { settlement_id: string; amount: string; received_on: string; reference?: string | null }, settings: BusinessSettings) {
  return rpcOne<string>(ctx.supabase, "record_bank_receipt", {
    p_settlement_id: input.settlement_id,
    p_amount: input.amount,
    p_received_on: input.received_on,
    p_reference: input.reference ?? null,
    p_tolerance: settings.settlements.reconciliationTolerance,
  });
}
