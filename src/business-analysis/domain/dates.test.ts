import { describe, expect, it } from "vitest";
import {
  addMonths,
  detectDateOrder,
  financialQuarterOf,
  financialYearOf,
  formatDateIN,
  parseReportDate,
  startOfWeek,
  todayIn,
} from "./dates";

describe("financial years (1 April – 31 March)", () => {
  it("puts 31 March in the year that started the previous April", () => {
    expect(financialYearOf("2027-03-31")).toMatchObject({ start: "2026-04-01", end: "2027-03-31", label: "FY 2026-27" });
  });

  it("starts a new year on 1 April", () => {
    expect(financialYearOf("2027-04-01")).toMatchObject({ start: "2027-04-01", end: "2028-03-31", label: "FY 2027-28" });
  });

  it("handles leap years at the boundary", () => {
    expect(financialYearOf("2028-02-29").end).toBe("2028-03-31");
  });

  it("supports a configurable start month", () => {
    expect(financialYearOf("2026-06-15", 1)).toMatchObject({ start: "2026-01-01", end: "2026-12-31", label: "FY 2026" });
  });

  it("numbers financial quarters from April", () => {
    expect(financialQuarterOf("2026-04-01")).toEqual({ quarter: 1, start: "2026-04-01", end: "2026-06-30" });
    expect(financialQuarterOf("2027-03-31")).toEqual({ quarter: 4, start: "2027-01-01", end: "2027-03-31" });
  });
});

describe("business timezone", () => {
  it("uses the IST calendar date, not the UTC one", () => {
    // 20:00 UTC on 15 Oct is 01:30 IST on 16 Oct.
    expect(todayIn("Asia/Kolkata", new Date("2026-10-15T20:00:00Z"))).toBe("2026-10-16");
    expect(todayIn("UTC", new Date("2026-10-15T20:00:00Z"))).toBe("2026-10-15");
  });
});

describe("calendar arithmetic", () => {
  it("clamps month addition to the last day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });

  it("starts weeks on Monday", () => {
    expect(startOfWeek("2026-10-16")).toBe("2026-10-12"); // Friday → Monday
    expect(startOfWeek("2026-10-12")).toBe("2026-10-12");
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12"); // Sunday
  });

  it("formats dates as DD/MM/YYYY", () => {
    expect(formatDateIN("2026-04-01")).toBe("01/04/2026");
  });
});

describe("parseReportDate", () => {
  it.each([
    ["2026-10-16", "2026-10-16"],
    ["2026/10/16 14:22:01", "2026-10-16"],
    ["16-10-2026", "2026-10-16"],
    ["16/10/26", "2026-10-16"],
    ["16.10.2026 09:00", "2026-10-16"],
    ["16-Oct-2026", "2026-10-16"],
    ["16 October 2026", "2026-10-16"],
    ["Oct 16, 2026", "2026-10-16"],
  ])("reads %s", (raw, expected) => {
    expect(parseReportDate(raw)).toBe(expected);
  });

  it("converts instants with an explicit offset to the business date", () => {
    expect(parseReportDate("2026-10-15T20:00:00Z", "dmy", "Asia/Kolkata")).toBe("2026-10-16");
  });

  it("respects month-first order when told", () => {
    expect(parseReportDate("03/04/2026", "dmy")).toBe("2026-04-03");
    expect(parseReportDate("03/04/2026", "mdy")).toBe("2026-03-04");
  });

  it.each(["31-02-2026", "2026-13-01", "00-01-2026", "yesterday", "", "12345"])("rejects %j", (raw) => {
    expect(parseReportDate(raw)).toBeNull();
  });
});

describe("detectDateOrder", () => {
  it("detects month-first when a value can only be month-first", () => {
    expect(detectDateOrder(["03/04/2026", "10/25/2026"])).toMatchObject({ order: "mdy", conflicting: false });
  });

  it("defaults to day-first and reports ambiguity", () => {
    expect(detectDateOrder(["03/04/2026", "05/06/2026"])).toEqual({ order: "dmy", ambiguous: true, conflicting: false });
  });

  it("flags files that mix both orders", () => {
    expect(detectDateOrder(["25/10/2026", "10/25/2026"]).conflicting).toBe(true);
  });
});
