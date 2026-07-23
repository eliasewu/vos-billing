"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, CheckSquare, Square } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  textAlign?: "left" | "center" | "right";
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKey?: string;
  pageSize?: number;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptySubtitle?: string;
  loading?: boolean;
  /** Field used as unique row ID for selection — required when using checkboxes */
  idKey?: string;
  /** Currently selected row IDs */
  selectedIds?: Set<number>;
  /** Called when a single row is toggled */
  onSelectToggle?: (id: number) => void;
  /** Called when select-all is toggled */
  onSelectAllToggle?: () => void;
}

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export default function DataTable<T extends object>({
  columns,
  data,
  searchKey,
  pageSize = 10,
  emptyMessage = "No records found",
  emptyIcon,
  emptySubtitle,
  loading = false,
  idKey,
  selectedIds,
  onSelectToggle,
  onSelectAllToggle,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const hasSelection = idKey && selectedIds && onSelectToggle;
  const colCount = columns.length + (hasSelection ? 1 : 0);

  const filtered = searchKey
    ? data.filter((row) =>
        String((row as Record<string, unknown>)[searchKey] ?? "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : data;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const isAllSelected = hasSelection && selectedIds!.size === filtered.length && filtered.length > 0;

  return (
    <div>
      {/* Search */}
      {searchKey && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full max-w-sm pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-sm text-surface-50 placeholder-surface-600 focus:outline-none focus:border-brand-500/50"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-surface-700/50 rounded-xl bg-surface-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800 bg-surface-900/80 sticky top-0">
              {hasSelection && (
                <th className="text-center px-2 py-3 text-surface-400 font-medium uppercase w-8">
                  {onSelectAllToggle && (
                    <button onClick={onSelectAllToggle} className="p-0.5 rounded hover:bg-surface-700">
                      {isAllSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-surface-600" />
                      )}
                    </button>
                  )}
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400 ${
                    ALIGN_CLASS[col.textAlign ?? "left"] ?? "text-left"
                  } ${col.headerClassName ?? ""}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800/50">
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: colCount }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 bg-surface-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-surface-500">
                  {emptyIcon && <div className="mb-2 flex justify-center">{emptyIcon}</div>}
                  <p className="text-sm">{emptyMessage}</p>
                  {emptySubtitle && <p className="text-xs text-surface-600 mt-1">{emptySubtitle}</p>}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => {
                const rowId = idKey ? Number((row as Record<string, unknown>)[idKey]) : undefined;
                return (
                  <tr key={rowId ?? i} className="hover:bg-surface-800/30 transition-colors">
                    {hasSelection && rowId !== undefined && (
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => onSelectToggle!(rowId)} className="p-0.5 rounded hover:bg-surface-700">
                          {selectedIds!.has(rowId) ? (
                            <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-surface-600" />
                          )}
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 text-surface-300 ${
                          ALIGN_CLASS[col.textAlign ?? "left"] ?? "text-left"
                        } ${col.cellClassName ?? ""}`}
                      >
                        {col.render
                          ? col.render(row)
                          : (String((row as Record<string, unknown>)[col.key] ?? "") as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between mt-4 text-sm text-surface-400">
          <span>
            Showing {page * pageSize + 1}-
            {Math.min((page + 1) * pageSize, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {totalPages <= 9 ? (
              // Show all page numbers when there are ≤ 9 pages
              Array.from({ length: totalPages }).map((_, pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    page === pageNum
                      ? "bg-brand-600 text-white"
                      : "hover:bg-surface-800 text-surface-400"
                  }`}
                >
                  {pageNum + 1}
                </button>
              ))
            ) : (
              // For many pages, show first page, current±2, last page with ellipsis
              <>
                <button onClick={() => setPage(0)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === 0 ? "bg-brand-600 text-white" : "hover:bg-surface-800 text-surface-400"}`}>1</button>
                {page > 2 && <span className="px-1 text-surface-600 text-xs self-center">…</span>}
                {[page - 2, page - 1, page, page + 1, page + 2]
                  .filter((p) => p > 0 && p < totalPages - 1)
                  .map((p) => (
                    <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? "bg-brand-600 text-white" : "hover:bg-surface-800 text-surface-400"}`}>{p + 1}</button>
                  ))}
                {page < totalPages - 3 && <span className="px-1 text-surface-600 text-xs self-center">…</span>}
                <button onClick={() => setPage(totalPages - 1)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === totalPages - 1 ? "bg-brand-600 text-white" : "hover:bg-surface-800 text-surface-400"}`}>{totalPages}</button>
              </>
            )}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
