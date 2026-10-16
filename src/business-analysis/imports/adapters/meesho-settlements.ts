// Meesho payments / settlement report (Supplier Panel → Payments → download
// the order payments sheet). One row per sub-order payment line, with the
// final amount Meesho settled and its breakdown into sale, fees, shipping,
// taxes withheld and adjustments.
//
// Sign conventions differ between exports (some show deductions as negative
// numbers, others as positive amounts in a "deduction" column). Instead of
// assuming, the adapter tests both readings against each row's Final
// Settlement Amount and uses whichever reconciles for the most rows. Any
// unexplained remainder is kept as an explicit "adjustment" so the
// components always add up to what was actually paid.
import { formatDateIN, type DateOrder } from "../../domain/dates";
import { dec, money, type Money } from "../../domain/money";
import type { SettlementType } from "../../domain/statuses";
import { settlementLineSchema, type SettlementLineRecord } from "../normalized";
import type { AdapterRow, FieldDef, ImportAdapter, Issue } from "../types";
import { amount, date, identifier, text } from "./common";
import { detectDateOrder } from "../../domain/dates";

type ComponentField = FieldDef & { component: SettlementType };

/** Credits increase the payout; every other component reduces it. */
const CREDIT_TYPES: SettlementType[] = ["sale", "claim", "compensation"];

export const SETTLEMENT_COMPONENT_FIELDS: ComponentField[] = [
  { key: "sale_amount", label: "Total Sale Amount (Incl. Shipping & GST)", kind: "amount", component: "sale",
    aliases: ["Total Sale Amount", "Sale Amount", "Gross Sale Amount"] },
  { key: "sale_return_amount", label: "Total Sale Return Amount (Incl. Shipping & GST)", kind: "amount", component: "sale_return",
    aliases: ["Total Sale Return Amount", "Sale Return Amount", "Return Amount"] },
  { key: "commission", label: "Meesho Commission (Incl. GST)", kind: "amount", component: "commission",
    aliases: ["Meesho Commission", "Commission (Incl. GST)", "Commission"] },
  { key: "fixed_fee", label: "Fixed Fee (Incl. GST)", kind: "amount", component: "platform_fee", aliases: ["Fixed Fee"] },
  { key: "gold_fee", label: "Meesho gold platform fee (Incl. GST)", kind: "amount", component: "platform_fee", aliases: ["Gold Platform Fee"] },
  { key: "mall_fee", label: "Meesho mall platform fee (Incl. GST)", kind: "amount", component: "platform_fee", aliases: ["Mall Platform Fee"] },
  { key: "platform_fee", label: "Platform Fee", kind: "amount", component: "platform_fee", aliases: ["Platform Fee (Incl. GST)"] },
  { key: "warehousing_fee", label: "Warehousing fee (Incl. GST)", kind: "amount", component: "platform_fee", aliases: ["Warehousing fee (inc Gst)", "Warehousing fee"] },
  { key: "return_premium", label: "Return premium (incl GST)", kind: "amount", component: "platform_fee", aliases: ["Return Premium"] },
  { key: "return_premium_return", label: "Return premium (incl GST) of Return", kind: "amount", component: "platform_fee", aliases: [] },
  { key: "support_charges", label: "Net Other Support Service Charges (Excl. GST)", kind: "amount", component: "platform_fee",
    aliases: ["Net Other Support Service Charges"] },
  { key: "support_charges_gst", label: "GST on Net Other Support Service Charges", kind: "amount", component: "platform_fee", aliases: [] },
  { key: "shipping_charge", label: "Shipping Charge (Incl. GST)", kind: "amount", component: "shipping_fee",
    aliases: ["Shipping Charge", "Shipping Charges", "Forward Shipping Charge"] },
  { key: "return_shipping_charge", label: "Return Shipping Charge (Incl. GST)", kind: "amount", component: "return_shipping_fee",
    aliases: ["Return Shipping Charge", "Return Shipping Charges", "RTO Charges", "Reverse Shipping Charge"] },
  { key: "gst_compensation", label: "GST Compensation (PRP Shipping)", kind: "amount", component: "compensation", aliases: ["GST Compensation"] },
  { key: "tcs", label: "TCS", kind: "amount", component: "tcs", aliases: ["TCS Amount", "Tax Collected at Source"] },
  { key: "tds", label: "TDS", kind: "amount", component: "tds", aliases: ["TDS Amount", "Tax Deducted at Source"] },
  { key: "compensation", label: "Compensation", kind: "amount", component: "compensation", aliases: [] },
  { key: "claims", label: "Claims", kind: "amount", component: "claim", aliases: ["Claim Amount"] },
  { key: "recovery", label: "Recovery", kind: "amount", component: "recovery", aliases: ["Recovery Amount", "Recoveries"] },
  { key: "penalty", label: "Penalty", kind: "amount", component: "penalty", aliases: ["Penalties", "Penalty Amount"] },
  { key: "ads_deduction", label: "Ads Deduction", kind: "amount", component: "ads_fee", aliases: ["Ads Cost", "Ad Spend Deduction"] },
];

const TOLERANCE = dec("0.05");

type Convention = "as_is" | "deduction_positive";

function signed(type: SettlementType, value: Money, convention: Convention): Money {
  if (convention === "as_is") return value;
  const abs = dec(value).abs();
  return money(CREDIT_TYPES.includes(type) ? abs : abs.negated());
}

function componentsFor(row: AdapterRow, issues: Issue[]): { type: SettlementType; amount: Money }[] {
  const out: { type: SettlementType; amount: Money }[] = [];
  for (const f of SETTLEMENT_COMPONENT_FIELDS) {
    const v = amount(row, f.key, issues, f.label);
    if (v !== null && !dec(v).isZero()) out.push({ type: f.component, amount: v });
  }
  return out;
}

function totalOf(components: { type: SettlementType; amount: Money }[], convention: Convention) {
  return components.reduce((t, c) => t.plus(signed(c.type, c.amount, convention)), dec(0));
}

export const meeshoSettlementsAdapter: ImportAdapter<SettlementLineRecord> = {
  reportType: "meesho_settlements",
  platform: "meesho",
  label: "Meesho payment / settlement report",
  description: "What Meesho actually paid per sub-order, with fees, shipping and tax deductions.",
  fields: [
    { key: "sub_order_no", label: "Sub Order No", kind: "text",
      aliases: ["Sub Order No.", "Sub Order Number", "Suborder ID", "Sub Order ID"] },
    { key: "final_amount", label: "Final Settlement Amount", kind: "amount", required: true,
      aliases: ["Net Settlement Amount", "Settlement Amount", "Net Payable", "Amount Settled", "Bank Settlement Value", "Net Amount"] },
    { key: "payment_date", label: "Payment Date", kind: "date", required: true,
      aliases: ["Settlement Date", "Paid On", "Credited On", "Payout Date"] },
    { key: "transaction_id", label: "Transaction ID", kind: "text",
      aliases: ["Transaction Id", "UTR", "UTR No", "Payment Reference", "Settlement ID", "Payout ID", "Reference No"] },
    { key: "order_date", label: "Order Date", kind: "date", aliases: [] },
    { key: "live_status", label: "Live Order Status", kind: "text", aliases: ["Order Status", "Status"] },
    ...SETTLEMENT_COMPONENT_FIELDS.map(({ component: _component, ...f }) => f),
  ],
  allowsRepeatedKeys: true,

  prepare(rows) {
    const warnings: Issue[] = [];
    const dates = detectDateOrder(rows.flatMap((r) => [r.payment_date, r.order_date]).filter((v) => v !== null));
    let asIs = 0;
    let deduction = 0;
    let withComponents = 0;
    for (const row of rows) {
      const scratch: Issue[] = [];
      const final = amount(row, "final_amount", scratch, "Final Settlement Amount");
      const components = componentsFor(row, scratch);
      if (final === null || components.length === 0) continue;
      withComponents++;
      if (totalOf(components, "as_is").minus(final).abs().lessThanOrEqualTo(TOLERANCE)) asIs++;
      if (totalOf(components, "deduction_positive").minus(final).abs().lessThanOrEqualTo(TOLERANCE)) deduction++;
    }
    const convention: Convention = deduction > asIs ? "deduction_positive" : "as_is";
    if (withComponents === 0) {
      warnings.push({
        code: "no_breakdown",
        message: "No fee/deduction columns were mapped. Payouts will be recorded for cash flow and reconciliation, but platform fees cannot be shown in profit.",
      });
    } else {
      const matched = Math.max(asIs, deduction);
      warnings.push({
        code: "sign_convention",
        message: `${convention === "as_is" ? "Deductions are shown as negative numbers" : "Deductions are shown as positive amounts"} — the breakdown adds up to the final amount on ${matched} of ${withComponents} rows.`,
      });
    }
    if (dates.conflicting) warnings.push({ code: "date_order_conflict", message: "Dates in this file mix day-first and month-first formats." });
    return { file: { convention, dateOrder: dates.order }, warnings };
  },

  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const order = (ctx.file.dateOrder as DateOrder) ?? "dmy";
    const convention = (ctx.file.convention as Convention) ?? "as_is";

    const lineId = identifier(row, "sub_order_no");
    const final = amount(row, "final_amount", errors, "Final Settlement Amount", true);
    const paymentDate = date(row, "payment_date", errors, "Payment Date", order, ctx.timeZone);
    const txnId = text(row, "transaction_id", 150);
    const rawComponents = componentsFor(row, errors);

    if (!paymentDate && errors.every((e) => e.field !== "payment_date")) {
      // Not yet paid: importing it now would create a second copy of the same
      // line once the paid version arrives with a different payment date.
      errors.push({
        code: "not_yet_paid",
        field: "payment_date",
        message: "No payment date — this line has not been settled yet and is skipped. It will be imported from a later report once paid.",
      });
    }
    if (errors.length > 0 || final === null || !paymentDate) {
      return { record: null, errors, warnings, naturalKey: lineId ?? undefined };
    }

    const components = rawComponents.map((c) => ({ type: c.type, amount: signed(c.type, c.amount, convention) }));
    // One amount per type per row (several fee columns roll into platform_fee).
    const byType = new Map<SettlementType, ReturnType<typeof dec>>();
    for (const c of components) byType.set(c.type, (byType.get(c.type) ?? dec(0)).plus(c.amount));
    const hasSale = byType.has("sale") || byType.has("sale_return");
    const remainder = dec(final).minus([...byType.values()].reduce((t, v) => t.plus(v), dec(0)));
    if (!remainder.isZero()) {
      const type: SettlementType = byType.size === 0 || !hasSale ? "unclassified" : "adjustment";
      byType.set(type, (byType.get(type) ?? dec(0)).plus(remainder));
      if (type === "adjustment" && remainder.abs().greaterThan(1)) {
        warnings.push({
          code: "unexplained_remainder",
          message: `The listed components differ from the final amount by ${money(remainder)}; the difference is recorded as an adjustment.`,
        });
      }
    }

    const record: SettlementLineRecord = {
      kind: "settlement_line",
      platform: "meesho",
      settlement_kind: "payout",
      external_settlement_id: txnId ?? `PAYOUT-${paymentDate}`,
      settlement_date: paymentDate,
      transaction_date: paymentDate,
      external_line_id: lineId,
      external_reference: txnId,
      description: lineId ? null : text(row, "live_status", 200) ?? `Payment line dated ${formatDateIN(paymentDate)}`,
      components: [...byType.entries()]
        .filter(([, v]) => !v.isZero())
        .map(([type, v]) => ({ type, amount: money(v) })),
      net_amount: final,
    };
    if (record.components.length === 0) record.components.push({ type: "unclassified", amount: final });

    const valid = settlementLineSchema.safeParse(record);
    if (!valid.success) {
      return {
        record: null,
        errors: valid.error.issues.map((i) => ({ code: "invalid_record", message: `${i.path.join(".")}: ${i.message}` })),
        warnings,
      };
    }
    // Fingerprint only the financial identity of the line, so a re-download
    // where only "Live Order Status" changed is still recognised as the same
    // payment and not imported twice.
    return {
      record: valid.data,
      errors,
      warnings,
      naturalKey: lineId ?? undefined,
      fingerprintBasis: {
        line: lineId,
        txn: txnId,
        paid: paymentDate,
        final,
        components: record.components,
      },
    };
  },
};
