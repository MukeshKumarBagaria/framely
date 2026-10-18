import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Kpi } from "../domain/kpis";
import { formatCount, formatINR, formatPercent } from "../domain/money";
import { cx, InfoTip } from "./kit";
import { baHref } from "./links";

function show(kpi: Kpi, value: string | null): string {
  if (value === null) return "—";
  if (kpi.format === "money") return formatINR(value, { decimals: 0 });
  if (kpi.format === "percent") return formatPercent(value);
  return formatCount(value);
}

function change(kpi: Kpi): { text: string; title?: string } {
  const c = kpi.comparison;
  if (c.absolute === null) return { text: "No comparison", title: "The previous period has no comparable value." };
  const abs = kpi.format === "money" ? formatINR(c.absolute, { decimals: 0 }) : kpi.format === "percent" ? `${Number(c.absolute).toFixed(1)} pts` : formatCount(c.absolute);
  const sign = Number(c.absolute) > 0 ? "+" : "";
  if (c.percent === null) return { text: `${sign}${abs}`, title: "No percentage: the previous value was zero." };
  return { text: `${sign}${abs} (${sign}${c.percent}%)` };
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const c = kpi.comparison;
  const ch = change(kpi);
  const Arrow = c.absolute === null || Number(c.absolute) === 0 ? Minus : Number(c.absolute) > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="group relative flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors focus-within:border-zinc-600 hover:border-zinc-600">
      <div className="flex items-center justify-between gap-2">
        <Link href={baHref(kpi.href)} className="text-xs font-medium text-zinc-400 after:absolute after:inset-0 after:content-[''] hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-sky-400">
          {kpi.label}
          {kpi.estimate && <span className="ml-1 rounded bg-zinc-800 px-1 text-[10px] uppercase text-zinc-400">est.</span>}
        </Link>
        <span className="relative z-10">
          <InfoTip text={kpi.tooltip} label={`How ${kpi.label} is calculated`} />
        </span>
      </div>
      <p
        className={cx(
          "truncate text-2xl font-semibold tabular-nums tracking-tight",
          kpi.value === null ? "text-zinc-500" : kpi.valueTone === "positive" ? "text-emerald-400" : kpi.valueTone === "negative" ? "text-rose-400" : "text-zinc-50",
        )}
      >
        {show(kpi, kpi.value)}
      </p>
      {kpi.value === null && kpi.unavailableReason && <p className="text-[11px] text-zinc-500">{kpi.unavailableReason}</p>}
      <p
        title={ch.title}
        className={cx(
          "flex items-center gap-1 text-xs tabular-nums",
          c.tone === "positive" ? "text-emerald-400" : c.tone === "negative" ? "text-rose-400" : "text-zinc-500",
        )}
      >
        <Arrow className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{ch.text}</span>
      </p>
      <p className="text-[11px] text-zinc-600">vs {show(kpi, kpi.previous)} before</p>
    </div>
  );
}
