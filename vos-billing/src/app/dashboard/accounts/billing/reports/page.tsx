"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Download,
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
} from "lucide-react";

interface BillingCustomer {
  customerId: number;
  customerName: string;
  billCount: number;
  totalFee: number;
  totalCalls: number;
  totalDuration: number;
  pending: number;
  paid: number;
}

interface DailyBill {
  date: string;
  billCount: number;
  totalFee: number;
  totalCalls: number;
  totalDuration: number;
}

interface MonthlyBill {
  month: string;
  billCount: number;
  totalFee: number;
  totalCalls: number;
}

interface BillingSummary {
  totalBills: number;
  totalFee: number;
  totalCalls: number;
  totalDuration: number;
  customerCount: number;
  pendingFee: number;
  pendingCount: number;
  paidFee: number;
  paidCount: number;
}

export default function BillingReportsPage() {
  const [data, setData] = useState<{
    summary: BillingSummary;
    customers: BillingCustomer[];
    daily: DailyBill[];
    monthly: MonthlyBill[];
    filters: { dateFrom: string; dateTo: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState<"daily" | "monthly">("daily");

  const fetchData = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const res = await fetch(`/api/vos/billing/reports${qs ? "?" + qs : ""}`);
      const d = await res.json();
      if (d.error) {
        setError(d.error);
        setData(null);
      } else {
        setData(d);
        setError("");
      }
    } catch {
      setError("Failed to load billing reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilter = () => {
    fetchData(dateFrom, dateTo);
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    fetchData();
  };

  const formatMoney = (v: number) => `$${(v || 0).toFixed(2)}`;
  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
  };

  const exportCSV = () => {
    if (!data) return;
    const h = ["Customer", "Bills", "Total Fee", "Total Calls", "Duration", "Paid", "Pending"];
    const rows = data.customers.map((c) => [
      `"${c.customerName.replace(/"/g, '""')}"`,
      c.billCount,
      c.totalFee.toFixed(2),
      c.totalCalls,
      c.totalDuration,
      c.paid.toFixed(2),
      c.pending.toFixed(2),
    ]);
    const csv = [h.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `billing_report${dateFrom ? "_" + dateFrom : ""}${dateTo ? "_to_" + dateTo : ""}.csv`;
    a.click();
  };

  const maxDailyFee = data ? Math.max(...data[view].map((d) => d.totalFee), 1) : 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-400" />
            Billing History &amp; Reports
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Generated bills over time with client totals
            {data && (
              <span className="ml-2 text-xs text-surface-600">
                ({data.summary.totalBills} bills, {data.summary.customerCount} customers)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={!data || data.customers.length === 0}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400 disabled:opacity-40 transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => fetchData(dateFrom, dateTo)}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Calendar className="w-4 h-4 text-surface-400" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-surface-400">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-surface-400">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500/50"
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            Apply Filter
          </button>
          {(dateFrom || dateTo) && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 rounded-lg bg-surface-800 text-surface-400 hover:text-surface-50 text-sm transition-colors"
            >
              Clear
            </button>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setView("daily")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === "daily"
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setView("monthly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === "monthly"
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="h-4 bg-surface-800 rounded w-20 mb-2 animate-pulse" />
              <div className="h-8 bg-surface-800 rounded w-24 animate-pulse" />
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Total Bills</p>
                  <p className="text-2xl font-bold text-surface-50">{data.summary.totalBills}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Total Billed</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatMoney(data.summary.totalFee)}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Paid</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatMoney(data.summary.paidFee)}
                  </p>
                  <p className="text-xs text-surface-500">{data.summary.paidCount} bills</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {formatMoney(data.summary.pendingFee)}
                  </p>
                  <p className="text-xs text-surface-500">{data.summary.pendingCount} bills</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Customers</p>
                  <p className="text-2xl font-bold text-surface-50">{data.summary.customerCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily/Monthly Trend */}
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                {view === "daily" ? "Daily Billed Amount" : "Monthly Billed Amount"}
                <span className="text-xs text-surface-500 font-normal ml-auto">
                  {data[view].length} {view === "daily" ? "days" : "months"}
                </span>
              </h3>
              {data[view].length === 0 ? (
                <p className="text-surface-600 text-sm text-center py-8">No data available</p>
              ) : (
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                  {data[view].map((d) => (
                    <div key={view === "daily" ? (d as DailyBill).date : (d as MonthlyBill).month} className="flex items-center gap-2">
                      <span className="text-xs text-surface-500 w-16 text-right tabular-nums flex-shrink-0">
                        {view === "daily"
                          ? (d as DailyBill).date.slice(5)
                          : (d as MonthlyBill).month}
                      </span>
                      <div className="flex-1 relative h-6">
                        <div
                          className="absolute inset-y-1 rounded-sm bg-brand-500/30 hover:bg-brand-500/50 transition-colors"
                          style={{ width: `${Math.max((d.totalFee / maxDailyFee) * 100, 0.5)}%` }}
                        />
                      </div>
                      <span className="text-xs text-surface-400 w-20 text-right tabular-nums flex-shrink-0">
                        {formatMoney(d.totalFee)}
                      </span>
                      <span className="text-xs text-surface-600 w-12 text-right tabular-nums flex-shrink-0">
                        {d.billCount}b
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Per-Customer Billing */}
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Per-Customer Billing
              </h3>
              {data.customers.length === 0 ? (
                <p className="text-surface-600 text-sm text-center py-8">No customer data</p>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {data.customers.slice(0, 12).map((c) => {
                    const barWidth = Math.max((c.totalFee / (data.summary.totalFee || 1)) * 100, 1);
                    return (
                      <div key={c.customerId} className="flex items-center gap-2">
                        <span className="text-xs text-surface-400 w-28 truncate flex-shrink-0">{c.customerName}</span>
                        <div className="flex-1 relative h-5">
                          <div className="absolute inset-y-1 w-full rounded-sm bg-surface-800" />
                          <div
                            className="absolute inset-y-1 rounded-sm bg-emerald-500/30"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-xs w-20 text-right tabular-nums font-medium text-surface-200 flex-shrink-0">
                          {formatMoney(c.totalFee)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Customer Breakdown Table */}
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-800">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-400" />
                Customer Billing Breakdown
              </h3>
            </div>
            {data.customers.length === 0 ? (
              <div className="p-12 text-center text-surface-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-surface-600" />
                <p>No billing data found. Generate bills from the Billing page.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-800/30 border-b border-surface-700/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Customer</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Bills</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Total Fee</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Calls</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Duration</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {data.customers.map((c) => (
                      <tr key={c.customerId} className="hover:bg-surface-800/30 transition-colors">
                        <td className="px-4 py-3 text-surface-50 font-medium text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-3 h-3 text-brand-400" />
                            </div>
                            {c.customerName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-surface-300 text-xs">{c.billCount}</td>
                        <td className="px-4 py-3 text-right text-emerald-400 text-xs font-mono font-medium">
                          {formatMoney(c.totalFee)}
                        </td>
                        <td className="px-4 py-3 text-right text-surface-300 text-xs">{c.totalCalls.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-surface-300 text-xs font-mono">{formatDuration(c.totalDuration)}</td>
                        <td className="px-4 py-3 text-right text-green-400 text-xs font-mono">{formatMoney(c.paid)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={c.pending > 0 ? "text-amber-400 font-mono text-xs font-medium" : "text-surface-500 text-xs"}>
                            {c.pending > 0 ? formatMoney(c.pending) : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
