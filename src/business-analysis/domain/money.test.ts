import { describe, expect, it } from "vitest";
import { formatCompactINR, formatINR, money, parseAmount, percentOf, safeDivide, sum } from "./money";

describe("parseAmount", () => {
  it.each([
    ["₹1,23,456.50", "123456.50"],
    ["Rs. 499", "499.00"],
    ["INR 1,000", "1000.00"],
    ["1,000.5", "1000.50"],
    ["(250.00)", "-250.00"],
    ["-12.5", "-12.50"],
    ["  42  ", "42.00"],
    ["1 234", "1234.00"],
    [399.99, "399.99"],
    [0, "0.00"],
  ])("parses %j as %s", (raw, expected) => {
    expect(parseAmount(raw)).toEqual({ ok: true, value: expected });
  });

  it.each(["", "-", "—", "NA", null, undefined])("treats %j as no value (not zero)", (raw) => {
    expect(parseAmount(raw)).toEqual({ ok: true, value: null });
  });

  it.each(["12abc", "1.2.3", "1,23,4", "₹", "12,34", "abc", "1e5"])("rejects %j instead of guessing", (raw) => {
    expect(parseAmount(raw).ok).toBe(false);
  });

  it("rejects non-finite numbers", () => {
    expect(parseAmount(Number.NaN).ok).toBe(false);
    expect(parseAmount(Number.POSITIVE_INFINITY).ok).toBe(false);
  });
});

describe("decimal arithmetic", () => {
  it("does not suffer binary floating point error", () => {
    expect(money(sum(["0.10", "0.20"]))).toBe("0.30");
    expect(money(sum(Array.from({ length: 1000 }, () => "0.01")))).toBe("10.00");
  });

  it("rounds half up to paise", () => {
    expect(money("2.345")).toBe("2.35");
    expect(money("-2.345")).toBe("-2.35");
  });

  it("returns null for zero denominators", () => {
    expect(safeDivide(10, 0)).toBeNull();
    expect(percentOf(10, "0.00")).toBeNull();
    expect(percentOf(25, 200)).toBe("12.50");
  });
});

describe("INR formatting", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR("1234567.5")).toBe("₹12,34,567.50");
    expect(formatINR("-500")).toBe("-₹500.00");
    expect(formatINR("999.999", { decimals: 0 })).toBe("₹1,000");
  });

  it("formats lakh and crore compactly", () => {
    expect(formatCompactINR("950")).toBe("₹950");
    expect(formatCompactINR("4200")).toBe("₹4.2K");
    expect(formatCompactINR("135000")).toBe("₹1.35L");
    expect(formatCompactINR("21000000")).toBe("₹2.1Cr");
    expect(formatCompactINR("-150000")).toBe("-₹1.5L");
  });
});
