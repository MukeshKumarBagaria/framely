import { describe, expect, it } from "vitest";
import { bucketForRange, bucketKeys, resolvePeriod } from "./periods";

const range = (p: { from: string; to: string }) => [p.from, p.to];

describe("resolvePeriod", () => {
  const today = "2026-10-16"; // a Friday

  it("compares month-to-date with the same days of the previous month", () => {
    const { current, previous } = resolvePeriod("this_month", today);
    expect(range(current)).toEqual(["2026-10-01", "2026-10-16"]);
    expect(range(previous)).toEqual(["2026-09-01", "2026-09-16"]);
  });

  it("clamps month-to-date comparisons to a shorter previous month", () => {
    const { previous } = resolvePeriod("this_month", "2026-03-31");
    expect(range(previous)).toEqual(["2026-02-01", "2026-02-28"]);
  });

  it("compares complete months with complete months", () => {
    const { current, previous } = resolvePeriod("previous_month", "2026-03-05");
    expect(range(current)).toEqual(["2026-02-01", "2026-02-28"]);
    expect(range(previous)).toEqual(["2026-01-01", "2026-01-31"]);
  });

  it("handles rolling windows", () => {
    const { current, previous } = resolvePeriod("last_7_days", today);
    expect(range(current)).toEqual(["2026-10-10", "2026-10-16"]);
    expect(range(previous)).toEqual(["2026-10-03", "2026-10-09"]);
  });

  it("handles week presets starting Monday", () => {
    expect(range(resolvePeriod("this_week", today).current)).toEqual(["2026-10-12", "2026-10-16"]);
    expect(range(resolvePeriod("this_week", today).previous)).toEqual(["2026-10-05", "2026-10-09"]);
    expect(range(resolvePeriod("previous_week", today).current)).toEqual(["2026-10-05", "2026-10-11"]);
  });

  it("resolves the current financial year to date", () => {
    const { current, previous } = resolvePeriod("this_fy", today);
    expect(range(current)).toEqual(["2026-04-01", "2026-10-16"]);
    expect(range(previous)).toEqual(["2025-04-01", "2025-10-16"]);
  });

  it("treats 1 April as day one of a new financial year", () => {
    const { current, previous } = resolvePeriod("this_fy", "2027-04-01");
    expect(range(current)).toEqual(["2027-04-01", "2027-04-01"]);
    expect(range(previous)).toEqual(["2026-04-01", "2026-04-01"]);
  });

  it("resolves the previous financial year in full", () => {
    const { current, previous } = resolvePeriod("previous_fy", "2027-03-31");
    expect(range(current)).toEqual(["2025-04-01", "2026-03-31"]);
    expect(range(previous)).toEqual(["2024-04-01", "2025-03-31"]);
  });

  it("uses custom ranges and compares with the same length before", () => {
    const { current, previous } = resolvePeriod("custom", today, 4, { from: "2026-09-01", to: "2026-09-10" });
    expect(range(current)).toEqual(["2026-09-01", "2026-09-10"]);
    expect(range(previous)).toEqual(["2026-08-22", "2026-08-31"]);
  });

  it("falls back safely from an invalid custom range", () => {
    const { current } = resolvePeriod("custom", today, 4, { from: "2026-09-10", to: "2026-09-01" });
    expect(range(current)).toEqual(["2026-09-17", "2026-10-16"]);
  });
});

describe("buckets", () => {
  it("picks day/week/month granularity by range length", () => {
    expect(bucketForRange("2026-10-01", "2026-10-31")).toBe("day");
    expect(bucketForRange("2026-04-01", "2026-08-31")).toBe("week");
    expect(bucketForRange("2026-04-01", "2027-03-31")).toBe("month");
  });

  it("lists every bucket so empty days appear as zero", () => {
    expect(bucketKeys("2026-10-01", "2026-10-03", "day")).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(bucketKeys("2026-04-15", "2026-06-02", "month")).toEqual(["2026-04-01", "2026-05-01", "2026-06-01"]);
  });
});
