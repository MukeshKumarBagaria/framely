"use client";

import type { ReactNode } from "react";
import {
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

// Chart colours are consistent across every chart and follow the theme
// (values live in theme.css): blue = revenue, amber = costs, green/red =
// profit/loss, lavender = advertising, teal/peach = cash in/out.
export const COLORS = {
  revenue: "var(--ba-revenue)",
  costs: "var(--ba-costs)",
  profit: "var(--ba-profit)",
  loss: "var(--ba-loss)",
  ads: "var(--ba-ads)",
  cashIn: "var(--ba-cash-in)",
  cashOut: "var(--ba-cash-out)",
  muted: "var(--ba-muted)",
  grid: "var(--ba-grid)",
};
export const CATEGORICAL = Array.from({ length: 10 }, (_, i) => `var(--ba-cat-${i + 1})`);

// Recharts shape callbacks receive internal prop types that are not exported.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeProps = any;
export type Row = Record<string, unknown>;

/** Recharts passes `key` inside shape props; React forbids spreading it into JSX. */
function withoutKey(props: ShapeProps): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key, ...rest } = props;
  return rest;
}


const axis = { stroke: COLORS.muted, fontSize: 12, tickLine: false, axisLine: false, tick: { fill: "var(--color-zinc-500)" } } as const;
const tooltipStyle = {
  contentStyle: { background: "var(--color-zinc-900)", border: "1px solid var(--color-zinc-800)", borderRadius: 12, fontSize: 13, color: "var(--color-zinc-100)", boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)", padding: "8px 12px" },
  labelStyle: { color: "var(--color-zinc-400)", marginBottom: 4, fontWeight: 500 },
  itemStyle: { padding: 0 },
  cursor: { fill: "color-mix(in oklab, var(--color-zinc-500) 10%, transparent)" },
};

const legendProps = {
  iconType: "circle" as const,
  iconSize: 8,
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
  formatter: (value: unknown) => <span style={{ color: "var(--color-zinc-400)" }}>{String(value)}</span>,
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
          <div style={{ height: Math.min(height, 180) }} className="flex items-center justify-center">
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
        <Legend {...legendProps} />
        {percent && <ReferenceLine y={0} stroke={COLORS.muted} strokeDasharray="3 3" />}
        {series.map((s) => (
          <Line isAnimationActive={false} key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} strokeDasharray={s.dashed ? "4 4" : undefined} connectNulls activeDot={{ r: 4 }} />
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
        <Legend {...legendProps} />
        {series.map((s) =>
          s.type === "bar" ? (
            <Bar isAnimationActive={false} key={s.key} yAxisId={s.axis ?? "left"} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={28} cursor={onPointClick ? "pointer" : undefined} />
          ) : (
            <Line isAnimationActive={false} key={s.key} yAxisId={s.axis ?? "left"} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} strokeDasharray={s.dashed ? "4 4" : undefined} />
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
        <Legend {...legendProps} />
        <ReferenceLine y={0} stroke={COLORS.muted} />
        {series.map((s) => (
          <Bar isAnimationActive={false}
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? 0 : [3, 3, 0, 0]}
            maxBarSize={36}
            cursor={onBarClick ? "pointer" : undefined}
            onClick={onBarClick ? (entry) => onBarClick(entry.payload as Record<string, unknown>) : undefined}
            shape={(raw: ShapeProps) => {
              const props = withoutKey(raw);
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
            <Pie isAnimationActive={false}
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={1}
              stroke="var(--color-zinc-900)"
              onClick={onSliceClick ? (d) => onSliceClick(d.payload as Slice) : undefined}
              cursor={onSliceClick ? "pointer" : undefined}
              shape={(raw: ShapeProps) => <Sector {...withoutKey(raw)} fill={String(raw.payload?.fill ?? raw.fill)} />}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-zinc-500">{centerLabel ?? "Total"}</span>
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
        <YAxis type="category" dataKey="label" {...axis} width={120} tick={{ fill: "var(--color-zinc-400)", fontSize: 12 }} />
        <Tooltip {...tooltipStyle} formatter={(v) => [inr(v), "Contribution"]} />
        <ReferenceLine x={0} stroke={COLORS.muted} />
        <Bar isAnimationActive={false}
          dataKey="value"
          name="Contribution"
          maxBarSize={18}
          radius={3}
          cursor={onBarClick ? "pointer" : undefined}
          onClick={onBarClick ? (entry) => onBarClick(String((entry.payload as { key: string }).key)) : undefined}
          shape={(raw: ShapeProps) => <Rectangle {...withoutKey(raw)} fill={String(raw.payload?.fill)} />}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
