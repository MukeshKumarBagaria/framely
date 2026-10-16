"use client";

import { useMemo, type ReactNode } from "react";
import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cx, EmptyState } from "./kit";
import { useUrlState } from "./use-url-state";

// Server-driven data table on TanStack Table v9. Sorting and pagination are
// "manual": the table renders the page the server returned, and changes are
// written to the URL, which re-queries the database. Nothing is sorted or
// sliced in the browser, so very large ledgers stay fast.

export const tableFeaturesConfig = tableFeatures({ rowSortingFeature });
type Features = typeof tableFeaturesConfig;

export type Column<T extends RowData> = ColumnDef<Features, T, unknown> & {
  meta?: { align?: "left" | "right"; className?: string; sortKey?: string };
};

export function columnHelper<T extends RowData>() {
  return createColumnHelper<Features, T>();
}

export function DataTable<T extends RowData>({
  columns,
  data,
  total,
  page,
  pageSize,
  emptyTitle = "No records",
  emptyBody,
  onRowClick,
  rowClassName,
  caption,
  sortParam = "sort",
  dirParam = "dir",
  pageParam = "page",
  getRowId,
}: {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  emptyTitle?: string;
  emptyBody?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  caption: string;
  sortParam?: string;
  dirParam?: string;
  pageParam?: string;
  getRowId?: (row: T, index: number) => string;
}) {
  const { params, set, pending } = useUrlState();
  const sortKey = params.get(sortParam);
  const sorting: SortingState = useMemo(
    () => (sortKey ? [{ id: sortKey, desc: params.get(dirParam) !== "asc" }] : []),
    [sortKey, params, dirParam],
  );

  const table = useTable<Features, T>({
    features: tableFeaturesConfig,
    columns,
    data,
    getRowId,
    manualSorting: true,
    enableMultiSort: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      set({ [sortParam]: first?.id ?? null, [dirParam]: first ? (first.desc ? "desc" : "asc") : null });
    },
  });

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className={cx("relative", pending && "opacity-70 transition-opacity")} aria-busy={pending || undefined}>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-max border-collapse text-left text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-zinc-900/80 text-[11px] uppercase tracking-wide text-zinc-400">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = (header.column.columnDef as Column<T>).meta;
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={cx("whitespace-nowrap border-b border-zinc-800 px-3 py-2 font-medium", meta?.align === "right" && "text-right")}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cx("inline-flex items-center gap-1 hover:text-zinc-100", meta?.align === "right" && "flex-row-reverse")}
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : sorted === "desc" ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={onRowClick ? (e) => (e.key === "Enter" ? onRowClick(row.original) : undefined) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cx(
                  "border-b border-zinc-800/70 last:border-0",
                  onRowClick && "cursor-pointer hover:bg-zinc-800/40 focus:bg-zinc-800/50 focus:outline-none",
                  rowClassName?.(row.original),
                )}
              >
                {row.getAllCells().map((cell) => {
                  const meta = (cell.column.columnDef as Column<T>).meta;
                  return (
                    <td key={cell.id} className={cx("whitespace-nowrap px-3 py-2 text-zinc-200", meta?.align === "right" && "text-right tabular-nums", meta?.className)}>
                      <table.FlexRender cell={cell} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>}
      </div>
      {total > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <span>
            {from.toLocaleString("en-IN")}–{to.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => set({ [pageParam]: String(page - 1) }, { resetPage: false })}
              className="rounded border border-zinc-800 p-1.5 hover:border-zinc-600 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="px-2">
              Page {page} of {pages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => set({ [pageParam]: String(page + 1) }, { resetPage: false })}
              className="rounded border border-zinc-800 p-1.5 hover:border-zinc-600 disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
