"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  RefreshCw,
  DollarSign,
  TrendingUp,
  PhoneCall,
  Percent,
  Download,
  BarChart3,
} from "lucide-react";

interface SupplierPayout {
  clearingId: number;
  clearingName: string;
  gatewayName: string;
  calls: number;
  success: number;
  duration: number;
  cost: number;
  fee: number;
  asr: number;
  margin: number;
  profit: number;
}

interface DailyCost {
  date: string;
  cost: number;
  calls: number;
}

interface ClearingSummary {
  totalCalls: number;
  totalCost: number;
  totalFee: number;
  totalProfit: number;
  supplierCount: number;
  margin: number;
}

export default function ClearingReportsPage() {
  const [data, setData] = useState<{
    summary: ClearingSummary;
    suppliers: SupplierPayout[];
    daily: DailyCost[];
    tables: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/vos/clearing/reports");
      const d = await res.json();
      if (d.error) {
        setError(d.error);
        setData(null);
      } else {
        setData(d);
        setError("");
      }
    } catch {
      setError("Failed to load clearing reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatMoney = (v: number) => `$${(v || 0).toFixed(4)}`;
  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
  };

  const exportCSV = () => {
    if (!data) return;
    const h = ["Supplier", "Gateway", "Calls", "Success", "ASR%", "Duration", "Cost", "Revenue", "Profit", "Margin%"];
    const rows = data.suppliers.map((s) => [
      `"${s.clearingName.replace(/"/g, '""')}"`,
      `"${s.gatewayName.replace(/"/g, '""')}"`,
      s.calls,
      s.success,
      s.asr,
      s.duration,
      s.cost.toFixed(4),
      s.fee.toFixed(4),
      s.profit.toFixed(4),
      s.margin,
    ]);
    const csv = [h.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clearing_settlement.csv";
    a.click();
  };

  const maxDailyCost = data ? Math.max(...data.daily.map((d) => d.cost), 1) : 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Clearing / Settlement Reports
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Supplier payouts from routing gateway CDR data
            {data && (
              <span className="ml-2 text-xs text-surface-600">
                ({data.tables} CDR partition{data.tables !== 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={!data || data.suppliers.length === 0}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400 disabled:opacity-40 transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="h-4 bg-surface-800 rounded w-20 mb-2 animate-pulse" />
              <div className="h-8 bg-surface-800 rounded w-24 animate-pulse" />
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/10 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Suppliers</p>
                  <p className="text-2xl font-bold text-surface-50">{data.summary.supplierCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-lg">
                  <PhoneCall className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Total Calls</p>
                  <p className="text-2xl font-bold text-surface-50">{data.summary.totalCalls.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Total Cost</p>
                  <p className="text-2xl font-bold text-red-400">{formatMoney(data.summary.totalCost)}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatMoney(data.summary.totalFee)}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${data.summary.totalProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <TrendingUp className={`w-5 h-5 ${data.summary.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`} />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Net Profit</p>
                  <p className={`text-2xl font-bold ${data.summary.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatMoney(data.summary.totalProfit)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${data.summary.margin >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <Percent className={`w-5 h-5 ${data.summary.margin >= 0 ? "text-emerald-400" : "text-red-400"}`} />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Margin</p>
                  <p className={`text-2xl font-bold ${data.summary.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {data.summary.margin}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Cost Trend */}
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                Daily Supplier Cost
                <span className="text-xs text-surface-500 font-normal ml-auto">
                  {data.daily.length}d
                </span>
              </h3>
              {data.daily.length === 0 ? (
                <p className="text-surface-600 text-sm text-center py-8">No data available</p>
              ) : (
                <div className="space-y-1.5">
                  {data.daily.map((d) => (
                    <div key={d.date} className="flex items-center gap-2">
                      <span className="text-xs text-surface-500 w-12 text-right tabular-nums">
                        {d.date.slice(5)}
                      </span>
                      <div className="flex-1 relative h-6">
                        <div
                          className="absolute inset-y-1 rounded-sm bg-orange-500/30 hover:bg-orange-500/50 transition-colors"
                          style={{ width: `${Math.max((d.cost / maxDailyCost) * 100, 0.5)}%` }}
                        />
                      </div>
                      <span className="text-xs text-surface-400 w-16 text-right tabular-nums">
                        {formatMoney(d.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profitability Summary */}
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Per-Supplier Profitability
              </h3>
              {data.suppliers.length === 0 ? (
                <p className="text-surface-600 text-sm text-center py-8">No supplier data</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data.suppliers.slice(0, 12).map((s) => {
                    const barWidth = Math.max(Math.abs(s.profit) / (data.summary.totalFee || 1) * 100, 1);
                    return (
                      <div key={s.clearingId} className="flex items-center gap-2">
                        <span className="text-xs text-surface-400 w-24 truncate">{s.clearingName}</span>
                        <div className="flex-1 relative h-5">
                          <div className="absolute inset-y-1 w-full rounded-sm bg-surface-800" />
                          <div
                            className={`absolute inset-y-1 rounded-sm ${s.profit >= 0 ? "bg-emerald-500/30" : "bg-red-500/30"}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className={`text-xs w-16 text-right tabular-nums font-medium ${s.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatMoney(s.profit)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Supplier Breakdown Table */}
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-800">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Supplier Payout Breakdown
              </h3>
            </div>
            {data.suppliers.length === 0 ? (
              <div className="p-12 text-center text-surface-500">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-surface-600" />
                <p>No supplier payout data found in CDR records</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-800/30 border-b border-surface-700/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Gateway</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Calls</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">ASR</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Duration</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Revenue</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Profit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {data.suppliers.map((s) => (
                      <tr key={s.clearingId} className="hover:bg-surface-800/30 transition-colors">
                        <td className="px-4 py-3 text-surface-50 font-medium text-xs">{s.clearingName}</td>
                        <td className="px-4 py-3 text-surface-400 text-xs">{s.gatewayName || "—"}</td>
                        <td className="px-4 py-3 text-right text-surface-300 text-xs">{s.calls.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-xs">
                          <span className={s.asr >= 80 ? "text-emerald-400" : s.asr >= 50 ? "text-amber-400" : "text-red-400"}>
                            {s.asr}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-surface-300 text-xs font-mono">{formatDuration(s.duration)}</td>
                        <td className="px-4 py-3 text-right text-red-400 text-xs font-mono">{formatMoney(s.cost)}</td>
                        <td className="px-4 py-3 text-right text-emerald-400 text-xs font-mono">{formatMoney(s.fee)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-mono font-medium ${s.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatMoney(s.profit)}
                        </td>
                        <td className={`px-4 py-3 text-right text-xs font-medium ${s.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {s.margin}%
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
