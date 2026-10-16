// Reporting periods: the dashboard's date presets, the "previous equivalent
// period" each one is compared against, and the bucket size used for charts.
import {
  addDays,
  addMonths,
  diffDays,
  endOfMonth,
  financialYearOf,
  formatDateIN,
  formatMonthLabel,
  formatShortDate,
  isIsoDate,
  minIso,
  parts,
  rangeLength,
  startOfMonth,
  startOfWeek,
  type IsoDate,
} from "./dates";

export const DATE_PRESETS = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_week",
  "previous_week",
  "this_month",
  "previous_month",
  "this_fy",
  "previous_fy",
  "custom",
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  this_week: "This week",
  previous_week: "Previous week",
  this_month: "This month",
  previous_month: "Previous month",
  this_fy: "Current financial year",
  previous_fy: "Previous financial year",
  custom: "Custom range",
};

export type Period = {
  preset: DatePreset;
  from: IsoDate;
  to: IsoDate;
  label: string;
  /** True when the period ends in the future and has been cut off at today. */
  toDate: boolean;
};

export type PeriodPair = { current: Period; previous: Period };

/**
 * Resolves a preset against "today" in the business timezone.
 *
 * Comparison rules:
 *   - Rolling windows (last 7/30 days, today, yesterday, custom) compare
 *     against the window of the same length immediately before.
 *   - Calendar periods still in progress (this week/month/FY) compare against
 *     the same elapsed span of the previous period: 1–16 Oct vs 1–16 Sep.
 *   - Completed calendar periods compare against the whole previous period.
 */
export function resolvePeriod(
  preset: DatePreset,
  today: IsoDate,
  fyStartMonth = 4,
  custom?: { from?: string | null; to?: string | null },
): PeriodPair {
  switch (preset) {
    case "today":
      return rolling(preset, today, today);
    case "yesterday": {
      const y = addDays(today, -1);
      return rolling(preset, y, y);
    }
    case "last_7_days":
      return rolling(preset, addDays(today, -6), today);
    case "last_30_days":
      return rolling(preset, addDays(today, -29), today);
    case "this_week": {
      const from = startOfWeek(today);
      const elapsed = diffDays(from, today);
      const prevFrom = addDays(from, -7);
      return pair(
        { preset, from, to: today, label: `This week (${formatDateIN(from)} – ${formatDateIN(today)})`, toDate: true },
        { preset, from: prevFrom, to: addDays(prevFrom, elapsed), label: "Same days last week", toDate: false },
      );
    }
    case "previous_week": {
      const from = addDays(startOfWeek(today), -7);
      const to = addDays(from, 6);
      const prevFrom = addDays(from, -7);
      return pair(
        { preset, from, to, label: `Week of ${formatDateIN(from)}`, toDate: false },
        { preset, from: prevFrom, to: addDays(prevFrom, 6), label: `Week of ${formatDateIN(prevFrom)}`, toDate: false },
      );
    }
    case "this_month": {
      const from = startOfMonth(today);
      const prevFrom = addMonths(from, -1);
      const elapsed = parts(today).d;
      const prevTo = minIso(addDays(prevFrom, elapsed - 1), endOfMonth(prevFrom));
      return pair(
        { preset, from, to: today, label: `${formatMonthLabel(from)} to date`, toDate: true },
        { preset, from: prevFrom, to: prevTo, label: `Same days of ${formatMonthLabel(prevFrom)}`, toDate: false },
      );
    }
    case "previous_month": {
      const from = addMonths(startOfMonth(today), -1);
      const prevFrom = addMonths(from, -1);
      return pair(
        { preset, from, to: endOfMonth(from), label: formatMonthLabel(from), toDate: false },
        { preset, from: prevFrom, to: endOfMonth(prevFrom), label: formatMonthLabel(prevFrom), toDate: false },
      );
    }
    case "this_fy": {
      const fy = financialYearOf(today, fyStartMonth);
      const prev = financialYearOf(addDays(fy.start, -1), fyStartMonth);
      const elapsed = diffDays(fy.start, today);
      return pair(
        { preset, from: fy.start, to: today, label: `${fy.label} to date`, toDate: true },
        {
          preset,
          from: prev.start,
          to: minIso(addDays(prev.start, elapsed), prev.end),
          label: `Same span of ${prev.label}`,
          toDate: false,
        },
      );
    }
    case "previous_fy": {
      const fy = financialYearOf(addDays(financialYearOf(today, fyStartMonth).start, -1), fyStartMonth);
      const prev = financialYearOf(addDays(fy.start, -1), fyStartMonth);
      return pair(
        { preset, from: fy.start, to: fy.end, label: fy.label, toDate: false },
        { preset, from: prev.start, to: prev.end, label: prev.label, toDate: false },
      );
    }
    case "custom": {
      const from = custom?.from;
      const to = custom?.to;
      if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
        return resolvePeriod("last_30_days", today, fyStartMonth);
      }
      return rolling("custom", from, to);
    }
  }
}

function rolling(preset: DatePreset, from: IsoDate, to: IsoDate): PeriodPair {
  const len = rangeLength(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(len - 1));
  const label =
    preset === "custom" ? `${formatDateIN(from)} – ${formatDateIN(to)}` : rangeLabel(preset, from, to);
  return pair(
    { preset, from, to, label, toDate: false },
    { preset, from: prevFrom, to: prevTo, label: `Previous ${len} day${len === 1 ? "" : "s"}`, toDate: false },
  );
}

function rangeLabel(preset: DatePreset, from: IsoDate, to: IsoDate): string {
  if (from === to) return `${PRESET_LABELS[preset]} (${formatDateIN(from)})`;
  return `${PRESET_LABELS[preset]} (${formatDateIN(from)} – ${formatDateIN(to)})`;
}

function pair(current: Period, previous: Period): PeriodPair {
  return { current, previous };
}

// ---- Chart buckets -----------------------------------------------------------

export type Bucket = "day" | "week" | "month";

/** Daily up to ~2 months, weekly up to ~6 months, monthly beyond. */
export function bucketForRange(from: IsoDate, to: IsoDate): Bucket {
  const len = rangeLength(from, to);
  if (len <= 62) return "day";
  if (len <= 186) return "week";
  return "month";
}

export function bucketKey(day: IsoDate, bucket: Bucket): IsoDate {
  if (bucket === "day") return day;
  if (bucket === "week") return startOfWeek(day);
  return startOfMonth(day);
}

export function bucketLabel(key: IsoDate, bucket: Bucket): string {
  if (bucket === "day") return formatShortDate(key);
  if (bucket === "week") return `w/c ${formatShortDate(key)}`;
  return formatMonthLabel(key);
}

/** Every bucket key in the range, so charts show empty days as zero instead of skipping them. */
export function bucketKeys(from: IsoDate, to: IsoDate, bucket: Bucket): IsoDate[] {
  const keys: IsoDate[] = [];
  let k = bucketKey(from, bucket);
  while (k <= to) {
    keys.push(k);
    k = bucket === "day" ? addDays(k, 1) : bucket === "week" ? addDays(k, 7) : addMonths(k, 1);
  }
  return keys;
}
