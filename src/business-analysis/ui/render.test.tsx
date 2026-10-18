// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/business-analysis/orders",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("sort=sale_amount&dir=desc"),
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => createElement("a", { href, ...rest }, children) }));

import { columnHelper, DataTable, type Column } from "./data-table";
import { Donut, ChartCard, HorizontalBars } from "./charts";
import { KpiCard } from "./kpi-card";
import type { Kpi } from "../domain/kpis";

type Row = { id: string; name: string; amount: string };
const h = columnHelper<Row>();

describe("UI components render", () => {
  it("renders the server-driven table with sorting headers and rows", () => {
    const columns = [h.accessor("name", { header: "Name" }), h.accessor("amount", { header: "Amount", meta: { align: "right" } })] as unknown as Column<Row>[];
    const html = renderToStaticMarkup(
      createElement(DataTable<Row>, { columns, data: [{ id: "1", name: "Frame A", amount: "499.00" }], total: 120, page: 2, pageSize: 50, caption: "Test rows", getRowId: (r: Row) => r.id }),
    );
    expect(html).toContain("Frame A");
    expect(html).toContain("51–100 of 120");
    expect(html).toContain("Page 2 of 3");
  });

  it("shows an empty state instead of an empty table", () => {
    const columns = [h.accessor("name", { header: "Name" })] as unknown as Column<Row>[];
    const html = renderToStaticMarkup(createElement(DataTable<Row>, { columns, data: [], total: 0, page: 1, pageSize: 50, caption: "x", emptyTitle: "Nothing here" }));
    expect(html).toContain("Nothing here");
  });

  it("renders a KPI with an unavailable comparison rather than 0%", () => {
    const kpi: Kpi = { key: "net_profit", label: "Net profit", format: "money", value: "1250.00", previous: null, comparison: { absolute: null, percent: null, tone: "neutral", reason: "unavailable" }, valueTone: "positive", tooltip: "How it works", href: "orders?preset=this_month" };
    const html = renderToStaticMarkup(createElement(KpiCard, { kpi }));
    expect(html).toContain("₹1,250");
    expect(html).toContain("No comparison");
    expect(html).not.toContain("0%");
    expect(html).toContain("/business-analysis/orders?preset=this_month");
  });

  it("renders chart cards, donut legend and empty states", () => {
    const donut = renderToStaticMarkup(createElement(Donut, { data: [{ key: "a", label: "Materials", value: 7000 }, { key: "b", label: "Ads", value: 3000 }], centerLabel: "Total costs" }));
    expect(donut).toContain("Materials");
    expect(donut).toContain("70.0%");
    const empty = renderToStaticMarkup(<ChartCard title="T" description="d" empty><HorizontalBars data={[]} /></ChartCard>);
    expect(empty).toContain("No data for this period");
  });
});
