import "server-only";
import { statusSets, type BusinessSettings } from "../../domain/accounting-policy";
import { allocatedAdCost } from "../../domain/allocation";
import { dec, money, type Money } from "../../domain/money";
import type { OrderStatus, ReconStatus } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { AppError, unwrap } from "../errors";
import { toCount, toMoney } from "../mappers";
import { getPeriodPnl, resolveFilters } from "./dashboard-service";
import type { Filters } from "../../schemas";

export type OrderLine = {
  id: string;
  orderId: string;
  externalOrderId: string;
  externalLineId: string;
  orderDate: string;
  channel: string;
  productId: string | null;
  productName: string | null;
  sku: string | null;
  quantity: number;
  status: OrderStatus;
  rawStatus: string | null;
  listedAmount: Money;
  saleAmount: Money;
  saleAmountExclGst: Money;
  gstRate: string;
  materialCost: Money;
  packagingCost: Money;
  otherCost: Money;
  lineCost: Money;
  costBasis: "missing" | "estimated" | "actual";
  platformFees: Money;
  shippingFees: Money;
  returnFees: Money;
  otherDeductions: Money;
  settledSale: Money;
  settledNet: Money;
  expectedSettlement: Money;
  settlementStatus: ReconStatus;
  contribution: Money;
  allocatedAdCost: Money | null;
  contributionAfterAds: Money | null;
  updatedAt: string;
};

const SORTS = ["order_date", "sale_amount", "contribution", "sku", "status", "updated_at"] as const;

export type OrderListQuery = Filters & {
  page: number;
  pageSize: number;
  sort?: string | null;
  dir: "asc" | "desc";
  search?: string | null;
  reconStatus?: ReconStatus;
  profitability?: "profitable" | "loss" | "breakeven";
};

export async function listOrderLines(ctx: BusinessContext, q: OrderListQuery) {
  const period = await getPeriodPnl(ctx, q);
  const { settings, pnl, filters } = period;
  const sets = statusSets(settings);
  const sort = SORTS.includes((q.sort ?? "") as (typeof SORTS)[number]) ? q.sort! : "order_date";
  const res = await ctx.supabase.rpc("order_lines_page", {
    p_business_id: ctx.businessId,
    p_from: filters.period.current.from,
    p_to: filters.period.current.to,
    p_net_sold: sets.netSold,
    p_loss: sets.loss,
    p_expected: sets.expectedSettlement,
    p_recovery_percent: settings.costs.returnedGoodsRecoveryPercent,
    p_tolerance: settings.settlements.reconciliationTolerance,
    p_channel: q.channel ?? null,
    p_sku: q.sku ?? null,
    p_statuses: q.status?.length ? q.status : null,
    p_settlement_status: q.reconStatus ?? (q.settlement === "unsettled" ? "unsettled" : null),
    p_profitability: q.profitability ?? null,
    p_search: q.search ?? null,
    p_sort: sort,
    p_desc: q.dir !== "asc",
    p_limit: q.pageSize,
    p_offset: (q.page - 1) * q.pageSize,
  });
  const rows = unwrap(res) as Record<string, unknown>[];

  // Advertising allocation uses the whole period's (unfiltered) spend and
  // sales, so a line's estimate does not depend on the current filter or page.
  const business = filters.segment
    ? await getPeriodPnl(ctx, { preset: q.preset, from: q.from, to: q.to })
    : period;
  const basis = {
    method: settings.advertising.allocationMethod,
    totalSpend: business.pnl.advertising.total ?? "0.00",
    periodNetSales: business.pnl.revenue.netSales,
    periodNetSoldLines: business.pnl.counts.netSoldLines,
  };

  const lines: OrderLine[] = rows.map((r) => {
    const status = r.status as OrderStatus;
    const revenue = toMoney(r.sale_amount_excl_gst as number);
    const contribution = toMoney(r.contribution as number);
    const alloc = allocatedAdCost({ status, revenueExclGst: revenue }, basis, sets);
    return {
      id: String(r.id),
      orderId: String(r.order_id),
      externalOrderId: String(r.external_order_id),
      externalLineId: String(r.external_line_id),
      orderDate: String(r.order_date),
      channel: String(r.channel),
      productId: (r.product_id as string | null) ?? null,
      productName: (r.product_name as string | null) ?? null,
      sku: (r.sku as string | null) ?? null,
      quantity: toCount(r.quantity as number),
      status,
      rawStatus: (r.raw_status as string | null) ?? null,
      listedAmount: toMoney(r.listed_amount as number),
      saleAmount: toMoney(r.sale_amount as number),
      saleAmountExclGst: revenue,
      gstRate: String(r.gst_rate),
      materialCost: toMoney(r.material_cost as number),
      packagingCost: toMoney(r.packaging_cost as number),
      otherCost: toMoney(r.other_cost as number),
      lineCost: toMoney(r.line_cost as number),
      costBasis: r.cost_basis as OrderLine["costBasis"],
      platformFees: money(dec(toMoney(r.platform_fees as number)).negated()),
      shippingFees: money(dec(toMoney(r.shipping_fees as number)).negated()),
      returnFees: money(dec(toMoney(r.return_fees as number)).negated()),
      otherDeductions: money(dec(toMoney(r.other_deductions as number)).negated()),
      settledSale: toMoney(r.settled_sale as number),
      settledNet: toMoney(r.settled_net as number),
      expectedSettlement: toMoney(r.expected_settlement as number),
      settlementStatus: r.settlement_status as ReconStatus,
      contribution,
      allocatedAdCost: alloc,
      contributionAfterAds: alloc === null ? null : money(dec(contribution).minus(alloc)),
      updatedAt: String(r.updated_at),
    };
  });

  return {
    rows: lines,
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    period: filters.period,
    allocation: basis,
    pnl,
    query: resolveFilters(ctx, q).query,
  };
}

export async function getOrderLine(ctx: BusinessContext, id: string, settings: BusinessSettings) {
  const item = unwrap(
    await ctx.supabase
      .from("sales_order_items")
      .select("*, sales_orders(id, external_order_id, order_date, customer_state, order_source, notes, channel), products(id, name, sku), product_recipes(id, version, effective_from)")
      .eq("business_id", ctx.businessId)
      .eq("id", id)
      .maybeSingle(),
  ) as (Record<string, unknown> & { order_id: string; sales_orders: Record<string, unknown> | null }) | null;
  if (!item) throw new AppError("not_found", "Order line not found.");

  const [siblings, history, settlementItems] = await Promise.all([
    ctx.supabase.from("sales_order_items").select("id, external_line_id, sku, product_name, quantity, status, sale_amount, voided_at")
      .eq("business_id", ctx.businessId).eq("order_id", item.order_id).order("external_line_id"),
    ctx.supabase.from("sales_order_status_history").select("id, previous_status, new_status, raw_status, changed_at, source, source_import_id, note")
      .eq("business_id", ctx.businessId).eq("order_item_id", id).order("changed_at"),
    ctx.supabase.from("settlement_items").select("id, transaction_type, amount, transaction_date, external_reference, match_type, voided_at, source_import_id, settlements(id, external_settlement_id, settlement_date, settlement_kind, status)")
      .eq("business_id", ctx.businessId).eq("order_item_id", id).order("transaction_date"),
  ]);

  // Source documents behind this line (import history is admin/accountant-only by RLS).
  let sources: { import_id: string; source_row_number: number; status: string; document_imports: { file_name: string; report_type: string; created_at: string } | null }[] = [];
  if (ctx.can("writer")) {
    const res = await ctx.supabase.from("document_import_rows")
      .select("import_id, source_row_number, status, document_imports(file_name, report_type, created_at)")
      .eq("business_id", ctx.businessId).eq("target_id", id).order("created_at");
    sources = (unwrap(res) as typeof sources) ?? [];
  }

  const sets = statusSets(settings);
  return {
    item,
    siblings: unwrap(siblings),
    history: unwrap(history),
    settlementItems: unwrap(settlementItems),
    sources,
    policy: {
      countsAsSale: sets.netSold.includes(item.status as OrderStatus),
      countsAsLoss: sets.loss.includes(item.status as OrderStatus),
      expectedSettlement: sets.expectedSettlement.includes(item.status as OrderStatus),
      recoveryPercent: settings.costs.returnedGoodsRecoveryPercent,
    },
  };
}

export async function createManualOrder(ctx: BusinessContext, payload: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "create_manual_order", { p_business_id: ctx.businessId, p_payload: payload });
}

export async function updateOrderLine(ctx: BusinessContext, id: string, payload: Record<string, unknown>) {
  return rpcOne(ctx.supabase, "update_order_item", { p_item_id: id, p_payload: payload });
}

export async function distinctSkus(ctx: BusinessContext): Promise<string[]> {
  const res = await ctx.supabase.from("products").select("sku").eq("business_id", ctx.businessId).order("sku").limit(1000);
  return (unwrap(res) as { sku: string }[]).map((r) => r.sku);
}
