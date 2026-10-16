// Fee and deduction statements: ads charges, penalties, recoveries, claims and
// compensation that a marketplace lists separately from per-order payments.
//
// These amounts were taken out of (or added to) payouts that the settlement
// report already records, so they are stored as a "fee statement" that
// affects profit but never creates a cash movement. Import only charges that
// are NOT already columns of the order payment sheet.
import { detectDateOrder, type DateOrder } from "../../domain/dates";
import { dec, money } from "../../domain/money";
import type { SettlementType } from "../../domain/statuses";
import { settlementLineSchema, type SettlementLineRecord } from "../normalized";
import type { ImportAdapter, Issue } from "../types";
import { amount, date, identifier, text } from "./common";

export function classifyFee(description: string | null): SettlementType {
  const d = (description ?? "").toLowerCase();
  if (/\bads?\b|advert|campaign|promot/.test(d)) return "ads_fee";
  if (/penalt|fine|late dispatch|cancellation charge/.test(d)) return "penalty";
  if (/recover/.test(d)) return "recovery";
  if (/claim/.test(d)) return "claim";
  if (/compensat|reimburse/.test(d)) return "compensation";
  if (/return|rto|reverse/.test(d) && /ship|logistic|courier|charge/.test(d)) return "return_shipping_fee";
  if (/ship|logistic|courier|delivery/.test(d)) return "shipping_fee";
  if (/commission/.test(d)) return "commission";
  if (/tcs/.test(d)) return "tcs";
  if (/tds/.test(d)) return "tds";
  return "platform_fee";
}

const CREDITS: SettlementType[] = ["claim", "compensation"];

export const platformFeesAdapter: ImportAdapter<SettlementLineRecord> = {
  reportType: "platform_fees",
  platform: "meesho",
  label: "Fee & deduction statement",
  description: "Ads charges, penalties, recoveries, claims and compensation listed outside the order payment sheet.",
  fields: [
    { key: "date", label: "Date", kind: "date", required: true,
      aliases: ["Deduction Date", "Transaction Date", "Payment Date", "Invoice Date", "Created Date"] },
    { key: "amount", label: "Amount", kind: "amount", required: true,
      aliases: ["Deduction Amount", "Total Amount", "Amount (Incl. GST)", "Charge", "Net Amount"] },
    { key: "fee_type", label: "Type", kind: "text",
      aliases: ["Deduction Type", "Fee Type", "Description", "Reason", "Particulars", "Charge Type", "Category"] },
    { key: "reference", label: "Reference", kind: "text",
      aliases: ["Reference ID", "Transaction ID", "Invoice No", "Invoice Number", "Campaign ID", "UTR"] },
    { key: "sub_order_no", label: "Sub Order No", kind: "text", aliases: ["Sub Order No.", "Suborder ID", "Order ID"] },
  ],
  optionDefs: [
    {
      key: "amountSign",
      label: "Amounts in this file are",
      default: "deduction",
      choices: [
        { value: "deduction", label: "Charges shown as positive numbers" },
        { value: "as_is", label: "Signed (charges negative, credits positive)" },
      ],
    },
  ],
  prepare(rows) {
    const d = detectDateOrder(rows.map((r) => r.date));
    return { file: { dateOrder: d.order }, warnings: [] as Issue[] };
  },
  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const when = date(row, "date", errors, "Date", (ctx.file.dateOrder as DateOrder) ?? "dmy", ctx.timeZone, true);
    const value = amount(row, "amount", errors, "Amount", true);
    const description = text(row, "fee_type", 300);
    const reference = text(row, "reference", 150);
    const lineId = identifier(row, "sub_order_no");
    if (errors.length > 0 || !when || value === null) return { record: null, errors, warnings };
    if (dec(value).isZero()) {
      return { record: null, errors: [{ code: "zero_amount", message: "Amount is zero" }], warnings };
    }

    const type = classifyFee(description);
    if (!description) warnings.push({ code: "fee_type_missing", message: "No description; recorded as a platform fee." });
    const asIs = String(ctx.options.amountSign ?? "deduction") === "as_is";
    const signedValue = asIs
      ? dec(value)
      : CREDITS.includes(type) ? dec(value).abs() : dec(value).abs().negated();

    const record: SettlementLineRecord = {
      kind: "settlement_line",
      platform: "meesho",
      settlement_kind: "fee_statement",
      external_settlement_id: `FEES-${when.slice(0, 7)}`,
      settlement_date: when,
      transaction_date: when,
      external_line_id: lineId,
      external_reference: reference,
      description,
      components: [{ type, amount: money(signedValue) }],
      net_amount: money(signedValue),
    };
    const valid = settlementLineSchema.safeParse(record);
    if (!valid.success) {
      return { record: null, errors: valid.error.issues.map((i) => ({ code: "invalid_record", message: i.message })), warnings };
    }
    return {
      record: valid.data,
      errors,
      warnings,
      fingerprintBasis: { when, value, description, reference, lineId },
    };
  },
  allowsRepeatedKeys: true,
};
