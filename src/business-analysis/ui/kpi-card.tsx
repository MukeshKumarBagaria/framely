import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Kpi } from "../domain/kpis";
import { formatCount, formatINR, formatPercent } from "../domain/money";
import { cx } from "./cx";
import { InfoTip } from "./kit";
import { baHref } from "./links";

function show(kpi: Kpi, value: string | null): string {
  if (value === null) return "—";
  if (kpi.format === "money") return formatINR(value, { decimals: 0 });
  if (kpi.format === "percent") return formatPercent(value);
  return formatCount(value);
}

function change(kpi: Kpi): { text: string; title: string } {
  const c = kpi.comparison;
  const before = `Previous period: ${show(kpi, kpi.previous)}`;
  if (c.absolute === null) return { text: "No comparison", title: `${before}. The previous period has no comparable value.` };
  const sign = Number(c.absolute) > 0 ? "+" : "";
  const abs = kpi.format === "money" ? formatINR(c.absolute, { decimals: 0 }) : kpi.format === "percent" ? `${Number(c.absolute).toFixed(1)} pts` : formatCount(c.absolute);
  if (c.percent === null) return { text: `${sign}${abs}`, title: `${before}. No percentage because the previous value was zero.` };
  return { text: `${sign}${c.percent}%`, title: `${before}. Change: ${sign}${abs}.` };
}

/** KPI tile. "hero" for the headline numbers, "compact" for the rest. */
export function KpiCard({ kpi, size = "compact" }: { kpi: Kpi; size?: "hero" | "compact" }) {
  const c = kpi.comparison;
  const ch = change(kpi);
  const Arrow = c.absolute === null || Number(c.absolute) === 0 ? Minus : Number(c.absolute) > 0 ? ArrowUpRight : ArrowDownRight;
  const hero = size === "hero";
  return (
    <div className={cx("ba-surface group relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 transition-colors focus-within:border-zinc-600 hover:border-zinc-700", hero ? "gap-2 p-5" : "gap-1.5 p-4")}>
      <div className="flex items-center justify-between gap-2">
        <Link href={baHref(kpi.href)} className="text-[13px] font-medium text-zinc-400 after:absolute after:inset-0 after:content-[''] hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-sky-400">
          {kpi.label}
          {kpi.estimate && <span className="ml-1.5 rounded bg-zinc-800 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-zinc-500">est.</span>}
        </Link>
        <span className="relative z-10">
          <InfoTip text={kpi.tooltip} label={`How ${kpi.label} is calculated`} />
        </span>
      </div>
      <p
        className={cx(
          "truncate font-semibold tabular-nums tracking-tight",
          hero ? "text-[28px] leading-9" : "text-xl",
          kpi.value === null ? "text-zinc-600" : kpi.valueTone === "positive" ? "text-emerald-400" : kpi.valueTone === "negative" ? "text-rose-400" : "text-zinc-50",
        )}
      >
        {show(kpi, kpi.value)}
      </p>
      {kpi.value === null && kpi.unavailableReason ? (
        <p className="text-xs text-zinc-500">{kpi.unavailableReason}</p>
      ) : (
        <p title={ch.title} className="flex items-center gap-1.5 text-xs">
          <span
            className={cx(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
              c.tone === "positive" ? "bg-emerald-950 text-emerald-400" : c.tone === "negative" ? "bg-rose-950 text-rose-400" : "bg-zinc-800 text-zinc-400",
            )}
          >
            <Arrow className="h-3 w-3 shrink-0" aria-hidden />
            {ch.text}
          </span>
          <span className="text-zinc-500">vs previous</span>
        </p>
      )}
    </div>
  );
}
