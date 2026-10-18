import { formatINR } from "../domain/money";
import { dec } from "../domain/money";
import { ORDER_STATUS_LABELS, type OrderStatus } from "../domain/statuses";
import { Badge, type BadgeTone } from "./kit";
import { cx } from "./cx";

/** A rupee amount, optionally coloured by sign (green profit / red loss). */
export function Amt({ v, signed, dash = "—", decimals = 2, className }: { v: string | number | null | undefined; signed?: boolean; dash?: string; decimals?: 0 | 2; className?: string }) {
  if (v === null || v === undefined || v === "") return <span className="text-zinc-600">{dash}</span>;
  const n = dec(v);
  return <span className={cx("tabular-nums", signed && (n.greaterThan(0) ? "text-emerald-400" : n.lessThan(0) ? "text-rose-400" : "text-zinc-400"), className)}>{formatINR(String(v), { decimals })}</span>;
}

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  delivered: "positive", shipped: "info", pending: "warning", cancelled: "neutral", rto: "negative",
  returned: "negative", return_requested: "warning", exchanged: "info", lost: "negative", unknown: "neutral",
};
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}
