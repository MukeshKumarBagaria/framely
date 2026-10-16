// End-to-end database tests: the real migration on a real PostgreSQL, called
// the way the app calls it (as the `authenticated` role with a JWT subject).
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { settingsSchema, statusSets, type BusinessSettings, type ReportType } from "../domain/accounting-policy";
import { recipeUnitCost } from "../domain/costing";
import { computeProfitAndLoss, mergeInputs, type FinancialInputs } from "../domain/financial-calculations";
import { computeStockPositions } from "../domain/inventory";
import { dec } from "../domain/money";
import { prepareImport } from "../imports/pipeline";
import { readDocument } from "../imports/readers";
import { toImportRowInserts } from "../imports/staging";
import { mapCashDaily, mapExpenseDaily, mapOrderDaily, mapSettlementDaily } from "../server/mappers";
import { asUser, createTestDatabase, createUser, rpc, rpcRows } from "./pglite";

const OWNER_A = "00000000-0000-4000-8000-00000000000a";
const OWNER_B = "00000000-0000-4000-8000-00000000000b";
const VIEWER = "00000000-0000-4000-8000-00000000000c";
const STRANGER = "00000000-0000-4000-8000-00000000000d";

const SETTINGS: BusinessSettings = settingsSchema.parse({ gst: { registered: true, defaultRatePercent: 5 } });
const SETS = statusSets(SETTINGS);
const enc = (s: string) => new TextEncoder().encode(s);

const HEADER =
  "Reason for Credit Entry,Sub Order No,Catalog ID,Order Date,Order source,Customer State,Product Name,SKU,Size,Quantity," +
  "Supplier Listed Price (Incl. GST + Commission),Supplier Discounted Price (Incl GST and Commision),Packet Id";
const ORDERS = [
  HEADER,
  "DELIVERED,149532165782_1,112233,2026-10-01,Meesho,Maharashtra,Couple Frame,PF-0001,8x10,1,499,399,PKT001",
  "CANCELLED,149532165783_1,112233,2026-10-02,Meesho,Gujarat,Couple Frame,PF-0001,8x10,1,499,399,",
  "RTO_LOCKED,149532165784_1,112244,2026-10-03,Meesho,Delhi,Set of 2,PF-0002-S2,A4,2,1099,899,PKT003",
  "DELIVERED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage,PF-0003,12x18,1,799,649,PKT004",
  "DELIVERED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage,PF-0003,12x18,1,799,649,PKT004",
].join("\n");

async function setupDb() {
  const db = await createTestDatabase();
  await createUser(db, OWNER_A, "a@example.com");
  await createUser(db, OWNER_B, "b@example.com");
  await createUser(db, VIEWER, "viewer@example.com");
  await createUser(db, STRANGER, "stranger@example.com");
  const bizA = await rpc<string>(db, OWNER_A, "bootstrap_business", ["Framely A", "Asia/Kolkata", JSON.stringify(SETTINGS)]);
  const bizB = await rpc<string>(db, OWNER_B, "bootstrap_business", ["Framely B", "Asia/Kolkata", JSON.stringify(SETTINGS)]);
  await rpc(db, OWNER_A, "add_member_by_email", [bizA, "viewer@example.com", "viewer"]);
  return { db, bizA, bizB };
}

async function stage(db: PGlite, user: string, biz: string, reportType: ReportType, csv: string, options: Record<string, string> = {}) {
  const doc = await readDocument("report.csv", enc(csv));
  const prepared = prepareImport({ reportType, table: doc.tables[0], settings: SETTINGS, timeZone: "Asia/Kolkata", today: "2026-10-16", options });
  return asUser(db, user, async (tx) => {
    const imp = await tx.query<{ id: string }>(
      `insert into business_analysis.document_imports
         (business_id, platform, report_type, file_name, file_format, file_size_bytes, checksum_sha256, status, mapping, parse_summary,
          total_rows, valid_rows, invalid_rows, duplicate_rows)
       values ($1, $2, $3, 'report.csv', 'csv', $4, repeat('a', 64), 'parsed', $5, $6, $7, $8, $9, $10) returning id`,
      [biz, reportType === "meta_ads" ? "meta" : "meesho", reportType, csv.length, JSON.stringify(prepared.mapping), JSON.stringify(prepared.summary),
        prepared.summary.totalRows, prepared.summary.validRows, prepared.summary.invalidRows, prepared.summary.duplicateRows],
    );
    const id = imp.rows[0].id;
    await tx.query(
      `insert into business_analysis.document_import_rows
         (business_id, import_id, source_row_number, raw, normalized, fingerprint, status, errors, warnings)
       select * from jsonb_to_recordset($1::jsonb) as x(business_id uuid, import_id uuid, source_row_number int, raw jsonb,
         normalized jsonb, fingerprint text, status text, errors jsonb, warnings jsonb)`,
      [JSON.stringify(toImportRowInserts(biz, id, prepared.rows))],
    );
    return id;
  });
}

type BatchResult = { remaining: number; status: string; inserted: number; updated: number; unchanged: number; rejected: number };
async function commitAll(db: PGlite, user: string, importId: string, batch = 2): Promise<BatchResult> {
  for (let i = 0; i < 100; i++) {
    const r = await rpc<BatchResult>(db, user, "commit_import_batch", [importId, batch, false]);
    if (r.remaining === 0) return r;
  }
  throw new Error("commit did not finish");
}
async function rollbackAll(db: PGlite, user: string, importId: string) {
  for (let i = 0; i < 100; i++) {
    const r = await rpc<{ remaining: number; status: string; reverted: number }>(db, user, "rollback_import_batch", [importId, "test", 2]);
    if (r.remaining === 0) return r;
  }
  throw new Error("rollback did not finish");
}

async function lines(db: PGlite, biz: string) {
  return asUser(db, OWNER_A, async (tx) =>
    (await tx.query<{ external_line_id: string; status: string; voided_at: string | null; sale_amount: string; sale_amount_excl_gst: string; cost_basis: string; material_unit_cost: string | null; packaging_unit_cost: string | null; gst_rate: string; gst_rate_source: string }>(
      "select * from business_analysis.sales_order_items where business_id = $1 order by external_line_id", [biz])).rows);
}

async function loadInputs(db: PGlite, user: string, biz: string, from: string, to: string): Promise<FinancialInputs> {
  const orders = await rpcRows<never>(db, user, "order_daily_metrics", [biz, from, to, "order_date", null, null, null, null]);
  const settlements = await rpcRows<never>(db, user, "settlement_daily_metrics", [biz, from, to, "order_date", null, null, null]);
  const expenses = await rpcRows<never>(db, user, "expense_daily_metrics", [biz, from, to]);
  const cash = await rpcRows<never>(db, user, "cash_daily_metrics", [biz, from, to]);
  return mergeInputs([{
    orders: orders.map((r) => mapOrderDaily(r).agg),
    settlements: settlements.map((r) => mapSettlementDaily(r).agg),
    expenses: expenses.map((r) => mapExpenseDaily(r).agg),
    ads: [],
    cash: cash.map((r) => mapCashDaily(r).agg),
  }]);
}

// ---------------------------------------------------------------------------------

describe("authorization and row level security", () => {
  let db: PGlite;
  let bizA: string;
  let bizB: string;
  beforeAll(async () => {
    ({ db, bizA, bizB } = await setupDb());
    await asUser(db, OWNER_B, (tx) => tx.query("insert into business_analysis.products (business_id, name, sku) values ($1, 'B frame', 'B-1')", [bizB]));
    await asUser(db, OWNER_A, (tx) => tx.query("insert into business_analysis.products (business_id, name, sku) values ($1, 'A frame', 'A-1')", [bizA]));
  });

  it("isolates tenants: each owner sees only their own business", async () => {
    const seen = await asUser(db, OWNER_A, async (tx) => ({
      profiles: (await tx.query<{ id: string }>("select id from business_analysis.business_profiles")).rows.map((r) => r.id),
      products: (await tx.query<{ sku: string }>("select sku from business_analysis.products")).rows.map((r) => r.sku),
    }));
    expect(seen).toEqual({ profiles: [bizA], products: ["A-1"] });
  });

  it("rejects writes into another business, even with its id", async () => {
    await expect(asUser(db, OWNER_A, (tx) => tx.query("insert into business_analysis.products (business_id, name, sku) values ($1, 'x', 'X-1')", [bizB])))
      .rejects.toThrow(/row-level security/);
    await expect(rpc(db, OWNER_A, "save_expense", [bizB, JSON.stringify({ expense_date: "2026-10-01", category_id: bizB, amount: "1.00" })]))
      .rejects.toThrow(/not authorized/);
  });

  it("does not let a foreign record be referenced through a leaked id", async () => {
    const bProduct = await asUser(db, OWNER_B, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.products")).rows[0].id);
    await expect(asUser(db, OWNER_A, (tx) => tx.query(
      "insert into business_analysis.product_recipes (business_id, product_id, version, effective_from) values ($1, $2, 1, '2026-01-01')", [bizA, bProduct])))
      .rejects.toThrow(/foreign key/);
  });

  it("lets viewers read but not write", async () => {
    const products = await asUser(db, VIEWER, async (tx) => (await tx.query("select sku from business_analysis.products")).rows);
    expect(products).toEqual([{ sku: "A-1" }]);
    await expect(asUser(db, VIEWER, (tx) => tx.query("insert into business_analysis.products (business_id, name, sku) values ($1, 'v', 'V-1')", [bizA])))
      .rejects.toThrow(/row-level security/);
    const categories = await asUser(db, VIEWER, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.expense_categories limit 1")).rows);
    await expect(rpc(db, VIEWER, "save_expense", [bizA, JSON.stringify({ expense_date: "2026-10-01", category_id: categories[0].id, amount: "1.00" })]))
      .rejects.toThrow(/cannot perform this action/);
  });

  it("hides raw imports and the audit log from viewers", async () => {
    await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    const asViewer = await asUser(db, VIEWER, async (tx) => ({
      imports: (await tx.query("select id from business_analysis.document_imports")).rows.length,
      rows: (await tx.query("select id from business_analysis.document_import_rows")).rows.length,
      audit: (await tx.query("select id from business_analysis.audit_logs")).rows.length,
    }));
    expect(asViewer).toEqual({ imports: 0, rows: 0, audit: 0 });
    const ownerAudit = await asUser(db, OWNER_A, async (tx) => (await tx.query("select id from business_analysis.audit_logs")).rows.length);
    expect(ownerAudit).toBeGreaterThan(0);
  });

  it("gives non-members and anonymous callers nothing", async () => {
    const stranger = await asUser(db, STRANGER, async (tx) => (await tx.query("select id from business_analysis.products")).rows.length);
    expect(stranger).toBe(0);
    await expect(asUser(db, null, (tx) => tx.query("select id from business_analysis.products"))).rejects.toThrow(/permission denied/);
  });

  it("keeps ledgers append-only for clients: no direct writes, no internal helpers", async () => {
    const category = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.expense_categories limit 1")).rows[0].id);
    await expect(asUser(db, OWNER_A, (tx) => tx.query(
      "insert into business_analysis.expenses (business_id, expense_date, category_id, amount) values ($1, '2026-10-01', $2, 10)", [bizA, category])))
      .rejects.toThrow(/permission denied/);
    await expect(asUser(db, OWNER_A, (tx) => tx.query("delete from business_analysis.audit_logs"))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, OWNER_A, (tx) => tx.query("select business_analysis._sync_expense_cash(gen_random_uuid())")))
      .rejects.toThrow(/permission denied/);
  });

  it("reserves member management for owners and blocks a second business per user", async () => {
    await expect(rpc(db, VIEWER, "add_member_by_email", [bizA, "stranger@example.com", "admin"])).rejects.toThrow(/cannot perform/);
    await expect(rpc(db, OWNER_A, "bootstrap_business", ["Another", "Asia/Kolkata", "{}"])).rejects.toThrow(/already belongs/);
  });

  it("scopes stored documents to the business folder", async () => {
    await asUser(db, OWNER_A, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('business-analysis', $1)", [`${bizA}/imports/x.csv`]));
    await expect(asUser(db, OWNER_A, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('business-analysis', $1)", [`${bizB}/imports/x.csv`])))
      .rejects.toThrow(/row-level security/);
    const visibleToB = await asUser(db, OWNER_B, async (tx) => (await tx.query("select name from storage.objects")).rows.length);
    expect(visibleToB).toBe(0);
  });
});

// ---------------------------------------------------------------------------------

describe("order imports: idempotency, updates and rollback", () => {
  let db: PGlite;
  let bizA: string;
  let first: string;
  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
  });

  it("commits in batches and reports counts", async () => {
    first = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    const result = await commitAll(db, OWNER_A, first);
    expect(result).toMatchObject({ status: "committed", inserted: 4, updated: 0, rejected: 0 });
    const l = await lines(db, bizA);
    expect(l.map((x) => [x.external_line_id, x.status])).toEqual([
      ["149532165782_1", "delivered"], ["149532165783_1", "cancelled"], ["149532165784_1", "rto"], ["149532165785_1", "delivered"],
    ]);
    expect(l[0]).toMatchObject({ gst_rate: "5.00", gst_rate_source: "default", sale_amount_excl_gst: "380.00" });
  });

  it("does not duplicate anything when the same file is imported again", async () => {
    const before = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    const again = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    expect(await commitAll(db, OWNER_A, again)).toMatchObject({ inserted: 0, updated: 0, unchanged: 4 });
    const after = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(after.revenue).toEqual(before.revenue);
    expect(before.revenue.netSales).toBe("998.10"); // 380.00 + 618.10
    expect(before.counts.lines).toBe(4);
  });

  it("updates changed statuses, keeps history, and refuses to regress", async () => {
    const changed = ORDERS.replace("DELIVERED,149532165782_1", "RETURNED,149532165782_1").replace(/DELIVERED,149532165785_1/g, "SHIPPED,149532165785_1");
    const id = await stage(db, OWNER_A, bizA, "meesho_orders", changed);
    const result = await commitAll(db, OWNER_A, id);
    expect(result.updated).toBe(2);
    const l = await lines(db, bizA);
    expect(l[0].status).toBe("returned");
    expect(l[3].status).toBe("delivered"); // SHIPPED would move it backwards
    const warnings = await asUser(db, OWNER_A, async (tx) =>
      (await tx.query<{ w: string }>("select warnings::text as w from business_analysis.document_import_rows where import_id = $1 and warnings <> '[]'", [id])).rows);
    expect(warnings.some((w) => w.w.includes("status_regression_ignored"))).toBe(true);
    const history = await asUser(db, OWNER_A, async (tx) =>
      (await tx.query<{ previous_status: string | null; new_status: string }>(
        `select h.previous_status, h.new_status from business_analysis.sales_order_status_history h
           join business_analysis.sales_order_items i on i.id = h.order_item_id
          where i.external_line_id = '149532165782_1' order by h.changed_at, h.id`)).rows);
    expect(history.map((h) => h.new_status)).toEqual(["delivered", "returned"]);

    // Rolling back the update restores the previous status.
    const rb = await rollbackAll(db, OWNER_A, id);
    expect(rb.status).toBe("rolled_back");
    expect((await lines(db, bizA))[0].status).toBe("delivered");
  });

  it("rolls back an import without touching records a later import changed", async () => {
    const later = await stage(db, OWNER_A, bizA, "meesho_orders", [HEADER, "RTO_LOCKED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage,PF-0003,12x18,1,799,649,PKT004"].join("\n"));
    await commitAll(db, OWNER_A, later);
    const rb = await rollbackAll(db, OWNER_A, first);
    expect(rb.status).toBe("rolled_back");
    const l = await lines(db, bizA);
    expect(l.filter((x) => x.voided_at === null).map((x) => [x.external_line_id, x.status])).toEqual([["149532165785_1", "rto"]]);
    const skipped = await asUser(db, OWNER_A, async (tx) =>
      (await tx.query("select 1 from business_analysis.document_import_rows where import_id = $1 and status = 'revert_skipped'", [first])).rows.length);
    expect(skipped).toBe(1);
    const pnl = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(pnl.counts.lines).toBe(1);
    expect(pnl.revenue.netSales).toBe("0.00");
  });

  it("revives voided lines when the file is imported again after a rollback", async () => {
    const again = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    await commitAll(db, OWNER_A, again);
    const live = (await lines(db, bizA)).filter((x) => x.voided_at === null);
    expect(live).toHaveLength(4);
  });

  it("only lets admins roll back, and refuses unfinished or rolled-back imports", async () => {
    const id = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    await expect(rpc(db, OWNER_A, "rollback_import_batch", [id, "x", 10])).rejects.toThrow(/cannot be rolled back/);
    await expect(rpc(db, OWNER_A, "rollback_import_batch", [first, "x", 10])).rejects.toThrow(/cannot be rolled back/);
    await expect(rpc(db, VIEWER, "commit_import_batch", [id, 10, false])).rejects.toThrow(/import not found|not authorized|cannot perform/);
  });

  it("requires acknowledgement before committing an import that needs review", async () => {
    const id = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    await asUser(db, OWNER_A, (tx) => tx.query("update business_analysis.document_imports set status = 'needs_review' where id = $1", [id]));
    await expect(rpc(db, OWNER_A, "commit_import_batch", [id, 10, false])).rejects.toThrow(/acknowledged/);
    expect(await rpc<BatchResult>(db, OWNER_A, "commit_import_batch", [id, 10, true])).toMatchObject({ status: "committed" });
  });
});

// ---------------------------------------------------------------------------------

describe("product costing with historical prices", () => {
  let db: PGlite;
  let bizA: string;
  let productId: string;
  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
    productId = await asUser(db, OWNER_A, async (tx) => {
      const p = await tx.query<{ id: string }>("insert into business_analysis.products (business_id, name, sku, gst_rate) values ($1, 'Couple Frame', 'PF-0001', 12) returning id", [bizA]);
      const frame = await tx.query<{ id: string }>("insert into business_analysis.materials (business_id, name, unit, category) values ($1, 'Frame 8x10', 'pcs', 'raw_material') returning id", [bizA]);
      const box = await tx.query<{ id: string }>("insert into business_analysis.materials (business_id, name, unit, category) values ($1, 'Box', 'pcs', 'packaging') returning id", [bizA]);
      await tx.query("insert into business_analysis.material_cost_versions (business_id, material_id, effective_from, unit_cost) values ($1, $2, '2026-01-01', 40), ($1, $2, '2026-10-03', 55), ($1, $3, '2026-01-01', 10)",
        [bizA, frame.rows[0].id, box.rows[0].id]);
      const r = await tx.query<{ id: string }>("insert into business_analysis.product_recipes (business_id, product_id, version, effective_from) values ($1, $2, 1, '2026-01-01') returning id", [bizA, p.rows[0].id]);
      await tx.query(
        `insert into business_analysis.product_recipe_items (business_id, recipe_id, material_id, component_type, quantity, unit, wastage_percent)
         values ($1, $2, $3, 'material', 1, 'pcs', 0), ($1, $2, $4, 'packaging', 1, 'pcs', 10)`,
        [bizA, r.rows[0].id, frame.rows[0].id, box.rows[0].id]);
      await tx.query("update business_analysis.product_recipes set status = 'active' where id = $1", [r.rows[0].id]);
      return p.rows[0].id;
    });
  });

  it("freezes active recipes", async () => {
    await expect(asUser(db, OWNER_A, (tx) => tx.query("update business_analysis.product_recipe_items set quantity = 2"))).rejects.toThrow(/cannot be modified/);
    await expect(asUser(db, OWNER_A, (tx) => tx.query("update business_analysis.product_recipes set effective_from = '2025-01-01'"))).rejects.toThrow(/immutable/);
  });

  it("matches the TypeScript preview of the recipe cost", async () => {
    const [sql] = await rpcRows<{ material_cost: string; packaging_cost: string }>(db, OWNER_A, "recipe_unit_cost", [bizA, productId, "2026-10-05"]);
    const ts = recipeUnitCost(
      [{ materialId: "f", componentType: "material", quantity: "1", wastagePercent: "0", unitCostOverride: null },
       { materialId: "b", componentType: "packaging", quantity: "1", wastagePercent: "10", unitCostOverride: null }],
      [{ materialId: "f", effectiveFrom: "2026-01-01", unitCost: "40" }, { materialId: "f", effectiveFrom: "2026-10-03", unitCost: "55" },
       { materialId: "b", effectiveFrom: "2026-01-01", unitCost: "10" }],
      "2026-10-05");
    expect(dec(sql.material_cost).toFixed(4)).toBe(ts.material);
    expect(dec(sql.packaging_cost).toFixed(4)).toBe(ts.packaging);
  });

  it("snapshots the cost in force on each order date and never rewrites it silently", async () => {
    const csv = [HEADER,
      "DELIVERED,1_1,1,2026-10-01,Meesho,Goa,Frame,PF-0001,S,2,499,399,P1",
      "DELIVERED,2_1,1,2026-10-05,Meesho,Goa,Frame,pf-0001,S,1,499,399,P2",
      "DELIVERED,3_1,1,2026-10-05,Meesho,Goa,Frame,UNKNOWN-SKU,S,1,499,399,P3"].join("\n");
    await commitAll(db, OWNER_A, await stage(db, OWNER_A, bizA, "meesho_orders", csv));
    let l = await lines(db, bizA);
    expect(l.map((x) => [x.external_line_id, x.cost_basis, x.material_unit_cost, x.packaging_unit_cost])).toEqual([
      ["1_1", "estimated", "40.0000", "11.0000"],
      ["2_1", "estimated", "55.0000", "11.0000"],
      ["3_1", "missing", null, null],
    ]);
    expect(l[0]).toMatchObject({ gst_rate: "12.00", gst_rate_source: "product" });

    // A later price change for the same period does not alter booked costs…
    await asUser(db, OWNER_A, (tx) => tx.query(
      "update business_analysis.material_cost_versions set unit_cost = 60 where effective_from = '2026-01-01' and unit_cost = 40"));
    expect((await lines(db, bizA))[0].material_unit_cost).toBe("40.0000");

    // …until costs are explicitly re-run for the period.
    const started = new Date().toISOString();
    const r = await rpc<{ processed: number; remaining: number }>(db, OWNER_A, "refresh_order_costs", [bizA, "2026-10-01", "2026-10-31", "all_estimates", started, 10]);
    expect(r).toMatchObject({ processed: 3, remaining: 0 });
    l = await lines(db, bizA);
    expect(l[0].material_unit_cost).toBe("60.0000");
    expect(l[2].cost_basis).toBe("missing");
  });

  it("re-costing missing lines terminates even when some stay missing", async () => {
    const started = new Date().toISOString();
    let rounds = 0;
    let remaining = 1;
    while (remaining > 0 && rounds < 5) {
      remaining = (await rpc<{ remaining: number }>(db, OWNER_A, "refresh_order_costs", [bizA, "2026-10-01", "2026-10-31", "missing_only", started, 1])).remaining;
      rounds++;
    }
    expect(remaining).toBe(0);
    expect(rounds).toBe(1);
  });

  it("records actual cost, which wins over the estimate", async () => {
    const id = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.sales_order_items where external_line_id = '1_1'")).rows[0].id);
    await rpc(db, OWNER_A, "update_order_item", [id, JSON.stringify({ actual_unit_cost: "45.50" })]);
    const row = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ cost_basis: string; line_cost: string }>("select cost_basis, line_cost from business_analysis.sales_order_items where id = $1", [id])).rows[0]);
    expect(row).toEqual({ cost_basis: "actual", line_cost: "91.00" });
  });
});

// ---------------------------------------------------------------------------------

describe("settlements and reconciliation", () => {
  let db: PGlite;
  let bizA: string;
  let settlementImport: string;
  const SETTLEMENT_HEADER = "Sub Order No,Transaction ID,Payment Date,Final Settlement Amount,Total Sale Amount (Incl. Shipping & GST),Meesho Commission (Incl. GST),Shipping Charge (Incl. GST),Return Shipping Charge (Incl. GST),TCS";
  const SETTLEMENTS = [
    SETTLEMENT_HEADER,
    "149532165782_1,UTR001,2026-10-12,353.00,399.00,-20.00,-25.00,0,-1.00",
    "149532165785_1,UTR001,2026-10-12,280.00,300.00,-10.00,-10.00,0,0",
    "149532165784_1,UTR001,2026-10-12,-60.00,0,0,0,-60.00,0",
    "999999_1,UTR001,2026-10-12,100.00,100.00,0,0,0,0",
  ].join("\n");

  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
    await commitAll(db, OWNER_A, await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS));
  });

  const recon = async () => {
    const rows = await rpcRows<{ external_line_id: string; settlement_status: string; difference: string }>(
      db, OWNER_A, "reconciliation_lines", [bizA, "2026-10-01", "2026-10-31", SETS.expectedSettlement, 1, null, null, 50, 0]);
    return Object.fromEntries(rows.map((r) => [r.external_line_id, r.settlement_status]));
  };
  const cash = async () => asUser(db, OWNER_A, async (tx) =>
    (await tx.query<{ amount: string; direction: string; voided_at: string | null }>(
      "select amount, direction, voided_at from business_analysis.cash_transactions where txn_type = 'settlement_payout' order by created_at")).rows);

  it("links settlement lines to orders and records one payout in cash", async () => {
    settlementImport = await stage(db, OWNER_A, bizA, "meesho_settlements", SETTLEMENTS);
    expect(await commitAll(db, OWNER_A, settlementImport)).toMatchObject({ inserted: 4, rejected: 0 });
    expect(await cash()).toEqual([{ amount: "673.00", direction: "in", voided_at: null }]);
    expect(await recon()).toEqual({
      "149532165782_1": "matched",
      "149532165783_1": "not_due",
      "149532165784_1": "charges_only",
      "149532165785_1": "partial",
    });
  });

  it("never infers a receipt from delivery: unsettled lines stay outstanding", async () => {
    const summary = await rpcRows<{ settlement_status: string; outstanding: string; lines: number }>(
      db, OWNER_A, "reconciliation_summary", [bizA, "2026-10-01", "2026-10-31", SETS.expectedSettlement, 1]);
    const byStatus = Object.fromEntries(summary.map((s) => [s.settlement_status, s]));
    expect(byStatus.partial.outstanding).toBe("349.00"); // 649 expected − 300 settled
    expect(byStatus.unlinked_settlement_items.lines).toBe(1);
  });

  it("ignores a settlement file imported twice", async () => {
    const again = await stage(db, OWNER_A, bizA, "meesho_settlements", SETTLEMENTS);
    expect(await commitAll(db, OWNER_A, again)).toMatchObject({ inserted: 0, unchanged: 4 });
    expect(await cash()).toHaveLength(1);
    expect((await cash())[0].amount).toBe("673.00");
  });

  it("supports several settlements against one order and flags a possible double payment", async () => {
    const second = [SETTLEMENT_HEADER, "149532165785_1,UTR002,2026-10-20,349.00,349.00,0,0,0,0"].join("\n");
    await commitAll(db, OWNER_A, await stage(db, OWNER_A, bizA, "meesho_settlements", second));
    expect((await recon())["149532165785_1"]).toBe("matched");

    const duplicate = [SETTLEMENT_HEADER, "149532165782_1,UTR003,2026-10-25,353.00,399.00,-20.00,-25.00,0,-1.00"].join("\n");
    await commitAll(db, OWNER_A, await stage(db, OWNER_A, bizA, "meesho_settlements", duplicate));
    expect((await recon())["149532165782_1"]).toBe("duplicate_suspected");
    expect(await cash()).toHaveLength(3);
  });

  it("matches an unlinked settlement line manually, all components together", async () => {
    const [item] = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>(
      "select id from business_analysis.settlement_items where external_line_id = '999999_1'")).rows);
    const [target] = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>(
      "select id from business_analysis.sales_order_items where external_line_id = '149532165783_1'")).rows);
    await rpc(db, OWNER_A, "match_settlement_item", [item.id, target.id]);
    const linked = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ match_type: string }>(
      "select match_type from business_analysis.settlement_items where external_line_id = '999999_1'")).rows);
    expect(linked.every((l) => l.match_type === "manual")).toBe(true);
  });

  it("reconciles a bank receipt within tolerance and flags a mismatch", async () => {
    const [s] = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>(
      "select id from business_analysis.settlements where external_settlement_id = 'UTR001'")).rows);
    expect(await rpc(db, OWNER_A, "record_bank_receipt", [s.id, "673.40", "2026-10-13", "BANK1", 1])).toBe("reconciled");
    expect(await rpc(db, OWNER_A, "record_bank_receipt", [s.id, "600.00", "2026-10-13", "BANK1", 1])).toBe("disputed");
  });

  it("feeds platform deductions into the P&L by order date, excluding TCS", async () => {
    const pnl = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(pnl.variableCosts.platformFees).toBe("50.00"); // 20 + 10 + 20 (duplicate payment counted until resolved)
    expect(pnl.variableCosts.returnShipping).toBe("60.00");
    expect(pnl.excluded.taxesWithheld).toBe("2.00");
  });

  it("matches the sum of line contributions with the P&L contribution", async () => {
    const inputs = await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31");
    const pnl = computeProfitAndLoss(inputs, SETTINGS);
    const page = await rpcRows<{ contribution: string; total_count: number }>(db, OWNER_A, "order_lines_page",
      [bizA, "2026-10-01", "2026-10-31", SETS.netSold, SETS.loss, SETS.expectedSettlement, 0, 1, null, null, null, null, null, null, "order_date", true, 500, 0]);
    const skus = await rpcRows<{ contribution: string }>(db, OWNER_A, "sku_profitability",
      [bizA, "2026-10-01", "2026-10-31", SETS.netSold, SETS.loss, 0, "order_date", null]);
    const sumLines = page.reduce((t, r) => t.plus(r.contribution), dec(0)).toFixed(2);
    const sumSkus = skus.reduce((t, r) => t.plus(r.contribution), dec(0)).toFixed(2);
    expect(sumLines).toBe(pnl.contributionBeforeAds);
    expect(sumSkus).toBe(pnl.contributionBeforeAds);
    expect(page[0].total_count).toBe(4);
  });

  it("rolls back a settlement import, voiding its items and cash", async () => {
    await rollbackAll(db, OWNER_A, settlementImport);
    const c = await cash();
    expect(c[0].voided_at).not.toBeNull();
    expect(c.filter((x) => x.voided_at === null)).toHaveLength(2);
    expect((await recon())["149532165784_1"]).toBe("not_due");
  });
});

// ---------------------------------------------------------------------------------

describe("expenses, cash and double-counting prevention", () => {
  let db: PGlite;
  let bizA: string;
  const cat: Record<string, string> = {};
  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
    const rows = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string; slug: string }>("select id, slug from business_analysis.expense_categories")).rows);
    for (const r of rows) cat[r.slug] = r.id;
  });
  const cashRows = async () => asUser(db, OWNER_A, async (tx) => (await tx.query<{ txn_type: string; direction: string; amount: string; voided_at: string | null }>(
    "select txn_type, direction, amount, voided_at from business_analysis.cash_transactions order by created_at, id")).rows);
  const save = (payload: Record<string, unknown>) => rpc<string>(db, OWNER_A, "save_expense", [bizA, JSON.stringify(payload)]);

  it("records a paid expense once in cash, and keeps it in step when edited", async () => {
    const id = await save({ expense_date: "2026-10-05", category_id: cat.rent, amount: "15000.00", payment_method: "bank_transfer", payment_status: "paid", vendor: "Landlord" });
    await save({ id, expense_date: "2026-10-05", category_id: cat.rent, amount: "16000.00", payment_method: "bank_transfer", payment_status: "paid", vendor: "Landlord" });
    expect(await cashRows()).toEqual([{ txn_type: "expense_payment", direction: "out", amount: "16000.00", voided_at: null }]);
  });

  it("never creates cash for an expense the platform already deducted", async () => {
    await save({ expense_date: "2026-10-06", category_id: cat.shipping, amount: "250.00", payment_status: "paid", reflected_in_settlement: true });
    await save({ expense_date: "2026-10-06", category_id: cat.platform_fees, amount: "90.00", payment_status: "paid", payment_method: "platform_deduction" });
    expect((await cashRows()).filter((c) => c.voided_at === null)).toHaveLength(1);
    const pnl = computeProfitAndLoss((await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31")), SETTINGS);
    expect(pnl.variableCosts.expenses).toBe("90.00"); // platform_deduction method alone does not exclude from P&L
    expect(pnl.excluded.alreadyDeductedExpenses).toBe("250.00");
  });

  it("reverses mistakes with an audit trail instead of deleting", async () => {
    const id = await save({ expense_date: "2026-10-07", category_id: cat.software, amount: "999.00", payment_status: "paid", payment_method: "card" });
    await rpc(db, OWNER_A, "reverse_expense", [id, "entered twice", "error", null]);
    const rows = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ amount: string; status: string }>(
      "select amount, status from business_analysis.expenses where category_id = $1 order by created_at", [cat.software])).rows);
    expect(rows).toEqual([{ amount: "999.00", status: "reversed" }, { amount: "-999.00", status: "active" }]);
    const pnl = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(pnl.operatingExpenses?.lines.find((l) => l.slug === "software")?.amount ?? "0.00").toBe("0.00");
    await expect(rpc(db, OWNER_A, "save_expense", [bizA, JSON.stringify({ id, expense_date: "2026-10-07", category_id: cat.software, amount: "1.00" })])).rejects.toThrow(/cannot be edited/);
    await expect(rpc(db, OWNER_A, "reverse_expense", [id, "again", "error", null])).rejects.toThrow(/cannot be reversed/);
  });

  it("records a refund as money coming back", async () => {
    const id = await save({ expense_date: "2026-10-08", category_id: cat.utilities, amount: "500.00", payment_status: "paid", payment_method: "upi" });
    await rpc(db, OWNER_A, "reverse_expense", [id, "overcharged", "refund", "2026-10-20"]);
    const c = (await cashRows()).filter((x) => x.voided_at === null).map((x) => [x.txn_type, x.direction, x.amount]);
    expect(c).toContainEqual(["expense_refund", "in", "500.00"]);
  });

  it("generates recurring expenses once per occurrence, clamping month ends", async () => {
    await save({ expense_date: "2026-01-31", category_id: cat.software, amount: "499.00", payment_status: "unpaid", is_recurring_template: true,
      recurrence: { frequency: "monthly", interval: 1, startDate: "2026-01-31" } });
    expect(await rpc<number>(db, OWNER_A, "generate_recurring_expenses", [bizA, "2026-04-30"])).toBe(4);
    expect(await rpc<number>(db, OWNER_A, "generate_recurring_expenses", [bizA, "2026-04-30"])).toBe(0);
    const dates = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ d: string }>(
      "select to_char(occurrence_date, 'YYYY-MM-DD') as d from business_analysis.expenses where occurrence_date is not null order by 1")).rows.map((r) => r.d));
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("counts material purchases as cash, not profit", async () => {
    await save({ expense_date: "2026-10-09", category_id: cat.raw_materials, amount: "8000.00", payment_status: "paid", payment_method: "upi" });
    const inputs = await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31");
    const pnl = computeProfitAndLoss(inputs, SETTINGS);
    expect(pnl.excluded.inventoryPurchases).toBe("8000.00");
    expect(pnl.cogs.total).toBe("0.00");
  });

  it("allows manual cash only for non-system types and voids only manual rows", async () => {
    const id = await rpc<string>(db, OWNER_A, "record_cash_transaction", [bizA, JSON.stringify({ txn_type: "other_income", txn_date: "2026-10-10", amount: "1200.00", description: "Workshop" })]);
    await expect(rpc(db, OWNER_A, "record_cash_transaction", [bizA, JSON.stringify({ txn_type: "settlement_payout", txn_date: "2026-10-10", amount: "1" })])).rejects.toThrow(/created by the system/);
    const pnl = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(pnl.otherIncome).toBe("1200.00");
    await rpc(db, OWNER_A, "void_cash_transaction", [id, "test"]);
    const system = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.cash_transactions where source = 'system' limit 1")).rows[0].id);
    await expect(rpc(db, OWNER_A, "void_cash_transaction", [system, "x"])).rejects.toThrow(/follow their source record/);
  });
});

// ---------------------------------------------------------------------------------

describe("inventory and purchasing", () => {
  let db: PGlite;
  let bizA: string;
  let frame: string;
  let product: string;
  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
    ({ frame, product } = await asUser(db, OWNER_A, async (tx) => {
      const f = await tx.query<{ id: string }>("insert into business_analysis.materials (business_id, name, unit) values ($1, 'Frame', 'pcs') returning id", [bizA]);
      const p = await tx.query<{ id: string }>("insert into business_analysis.products (business_id, name, sku) values ($1, 'Frame product', 'FP-1') returning id", [bizA]);
      const r = await tx.query<{ id: string }>("insert into business_analysis.product_recipes (business_id, product_id, version, effective_from) values ($1, $2, 1, '2026-01-01') returning id", [bizA, p.rows[0].id]);
      await tx.query("insert into business_analysis.product_recipe_items (business_id, recipe_id, material_id, component_type, quantity, unit, wastage_percent) values ($1, $2, $3, 'material', 2, 'pcs', 5)", [bizA, r.rows[0].id, f.rows[0].id]);
      await tx.query("update business_analysis.product_recipes set status = 'active' where id = $1", [r.rows[0].id]);
      return { frame: f.rows[0].id, product: p.rows[0].id };
    }));
  });

  const ledger = async () => asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string; material_id: string; movement_type: never; quantity: string; unit_cost: string | null; movement_date: string; created_at: string }>(
    "select id, material_id, movement_type, quantity, unit_cost, to_char(movement_date, 'YYYY-MM-DD') as movement_date, created_at::text from business_analysis.inventory_movements where voided_at is null and material_id is not null")).rows);

  it("receives a purchase order into stock at cost and pays it once", async () => {
    const supplier = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>("insert into business_analysis.suppliers (business_id, name) values ($1, 'Raj Frames') returning id", [bizA])).rows[0].id);
    const po = await rpc<string>(db, OWNER_A, "save_purchase_order", [bizA, JSON.stringify({
      supplier_id: supplier, po_number: "PO-1", order_date: "2026-10-01",
      items: [{ material_id: frame, quantity: "100", unit_price: "10", tax_rate: "12" }, { material_id: frame, quantity: "100", unit_price: "20", tax_rate: "12" }],
    })]);
    await rpc(db, OWNER_A, "receive_purchase_order", [po, "2026-10-02", true]);
    await rpc(db, OWNER_A, "pay_purchase_order", [po, "2026-10-03", "bank_transfer", "NEFT1"]);
    await expect(rpc(db, OWNER_A, "pay_purchase_order", [po, "2026-10-03", "bank_transfer", "NEFT1"])).rejects.toThrow(/already paid/);
    const cash = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ amount: string }>("select amount from business_analysis.cash_transactions")).rows);
    expect(cash).toEqual([{ amount: "3360.00" }]); // 3000 + 12% GST
    const cost = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ unit_cost: string }>("select unit_cost from business_analysis.material_cost_versions where material_id = $1", [frame])).rows);
    expect(cost).toEqual([{ unit_cost: "15.0000" }]); // weighted
  });

  it("consumes recipe materials only when production is recorded", async () => {
    const batch = await rpc<string>(db, OWNER_A, "record_production", [bizA, product, 10, "2026-10-05", "batch 1", false]);
    let pos = computeStockPositions((await ledger()).map((m) => ({ id: m.id, itemId: m.material_id, movementType: m.movement_type, quantity: m.quantity, unitCost: m.unit_cost, movementDate: m.movement_date, createdAt: m.created_at })));
    expect(pos.get(frame)).toMatchObject({ quantity: "179.000", averageUnitCost: "15.0000", value: "2685.00" }); // 200 − 10×2×1.05

    await rpc(db, OWNER_A, "void_inventory_movement", [ (await ledger()).find((m) => m.movement_type === ("consumption" as never))!.id, "mistake"]);
    pos = computeStockPositions((await ledger()).map((m) => ({ id: m.id, itemId: m.material_id, movementType: m.movement_type, quantity: m.quantity, unitCost: m.unit_cost, movementDate: m.movement_date, createdAt: m.created_at })));
    expect(pos.get(frame)?.quantity).toBe("200.000");
    expect(batch).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("enforces movement direction in the database", async () => {
    await expect(rpc(db, OWNER_A, "record_inventory_movement", [bizA, JSON.stringify({ material_id: frame, movement_type: "wastage", quantity: "5", movement_date: "2026-10-06" })]))
      .rejects.toThrow(/check constraint/);
  });
});
