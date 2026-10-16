// Request schemas shared by the API routes (server-side validation) and the
// forms (client-side hints). The server always re-validates; client checks are
// a convenience only.
import { z } from "zod";
import { REPORT_TYPES, settingsSchema } from "./domain/accounting-policy";
import { isIsoDate } from "./domain/dates";
import { parseAmount } from "./domain/money";
import { DATE_PRESETS } from "./domain/periods";
import {
  EXPENSE_TREATMENTS,
  MANUAL_CASH_TXN_TYPES,
  MOVEMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  RECON_STATUSES,
  SALES_CHANNELS,
} from "./domain/statuses";

export const isoDate = z.string().refine(isIsoDate, "Enter a valid date");
const optionalIsoDate = z.preprocess((v) => (v === "" || v === undefined ? null : v), isoDate.nullable());

/** An amount typed by a person: "1,250.50", "₹499". Normalized to "1250.50". */
export const amountInput = (opts: { min?: number; allowNegative?: boolean; positive?: boolean } = {}) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const parsed = parseAmount(v);
    if (!parsed.ok || parsed.value === null) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
      return z.NEVER;
    }
    const n = Number(parsed.value);
    if (!opts.allowNegative && n < 0) {
      ctx.addIssue({ code: "custom", message: "Amount cannot be negative" });
      return z.NEVER;
    }
    if (opts.positive && n <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero" });
      return z.NEVER;
    }
    if (Math.abs(n) > 999_999_999_999) {
      ctx.addIssue({ code: "custom", message: "Amount is too large" });
      return z.NEVER;
    }
    return parsed.value;
  });

const decimalInput = (max = 1_000_000) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const s = String(v).trim().replace(/,/g, "");
    if (!/^-?\d+(\.\d{1,4})?$/.test(s) || Math.abs(Number(s)) > max) {
      ctx.addIssue({ code: "custom", message: "Enter a valid number" });
      return z.NEVER;
    }
    return s;
  });

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable().optional());
const uuid = z.string().uuid();

// ---- Filters ---------------------------------------------------------------------

const csvList = <T extends string>(values: readonly [T, ...T[]]) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.split(",").map((s) => s.trim()) : undefined),
    z.array(z.enum(values)).max(values.length).optional(),
  );

export const filtersSchema = z.object({
  preset: z.enum(DATE_PRESETS).optional(),
  from: optionalIsoDate.optional(),
  to: optionalIsoDate.optional(),
  channel: z.enum(SALES_CHANNELS).optional().catch(undefined),
  sku: optionalText(100),
  status: csvList(ORDER_STATUSES).catch(undefined),
  settlement: z.enum(["settled", "unsettled"]).optional().catch(undefined),
});
export type Filters = z.infer<typeof filtersSchema>;

export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  sort: optionalText(40),
  dir: z.enum(["asc", "desc"]).default("desc"),
  search: optionalText(100),
});

export const orderListSchema = filtersSchema.merge(pageSchema).extend({
  reconStatus: z.enum(RECON_STATUSES).optional().catch(undefined),
  profitability: z.enum(["profitable", "loss", "breakeven"]).optional().catch(undefined),
});

// ---- Orders --------------------------------------------------------------------

export const manualOrderSchema = z.object({
  channel: z.enum(["direct", "whatsapp", "other"]),
  external_order_id: optionalText(100),
  order_date: isoDate,
  status: z.enum(ORDER_STATUSES).default("pending"),
  sku: optionalText(100),
  product_name: trimmed(300).min(1, "Product name is required"),
  quantity: z.coerce.number().int().min(1).max(10_000),
  unit_price: amountInput(),
  listed_unit_price: amountInput().optional(),
  customer_state: optionalText(100),
  notes: optionalText(1000),
  delivered_on: optionalIsoDate.optional(),
});

export const orderItemPatchSchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    delivered_on: optionalIsoDate.optional(),
    actual_unit_cost: z.union([amountInput(), z.null()]).optional(),
    note: optionalText(500),
  })
  .refine((v) => v.status !== undefined || v.actual_unit_cost !== undefined, "Nothing to update");

// ---- Products, materials, recipes ---------------------------------------------------

export const productSchema = z.object({
  name: trimmed(300).min(1),
  sku: trimmed(100).min(1),
  variant: optionalText(100),
  pack_size: z.coerce.number().int().min(1).max(100).default(1),
  dimensions: optionalText(100),
  channel: z.enum(["meesho", "direct", "whatsapp", "other", "all"]).default("meesho"),
  selling_price: amountInput().nullable().optional(),
  gst_rate: z.coerce.number().min(0).max(28).nullable().optional(),
  hsn_code: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^[0-9]{4,8}$/, "HSN must be 4–8 digits").nullable().optional()),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: optionalText(2000),
});

export const materialSchema = z.object({
  name: trimmed(200).min(1),
  sku: optionalText(100),
  category: z.enum(["raw_material", "packaging", "printing", "consumable", "other"]),
  unit: trimmed(20).min(1),
  reorder_threshold: decimalInput().default("0"),
  default_supplier_id: uuid.nullable().optional(),
  is_active: z.boolean().default(true),
  notes: optionalText(2000),
  /** Optional opening price, recorded as the first cost version. */
  initial_unit_cost: amountInput().nullable().optional(),
  initial_cost_date: optionalIsoDate.optional(),
});

export const costVersionSchema = z.object({
  material_id: uuid,
  effective_from: isoDate,
  unit_cost: decimalInput(10_000_000),
  note: optionalText(300),
});

export const recipeItemSchema = z.object({
  material_id: uuid.nullable(),
  description: optionalText(200),
  component_type: z.enum(["material", "packaging", "other"]),
  quantity: decimalInput(),
  unit: trimmed(20).min(1),
  wastage_percent: z.coerce.number().min(0).max(100).default(0),
  unit_cost_override: decimalInput(10_000_000).nullable().optional(),
}).refine((i) => i.material_id !== null || (i.description && i.unit_cost_override), {
  message: "A component without a material needs a description and a cost",
});

export const recipeSchema = z.object({
  product_id: uuid,
  effective_from: isoDate,
  notes: optionalText(1000),
  items: z.array(recipeItemSchema).min(1, "Add at least one component").max(50),
  activate: z.boolean().default(false),
});

export const refreshCostsSchema = z.object({
  from: isoDate,
  to: isoDate,
  mode: z.enum(["missing_only", "all_estimates"]),
  runStartedAt: z.string().datetime({ offset: true }),
});

// ---- Inventory & purchasing --------------------------------------------------------

export const movementSchema = z.object({
  material_id: uuid.nullable().optional(),
  product_id: uuid.nullable().optional(),
  movement_type: z.enum(MOVEMENT_TYPES),
  quantity: decimalInput(),
  unit_cost: decimalInput(10_000_000).nullable().optional(),
  movement_date: isoDate,
  reference_type: z.enum(["manual", "stock_count"]).default("manual"),
  notes: optionalText(500),
}).refine((m) => Boolean(m.material_id) !== Boolean(m.product_id), "Choose a material or a product");

export const productionSchema = z.object({
  product_id: uuid,
  quantity: z.coerce.number().positive().max(100_000),
  date: isoDate,
  notes: optionalText(500),
  add_finished_goods: z.boolean().default(false),
});

export const supplierSchema = z.object({
  name: trimmed(200).min(1),
  contact_name: optionalText(200),
  phone: optionalText(30),
  email: z.preprocess((v) => (v === "" ? null : v), z.string().email().nullable().optional()),
  gstin: z.preprocess((v) => (v === "" ? null : typeof v === "string" ? v.toUpperCase() : v), z.string().regex(/^[0-9]{2}[A-Z0-9]{13}$/, "Invalid GSTIN").nullable().optional()),
  address: optionalText(500),
  notes: optionalText(2000),
  is_active: z.boolean().default(true),
});

export const purchaseOrderSchema = z.object({
  id: uuid.optional(),
  supplier_id: uuid,
  po_number: trimmed(50).min(1),
  order_date: isoDate,
  expected_date: optionalIsoDate.optional(),
  status: z.enum(["draft", "ordered"]).default("ordered"),
  notes: optionalText(1000),
  items: z.array(z.object({
    material_id: uuid,
    quantity: decimalInput(),
    unit_price: decimalInput(10_000_000),
    tax_rate: z.coerce.number().min(0).max(28).default(0),
  })).min(1).max(100),
});

export const poActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("receive"), received_on: isoDate, update_material_costs: z.boolean().default(true) }),
  z.object({ action: z.literal("pay"), paid_on: isoDate, method: z.enum(["cash", "upi", "bank_transfer", "card", "cheque", "other"]), reference: optionalText(100) }),
  z.object({ action: z.literal("cancel") }),
]);

// ---- Expenses ----------------------------------------------------------------------

export const recurrenceSchema = z.object({
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  interval: z.coerce.number().int().min(1).max(12).default(1),
  startDate: isoDate,
  endDate: optionalIsoDate.optional(),
});

export const expenseSchema = z
  .object({
    expense_date: isoDate,
    category_id: uuid,
    amount: amountInput({ positive: true }),
    tax_amount: amountInput().default("0.00"),
    tax_treatment: z.enum(["none", "gst_itc_eligible", "gst_no_itc"]).default("none"),
    vendor: optionalText(200),
    payment_method: z.enum(PAYMENT_METHODS).nullable().optional(),
    payment_status: z.enum(["unpaid", "paid"]).default("paid"),
    payment_date: optionalIsoDate.optional(),
    reference_number: optionalText(100),
    notes: optionalText(2000),
    attachment_path: optionalText(500),
    // Required, never defaulted: the person entering a platform-related cost
    // must decide whether the settlement already deducted it.
    reflected_in_settlement: z.boolean({ error: "Say whether the platform already deducted this" }),
    is_recurring_template: z.boolean().default(false),
    recurrence: recurrenceSchema.nullable().optional(),
  })
  .refine((e) => Number(e.tax_amount) <= Number(e.amount), { message: "Tax cannot exceed the amount", path: ["tax_amount"] })
  .refine((e) => !e.is_recurring_template || e.recurrence, { message: "Set how often it repeats", path: ["recurrence"] });

export const reverseExpenseSchema = z.object({
  reason: trimmed(500).min(3, "Give a reason"),
  kind: z.enum(["error", "refund"]),
  reversal_date: optionalIsoDate.optional(),
});

export const expenseCategorySchema = z.object({
  name: trimmed(100).min(1),
  treatment: z.enum(EXPENSE_TREATMENTS),
  parent_id: uuid.nullable().optional(),
  is_active: z.boolean().default(true),
});

export const expenseListSchema = filtersSchema.merge(pageSchema).extend({
  category: uuid.optional().catch(undefined),
  paymentStatus: z.enum(["unpaid", "paid"]).optional().catch(undefined),
  recurring: z.enum(["templates"]).optional().catch(undefined),
});

// ---- Advertising -----------------------------------------------------------------

export const adMetricSchema = z.object({
  ad_account_id: uuid,
  metric_date: isoDate,
  campaign_name: trimmed(300).default(""),
  adset_name: trimmed(300).default(""),
  ad_name: trimmed(300).default(""),
  spend: amountInput(),
  impressions: z.coerce.number().int().min(0).default(0),
  reach: z.coerce.number().int().min(0).nullable().optional(),
  clicks: z.coerce.number().int().min(0).default(0),
  link_clicks: z.coerce.number().int().min(0).nullable().optional(),
  purchases: decimalInput().default("0"),
  attributed_revenue: amountInput().default("0.00"),
  attribution_window: optionalText(100),
  notes: optionalText(1000),
});

export const adAccountSchema = z.object({
  platform: z.enum(["meta", "google", "meesho_ads", "other"]).default("meta"),
  name: trimmed(200).min(1),
  external_account_id: trimmed(100).min(1),
  is_active: z.boolean().default(true),
});

// ---- Cash, reconciliation ------------------------------------------------------------

export const cashTxnSchema = z.object({
  txn_type: z.enum(MANUAL_CASH_TXN_TYPES),
  txn_date: isoDate,
  amount: amountInput({ positive: true }),
  payment_account: optionalText(100),
  external_reference: optionalText(150),
  description: optionalText(500),
});

export const voidSchema = z.object({ reason: trimmed(500).min(3, "Give a reason") });

export const matchSchema = z.object({
  settlement_item_id: uuid,
  order_item_id: uuid.nullable(),
});

export const bankReceiptSchema = z.object({
  settlement_id: uuid,
  amount: amountInput({ allowNegative: true }),
  received_on: isoDate,
  reference: optionalText(100),
});

// ---- Imports ---------------------------------------------------------------------

export const mappingUpdateSchema = z.object({
  reportType: z.enum(REPORT_TYPES).optional(),
  sheetName: optionalText(200),
  headerRowIndex: z.coerce.number().int().min(0).max(100).optional(),
  fields: z.record(z.string().max(60), z.string().max(300).nullable()).optional(),
  options: z.record(z.string().max(60), z.union([z.string().max(100), z.number(), z.boolean(), z.null()])).optional(),
  saveAsDefault: z.boolean().default(false),
});

export const commitSchema = z.object({
  acknowledgeWarnings: z.boolean().default(false),
  batchSize: z.coerce.number().int().min(50).max(2000).default(500),
});

export const rollbackSchema = z.object({ reason: trimmed(500).min(3, "Give a reason") });

// ---- Settings ---------------------------------------------------------------------

export const settingsSaveSchema = z.object({
  settings: settingsSchema,
  effectiveFrom: isoDate,
  note: optionalText(500),
});

export const profileSchema = z.object({
  name: trimmed(200).min(1),
  legal_name: optionalText(200),
  gstin: z.preprocess((v) => (v === "" ? null : typeof v === "string" ? v.toUpperCase() : v), z.string().regex(/^[0-9]{2}[A-Z0-9]{13}$/, "Invalid GSTIN").nullable().optional()),
  timezone: trimmed(64).min(1),
  financial_year_start_month: z.coerce.number().int().min(1).max(12),
});

export const memberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "accountant", "viewer"]),
});

export const memberUpdateSchema = z.object({
  role: z.enum(["admin", "accountant", "viewer"]),
  is_active: z.boolean(),
});

export const bootstrapSchema = z.object({
  name: trimmed(200).min(1, "Enter your business name"),
  timezone: trimmed(64).default("Asia/Kolkata"),
  gstRegistered: z.boolean().nullable().default(null),
  defaultGstRate: z.coerce.number().min(0).max(28).nullable().default(null),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(200),
});

export const exportSchema = filtersSchema.extend({
  report: z.enum([
    "profit_loss",
    "weekly_summary",
    "monthly_report",
    "product_profitability",
    "expense_breakdown",
    "reconciliation",
    "inventory",
    "cash_flow",
    "orders",
    "expenses",
    "import_errors",
  ]),
  format: z.enum(["csv", "xlsx", "pdf"]),
  importId: uuid.optional(),
});
export type ExportRequest = z.infer<typeof exportSchema>;
