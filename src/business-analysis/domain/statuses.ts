// Status vocabularies shared by the database (check constraints in the
// migration), the import adapters and the UI. Keep these lists in sync with
// supabase/migrations/20261016000000_business_analysis.sql.

export const ORDER_STATUSES = [
  "pending",
  "shipped",
  "delivered",
  "return_requested",
  "returned",
  "rto",
  "cancelled",
  "exchanged",
  "lost",
  "unknown",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
  return_requested: "Return requested",
  returned: "Returned",
  rto: "RTO",
  cancelled: "Cancelled",
  exchanged: "Exchanged",
  lost: "Lost",
  unknown: "Unknown",
};

export const SALES_CHANNELS = ["meesho", "direct", "whatsapp", "other"] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];
export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  meesho: "Meesho",
  direct: "Direct",
  whatsapp: "WhatsApp",
  other: "Other",
};

/** Lifecycle rank, mirrored by business_analysis.status_rank() in SQL. */
export function statusRank(status: OrderStatus): number {
  switch (status) {
    case "pending":
    case "unknown":
      return 0;
    case "shipped":
      return 1;
    case "return_requested":
      return 3;
    case "returned":
      return 4;
    default:
      return 2;
  }
}

function key(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s\-/]+/g, "_").replace(/_+/g, "_");
}

const EXACT: Record<string, OrderStatus> = {
  DELIVERED: "delivered",
  DELIVERED_TO_CUSTOMER: "delivered",
  CANCELLED: "cancelled",
  CANCELED: "cancelled",
  CUSTOMER_CANCELLED: "cancelled",
  SELLER_CANCELLED: "cancelled",
  SUPPLIER_CANCELLED: "cancelled",
  AUTO_CANCELLED: "cancelled",
  RTO: "rto",
  RTO_INITIATED: "rto",
  RTO_LOCKED: "rto",
  RTO_COMPLETE: "rto",
  RTO_COMPLETED: "rto",
  RTO_DELIVERED: "rto",
  RTO_IN_TRANSIT: "rto",
  RTO_OFD: "rto",
  COURIER_RETURN: "rto",
  RETURN_REQUESTED: "return_requested",
  RETURN_INITIATED: "return_requested",
  RETURN_PICKED: "return_requested",
  RETURN_PICKED_UP: "return_requested",
  RETURN_IN_TRANSIT: "return_requested",
  RETURNED: "returned",
  RETURN: "returned",
  RETURN_COMPLETE: "returned",
  RETURN_COMPLETED: "returned",
  RETURN_DELIVERED: "returned",
  RETURN_RECEIVED: "returned",
  CUSTOMER_RETURN: "returned",
  SHIPPED: "shipped",
  IN_TRANSIT: "shipped",
  OUT_FOR_DELIVERY: "shipped",
  OFD: "shipped",
  DISPATCHED: "shipped",
  PICKED_UP: "shipped",
  PENDING: "pending",
  READY_TO_SHIP: "pending",
  RTS: "pending",
  ON_HOLD: "pending",
  HOLD: "pending",
  MANIFESTED: "pending",
  PLACED: "pending",
  NEW: "pending",
  CONFIRMED: "pending",
  ACCEPTED: "pending",
  EXCHANGED: "exchanged",
  EXCHANGE: "exchanged",
  DOOR_STEP_EXCHANGED: "exchanged",
  DOORSTEP_EXCHANGED: "exchanged",
  LOST: "lost",
  SHIPMENT_LOST: "lost",
  LOST_IN_TRANSIT: "lost",
};

export type NormalizedStatus = { status: OrderStatus; recognized: boolean; raw: string };

/**
 * Maps a platform's status text to the normalized vocabulary. Exact matches
 * first, then conservative prefix rules (every RTO_* sub-state is an RTO).
 * Anything else becomes "unknown" and is flagged, never guessed.
 */
export function normalizeOrderStatus(raw: unknown, extra: Record<string, OrderStatus> = {}): NormalizedStatus {
  const text = raw === null || raw === undefined ? "" : String(raw).trim();
  if (text === "") return { status: "unknown", recognized: false, raw: text };
  const k = key(text);
  const custom = Object.entries(extra).find(([alias]) => key(alias) === k);
  if (custom) return { status: custom[1], recognized: true, raw: text };
  const exact = EXACT[k];
  if (exact) return { status: exact, recognized: true, raw: text };
  if (k.startsWith("RTO")) return { status: "rto", recognized: true, raw: text };
  if (k.includes("CANCEL")) return { status: "cancelled", recognized: true, raw: text };
  if (k.startsWith("RETURN") && (k.includes("REQUEST") || k.includes("INITIAT") || k.includes("PICK"))) {
    return { status: "return_requested", recognized: true, raw: text };
  }
  return { status: "unknown", recognized: false, raw: text };
}

// ---- Settlement components ---------------------------------------------------

export const SETTLEMENT_TYPES = [
  "sale",
  "sale_return",
  "commission",
  "platform_fee",
  "shipping_fee",
  "return_shipping_fee",
  "penalty",
  "recovery",
  "ads_fee",
  "tcs",
  "tds",
  "claim",
  "compensation",
  "adjustment",
  "unclassified",
] as const;
export type SettlementType = (typeof SETTLEMENT_TYPES)[number];

export const SETTLEMENT_TYPE_LABELS: Record<SettlementType, string> = {
  sale: "Sale amount",
  sale_return: "Sale return",
  commission: "Commission",
  platform_fee: "Platform & fixed fees",
  shipping_fee: "Shipping charges",
  return_shipping_fee: "Return/RTO shipping",
  penalty: "Penalties",
  recovery: "Recoveries",
  ads_fee: "Marketplace ads",
  tcs: "TCS withheld",
  tds: "TDS withheld",
  claim: "Claims",
  compensation: "Compensation",
  adjustment: "Other adjustments",
  unclassified: "Unclassified (net only)",
};

/** Where each settlement component lands in the P&L. */
export type SettlementPnlLine =
  | "revenue_reference" // sale / sale_return: revenue comes from orders; used only for reconciliation
  | "platform_fees"
  | "shipping"
  | "return_shipping"
  | "penalties"
  | "advertising"
  | "tax_withheld" // TCS/TDS: claimable tax credits, not costs
  | "claims"
  | "adjustments"
  | "excluded_unclassified"; // net-only amounts with no breakdown: cannot be split, so excluded

export function settlementPnlLine(type: SettlementType): SettlementPnlLine {
  switch (type) {
    case "sale":
    case "sale_return":
      return "revenue_reference";
    case "commission":
    case "platform_fee":
      return "platform_fees";
    case "shipping_fee":
      return "shipping";
    case "return_shipping_fee":
      return "return_shipping";
    case "penalty":
    case "recovery":
      return "penalties";
    case "ads_fee":
      return "advertising";
    case "tcs":
    case "tds":
      return "tax_withheld";
    case "claim":
    case "compensation":
      return "claims";
    case "adjustment":
      return "adjustments";
    case "unclassified":
      return "excluded_unclassified";
  }
}

export const RECON_STATUSES = [
  "unsettled",
  "matched",
  "partial",
  "over_settled",
  "net_only",
  "charges_only",
  "not_due",
  "duplicate_suspected",
] as const;
export type ReconStatus = (typeof RECON_STATUSES)[number];

export const RECON_STATUS_LABELS: Record<ReconStatus, string> = {
  unsettled: "Awaiting settlement",
  matched: "Matched",
  partial: "Partially settled",
  over_settled: "Over-settled",
  net_only: "Settled (no breakdown)",
  charges_only: "Charges only",
  not_due: "Nothing due",
  duplicate_suspected: "Possible duplicate",
};

// ---- Expenses ----------------------------------------------------------------

export const EXPENSE_TREATMENTS = [
  "inventory_purchase",
  "cogs_direct",
  "variable_selling",
  "advertising",
  "operating",
  "capital",
  "finance_cost",
  "income_tax",
] as const;
export type ExpenseTreatment = (typeof EXPENSE_TREATMENTS)[number];

export const EXPENSE_TREATMENT_LABELS: Record<ExpenseTreatment, string> = {
  inventory_purchase: "Inventory purchase (cash only; COGS from recipes)",
  cogs_direct: "Direct cost of goods",
  variable_selling: "Variable selling cost",
  advertising: "Advertising",
  operating: "Operating expense",
  capital: "Capital expenditure (cash only)",
  finance_cost: "Finance cost",
  income_tax: "Income tax",
};

export const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "card", "cheque", "platform_deduction", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  card: "Card",
  cheque: "Cheque",
  platform_deduction: "Deducted by platform",
  other: "Other",
};

export const CASH_TXN_TYPES = [
  "settlement_payout",
  "expense_payment",
  "expense_refund",
  "purchase_payment",
  "other_income",
  "capital_injection",
  "owner_withdrawal",
  "loan_received",
  "loan_repayment",
  "other_inflow",
  "other_outflow",
] as const;
export type CashTxnType = (typeof CASH_TXN_TYPES)[number];
export const MANUAL_CASH_TXN_TYPES = [
  "other_income",
  "capital_injection",
  "owner_withdrawal",
  "loan_received",
  "loan_repayment",
  "other_inflow",
  "other_outflow",
] as const satisfies readonly CashTxnType[];
export type ManualCashTxnType = (typeof MANUAL_CASH_TXN_TYPES)[number];

export const CASH_TXN_LABELS: Record<CashTxnType, string> = {
  settlement_payout: "Platform settlement",
  expense_payment: "Expense payment",
  expense_refund: "Expense refund",
  purchase_payment: "Purchase order payment",
  other_income: "Other income",
  capital_injection: "Capital introduced",
  owner_withdrawal: "Owner withdrawal",
  loan_received: "Loan received",
  loan_repayment: "Loan repayment",
  other_inflow: "Other inflow",
  other_outflow: "Other outflow",
};

export const MOVEMENT_TYPES = [
  "opening",
  "purchase",
  "consumption",
  "wastage",
  "return_to_stock",
  "adjustment",
  "production_output",
  "dispatch",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export const MOVEMENT_LABELS: Record<MovementType, string> = {
  opening: "Opening stock",
  purchase: "Purchase",
  consumption: "Consumption",
  wastage: "Wastage",
  return_to_stock: "Return to stock",
  adjustment: "Adjustment",
  production_output: "Production output",
  dispatch: "Dispatch",
};
/** Direction each movement type must have; adjustments may go either way. */
export function movementSign(type: MovementType): 1 | -1 | 0 {
  switch (type) {
    case "opening":
    case "purchase":
    case "return_to_stock":
    case "production_output":
      return 1;
    case "consumption":
    case "wastage":
    case "dispatch":
      return -1;
    case "adjustment":
      return 0;
  }
}

export const MEMBER_ROLES = ["owner", "admin", "accountant", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
