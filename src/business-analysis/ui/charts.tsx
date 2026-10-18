"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactINR, formatINR } from "../domain/money";
import { Card, EmptyState } from "./kit";

// Chart colours are consistent across every chart: sky = revenue, amber =
// costs, emerald/rose = profit/loss, violet = advertising, teal = cash in.
export const COLORS = {
  revenue: "#38bdf8",
  costs: "#f59e0b",
  profit: "#34d399",
  loss: "#fb7185",
  ads: "#a78bfa",
  cashIn: "#2dd4bf",
  cashOut: "#f97316",
  muted: "#71717a",
  grid: "#27272a",
};
export const CATEGORICAL = ["#38bdf8", "#f59e0b", "#a78bfa", "#34d399", "#f472b6", "#facc15", "#60a5fa", "#fb923c", "#c084fc", "#2dd4bf", "#e879f9", "#94a3b8"];

// Recharts shape callbacks receive internal prop types that are not exported.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeProps = any;
export type Row = Record<string, unknown>;

const axis = { stroke: COLORS.muted, fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 10, fontSize: 12, color: "#f4f4f5" },
  labelStyle: { color: "#a1a1aa", marginBottom: 4 },
  itemStyle: { padding: 0 },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

const inr = (v: unknown) => formatINR(String(v ?? 0));
const inrTick = (v: number) => formatCompactINR(String(v));

/** Card wrapper with an accessible description and an empty state. */
export function ChartCard({ title, subtitle, description, empty, emptyText, actions, children, height = 260 }: {
  title: string;
  subtitle?: ReactNode;
  description: string;
  empty: boolean;
  emptyText?: string;
  actions?: ReactNode;
  children: ReactNode;
  height?: number;
}) {
  return (
    <Card title={title} subtitle={subtitle} actions={actions}>
      <figure role="figure" aria-label={`${title}. ${description}`} className="m-0">
        <figcaption className="sr-only">{description}</figcaption>
        {empty ? (
          <div style={{ height }} className="flex items-center justify-center">
            <EmptyState title="No data for this period">{emptyText ?? "Import reports or widen the date range."}</EmptyState>
          </div>
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </figure>
    </Card>
  );
}

type Series = { key: string; name: string; color: string; type?: "line" | "bar"; axis?: "left" | "right"; dashed?: boolean; format?: "money" | "count" | "percent" };

function fmt(format: Series["format"]) {
  return format === "count" ? (v: unknown) => Number(v ?? 0).toLocaleString("en-IN") : format === "percent" ? (v: unknown) => (v === null ? "—" : `${Number(v).toFixed(1)}%`) : inr;
}

export function TrendChart({ data, xKey, series, onPointClick, percent }: {
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  onPointClick?: (row: Row) => void;
  percent?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} onClick={(s) => onPointClick && s?.activeIndex !== undefined && s.activeIndex !== null && onPointClick(data[Number(s.activeIndex)])}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={16} />
        <YAxis {...axis} width={percent ? 44 : 64} tickFormatter={percent ? (v) => `${v}%` : inrTick} />
        <Tooltip {...tooltipStyle} formatter={(v, name, item) => [fmt(series.find((s) => s.key === item.dataKey)?.format)(v), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {percent && <ReferenceLine y={0} stroke={COLORS.muted} strokeDasharray="3 3" />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} strokeDasharray={s.dashed ? "4 4" : undefined} connectNulls activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ComboChart({ data, xKey, series, onPointClick }: {
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  onPointClick?: (row: Row) => void;
}) {
  const hasRight = series.some((s) => s.axis === "right");
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} onClick={(s) => onPointClick && s?.activeIndex !== undefined && s.activeIndex !== null && onPointClick(data[Number(s.activeIndex)])}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={16} />
        <YAxis yAxisId="left" {...axis} width={64} tickFormatter={inrTick} />
        {hasRight && <YAxis yAxisId="right" orientation="right" {...axis} width={40} allowDecimals={false} />}
        <Tooltip {...tooltipStyle} formatter={(v, name, item) => [fmt(series.find((s) => s.key === item.dataKey)?.format)(v), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) =>
          s.type === "bar" ? (
            <Bar key={s.key} yAxisId={s.axis ?? "left"} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={28} cursor={onPointClick ? "pointer" : undefined} />
          ) : (
            <Line key={s.key} yAxisId={s.axis ?? "left"} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} strokeDasharray={s.dashed ? "4 4" : undefined} />
          ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GroupedBars({ data, xKey, series, stacked, onBarClick }: {
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  stacked?: boolean;
  onBarClick?: (row: Row) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={8} />
        <YAxis {...axis} width={64} tickFormatter={inrTick} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [inr(v), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke={COLORS.muted} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? 0 : [3, 3, 0, 0]}
            maxBarSize={36}
            cursor={onBarClick ? "pointer" : undefined}
            onClick={onBarClick ? (entry) => onBarClick(entry.payload as Record<string, unknown>) : undefined}
            shape={(props: ShapeProps) => {
              // Profit bars below zero are drawn in the loss colour.
              const value = Number((props.payload as Record<string, unknown>)?.[s.key] ?? 0);
              const fill = s.key === "profit" && value < 0 ? COLORS.loss : s.color;
              return <Rectangle {...(props as object)} fill={fill} />;
            }}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CumulativeArea({ data, xKey, series }: { data: Record<string, unknown>[]; xKey: string; series: Series[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`ba-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={16} />
        <YAxis {...axis} width={64} tickFormatter={inrTick} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [inr(v), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={`url(#ba-grad-${s.key})`} connectNulls />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export type Slice = { key: string; label: string; value: number; color?: string };

export function Donut({ data, onSliceClick, format = "money", centerLabel }: { data: Slice[]; onSliceClick?: (s: Slice) => void; format?: "money" | "count"; centerLabel?: string }) {
  const total = data.reduce((t, s) => t + s.value, 0);
  const rows = data.map((s, i) => ({ ...s, fill: s.color ?? CATEGORICAL[i % CATEGORICAL.length] }));
  const show = (v: number) => (format === "money" ? formatINR(String(v), { decimals: 0 }) : v.toLocaleString("en-IN"));
  return (
    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative min-h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...tooltipStyle} formatter={(v, name) => [`${show(Number(v))} (${total ? ((Number(v) / total) * 100).toFixed(1) : 0}%)`, name]} />
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={1}
              stroke="#18181b"
              onClick={onSliceClick ? (d) => onSliceClick(d.payload as Slice) : undefined}
              cursor={onSliceClick ? "pointer" : undefined}
              shape={(props: ShapeProps) => <Sector {...(props as object)} fill={String((props.payload as { fill?: string })?.fill ?? props.fill)} />}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-zinc-500">{centerLabel ?? "Total"}</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-100">{format === "money" ? formatCompactINR(String(total)) : total.toLocaleString("en-IN")}</span>
        </div>
      </div>
      <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto text-xs">
        {rows.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={onSliceClick ? () => onSliceClick(s) : undefined}
              disabled={!onSliceClick}
              className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-zinc-800/60 disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.fill }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-zinc-300">{s.label}</span>
              <span className="tabular-nums text-zinc-200">{show(s.value)}</span>
              <span className="w-12 text-right tabular-nums text-zinc-500">{total ? `${((s.value / total) * 100).toFixed(1)}%` : "—"}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HorizontalBars({ data, onBarClick }: { data: { key: string; label: string; value: number }[]; onBarClick?: (key: string) => void }) {
  const rows = data.map((d) => ({ ...d, fill: d.value < 0 ? COLORS.loss : COLORS.profit }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" {...axis} tickFormatter={inrTick} />
        <YAxis type="category" dataKey="label" {...axis} width={120} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <Tooltip {...tooltipStyle} formatter={(v) => [inr(v), "Contribution"]} />
        <ReferenceLine x={0} stroke={COLORS.muted} />
        <Bar
          dataKey="value"
          name="Contribution"
          maxBarSize={18}
          radius={3}
          cursor={onBarClick ? "pointer" : undefined}
          onClick={onBarClick ? (entry) => onBarClick(String((entry.payload as { key: string }).key)) : undefined}
          shape={(props: ShapeProps) => <Rectangle {...(props as object)} fill={String((props.payload as { fill: string })?.fill)} />}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
