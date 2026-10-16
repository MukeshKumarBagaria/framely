// Meesho returns & RTO report. Updates the status of order lines that are
// already imported (with status history); it never creates orders and never
// records money — refunds and return charges arrive through settlements.
import { detectDateOrder, type DateOrder } from "../../domain/dates";
import { returnEventSchema, type ReturnEventRecord } from "../normalized";
import type { ImportAdapter, Issue } from "../types";
import { date, identifier, text } from "./common";

export function classifyReturn(typeText: string | null, statusText: string | null): {
  eventType: "return" | "rto";
  status: "return_requested" | "returned" | "rto";
} {
  const t = (typeText ?? "").toUpperCase();
  const s = (statusText ?? "").toUpperCase();
  if (/RTO|COURIER|UNDELIVER|RETURN TO ORIGIN/.test(t) || /^RTO/.test(s)) return { eventType: "rto", status: "rto" };
  const completed = /DELIVERED|RECEIVED|COMPLETE|CLOSED|RETURNED/.test(s) && !/IN.?TRANSIT|PICK/.test(s);
  return { eventType: "return", status: completed ? "returned" : "return_requested" };
}

export const meeshoReturnsAdapter: ImportAdapter<ReturnEventRecord> = {
  reportType: "meesho_returns",
  platform: "meesho",
  label: "Meesho returns & RTO report",
  description: "Customer returns and courier returns (RTO). Updates the status of imported orders.",
  fields: [
    { key: "sub_order_no", label: "Sub Order No", kind: "text", required: true,
      aliases: ["Sub Order No.", "Sub Order Number", "Suborder ID", "Sub Order ID"] },
    { key: "return_type", label: "Return Type", kind: "text",
      aliases: ["Type of Return", "Type", "Return Category", "Return/RTO"] },
    { key: "status", label: "Return Status", kind: "text", aliases: ["Status", "Current Status"] },
    { key: "date", label: "Return Created Date", kind: "date",
      aliases: ["Return Date", "Return Created On", "Return Requested Date", "RTO Date", "Created Date", "Date"] },
    { key: "reason", label: "Return Reason", kind: "text", aliases: ["Reason", "Detailed Return Reason", "Sub Reason"] },
  ],
  prepare(rows) {
    const d = detectDateOrder(rows.map((r) => r.date));
    const warnings: Issue[] = d.conflicting ? [{ code: "date_order_conflict", message: "Dates mix day-first and month-first formats." }] : [];
    return { file: { dateOrder: d.order }, warnings };
  },
  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const lineId = identifier(row, "sub_order_no");
    if (!lineId) errors.push({ code: "missing_value", field: "sub_order_no", message: "Sub Order No is missing" });
    const typeText = text(row, "return_type", 100);
    const statusText = text(row, "status", 100);
    if (!typeText && !statusText) {
      errors.push({ code: "missing_value", field: "return_type", message: "Neither a return type nor a status is given; cannot tell a return from an RTO." });
    }
    const eventDate = date(row, "date", warnings, "Return date", (ctx.file.dateOrder as DateOrder) ?? "dmy", ctx.timeZone);
    if (errors.length > 0 || !lineId) return { record: null, errors, warnings, naturalKey: lineId ?? undefined };

    const c = classifyReturn(typeText, statusText);
    const record = {
      kind: "return_event" as const,
      channel: "meesho" as const,
      external_line_id: lineId,
      event_type: c.eventType,
      status: c.status,
      raw_status: [typeText, statusText].filter(Boolean).join(" / ").slice(0, 200),
      event_date: eventDate,
      reason: text(row, "reason", 500),
    };
    const valid = returnEventSchema.safeParse(record);
    if (!valid.success) {
      return { record: null, errors: valid.error.issues.map((i) => ({ code: "invalid_record", message: `${i.path.join(".")}: ${i.message}` })), warnings };
    }
    const rank = c.status === "returned" ? 4 : c.status === "return_requested" ? 3 : 2;
    return { record: valid.data, errors, warnings, naturalKey: lineId, rank };
  },
};
