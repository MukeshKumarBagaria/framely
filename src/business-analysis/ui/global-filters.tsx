"use client";

import { useState } from "react";
import { Calendar, X } from "lucide-react";
import { DATE_PRESETS, PRESET_LABELS, type DatePreset } from "../domain/periods";
import { CHANNEL_LABELS, ORDER_STATUSES, ORDER_STATUS_LABELS, SALES_CHANNELS } from "../domain/statuses";
import { Button, cx, Input, Select } from "./kit";
import { useUrlState } from "./use-url-state";

type Show = { channel?: boolean; sku?: boolean; status?: boolean; settlement?: boolean };

export function GlobalFilters({
  periodLabel,
  comparisonLabel,
  defaultPreset = "this_month",
  show = { channel: true, sku: true, status: true, settlement: true },
  skus = [],
}: {
  periodLabel: string;
  comparisonLabel?: string;
  defaultPreset?: DatePreset;
  show?: Show;
  skus?: string[];
}) {
  const { params, set, pending } = useUrlState();
  const preset = (params.get("preset") as DatePreset | null) ?? defaultPreset;
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [sku, setSku] = useState(params.get("sku") ?? "");
  const statuses = (params.get("status") ?? "").split(",").filter(Boolean);
  const active = ["channel", "sku", "status", "settlement"].some((k) => params.get(k));

  const toggleStatus = (s: string) => {
    const next = statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s];
    set({ status: next.length ? next.join(",") : null });
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3" role="search" aria-label="Report filters">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
          Period
          <Select
            aria-label="Date range"
            value={preset}
            onChange={(e) => {
              const v = e.target.value as DatePreset;
              if (v === "custom") set({ preset: v, from: from || null, to: to || null });
              else set({ preset: v, from: null, to: null });
            }}
            className="w-48"
          >
            {DATE_PRESETS.map((p) => (
              <option key={p} value={p}>
                {PRESET_LABELS[p]}
              </option>
            ))}
          </Select>
        </label>

        {preset === "custom" && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (from && to) set({ preset: "custom", from, to });
            }}
          >
            <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
              From
              <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-40" required />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
              To
              <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-40" required />
            </label>
            <Button type="submit" size="md" variant="secondary">
              Apply
            </Button>
          </form>
        )}

        {show.channel && (
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Channel
            <Select aria-label="Sales channel" value={params.get("channel") ?? ""} onChange={(e) => set({ channel: e.target.value || null })} className="w-36">
              <option value="">All channels</option>
              {SALES_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </Select>
          </label>
        )}

        {show.sku && (
          <form
            className="flex flex-col gap-1 text-[11px] text-zinc-500"
            onSubmit={(e) => {
              e.preventDefault();
              set({ sku: sku.trim() || null });
            }}
          >
            <label htmlFor="ba-filter-sku">Product / SKU</label>
            <Input
              id="ba-filter-sku"
              list="ba-sku-options"
              value={sku}
              placeholder="All SKUs"
              onChange={(e) => setSku(e.target.value)}
              onBlur={() => sku.trim() !== (params.get("sku") ?? "") && set({ sku: sku.trim() || null })}
              className="w-40"
            />
            <datalist id="ba-sku-options">
              {skus.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </form>
        )}

        {show.status && (
          <details className="relative">
            <summary className="flex h-9 cursor-pointer list-none flex-col justify-end text-[11px] text-zinc-500 [&::-webkit-details-marker]:hidden">
              <span>Order status</span>
              <span className="mt-1 flex h-9 w-44 items-center rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200">
                {statuses.length === 0 ? "All statuses" : statuses.length === 1 ? ORDER_STATUS_LABELS[statuses[0] as keyof typeof ORDER_STATUS_LABELS] : `${statuses.length} statuses`}
              </span>
            </summary>
            <div className="absolute z-20 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
              {ORDER_STATUSES.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-800">
                  <input type="checkbox" className="accent-zinc-200" checked={statuses.includes(s)} onChange={() => toggleStatus(s)} />
                  {ORDER_STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          </details>
        )}

        {show.settlement && (
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Settlement
            <Select aria-label="Settlement status" value={params.get("settlement") ?? ""} onChange={(e) => set({ settlement: e.target.value || null })} className="w-36">
              <option value="">Any</option>
              <option value="settled">Settled</option>
              <option value="unsettled">Not settled</option>
            </Select>
          </label>
        )}

        {active && (
          <Button
            variant="ghost"
            onClick={() => {
              setSku("");
              set({ channel: null, sku: null, status: null, settlement: null });
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
          </Button>
        )}
      </div>
      <p className={cx("flex items-center gap-1.5 text-xs text-zinc-400", pending && "animate-pulse")}>
        <Calendar className="h-3.5 w-3.5" aria-hidden />
        <span>{periodLabel}</span>
        {comparisonLabel && <span className="text-zinc-600">· compared with {comparisonLabel}</span>}
      </p>
    </div>
  );
}
