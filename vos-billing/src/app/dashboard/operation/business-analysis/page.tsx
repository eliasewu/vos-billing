"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, RefreshCw, DollarSign, PhoneCall, Timer, Percent, BarChart3, Users, Download } from "lucide-react";

interface CustomerStat { customerId: number; name: string; calls: number; success: number; duration: number; fee: number; cost: number; profit: number; margin: number; asr: number; acd: number; }
interface DailyTrend { date: string; calls: number; success: number; fee: number; profit: number; }
interface GatewayStat { name: string; calls: number; success: number; duration: number; asr: string; acd: string; }

export default function BusinessAnalysisPage() {
  const [data, setData] = useState<{ summary: any; customers: CustomerStat[]; dailyTrends: DailyTrend[]; gatewayStats: GatewayStat[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/vos/business-analysis?days=${days}`);
      const d = await res.json();
      if (d.error) setError(d.error); else setData(d);
    } catch { setError("Failed to load analysis"); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatMoney = (v: number) => `$${Number(v || 0).toFixed(2)}`;
  const formatDuration = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };

  const exportCSV = () => {
    if (!data) return;
    const h = ["Customer", "Calls", "Success", "ASR%", "ACD", "Duration", "Revenue", "Cost", "Profit", "Margin%"];
    const csv = [h.join(","), ...data.customers.map(c => [c.name, c.calls, c.success, c.asr, c.acd, c.duration, c.fee.toFixed(4), c.cost.toFixed(4), c.profit.toFixed(4), c.margin].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "business_analysis.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Business Analysis</h1><p className="text-surface-400 text-sm mt-1">Revenue, profit & performance breakdown</p></div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(parseInt(e.target.value))} className="px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none">
            <option value={1}>Today</option><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
          </select>
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400" title="Export CSV"><Download className="w-4 h-4" /></button>
          <button onClick={fetchData} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="h-4 bg-surface-800 rounded w-20 mb-2 animate-pulse" /><div className="h-8 bg-surface-800 rounded w-24 animate-pulse" /></div>)}</div>
      ) : data ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Total Calls</p><p className="text-2xl font-bold text-surface-50">{data.summary.totalCalls?.toLocaleString()}</p><p className="text-xs text-surface-500 mt-1">ASR: {data.summary.asr}%</p></div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Revenue</p><p className="text-2xl font-bold text-emerald-400">{formatMoney(data.summary.totalFee)}</p><p className="text-xs text-surface-500 mt-1">ACD: {data.summary.acd}s</p></div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Cost</p><p className="text-2xl font-bold text-red-400">{formatMoney(data.summary.totalCost)}</p></div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Profit</p><p className={`text-2xl font-bold ${data.summary.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatMoney(data.summary.totalProfit)}</p><p className="text-xs text-surface-500 mt-1">Margin: {data.summary.profitMargin}%</p></div>
          </div>

          {/* Customer Breakdown */}
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-800"><h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2"><Users className="w-4 h-4 text-brand-400" />Customer Profitability</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-surface-800">
                  <th className="text-left px-4 py-2 text-surface-400 text-xs uppercase">Customer</th>
                  <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Calls</th>
                  <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">ASR</th>
                  <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Revenue</th>
                  <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Cost</th>
                  <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Profit</th>
                  <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Margin</th>
                </tr></thead>
                <tbody>
                  {data.customers.map(c => (
                    <tr key={c.customerId || c.name} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                      <td className="px-4 py-2 text-surface-50 font-medium text-xs">{c.name || "Unknown"}</td>
                      <td className="px-4 py-2 text-right text-surface-300 text-xs">{c.calls?.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-surface-300 text-xs">{c.asr}%</td>
                      <td className="px-4 py-2 text-right text-emerald-400 font-mono text-xs">{formatMoney(c.fee)}</td>
                      <td className="px-4 py-2 text-right text-red-400 font-mono text-xs">{formatMoney(c.cost)}</td>
                      <td className={`px-4 py-2 text-right font-mono text-xs ${c.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatMoney(c.profit)}</td>
                      <td className={`px-4 py-2 text-right text-xs ${c.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{c.margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Trends */}
          {data.dailyTrends?.length > 0 && (
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-800"><h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-400" />Daily Trends ({days}d)</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-surface-800">
                    <th className="text-left px-4 py-2 text-surface-400 text-xs uppercase">Date</th>
                    <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Calls</th>
                    <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Success</th>
                    <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Revenue</th>
                    <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Profit</th>
                  </tr></thead>
                  <tbody>
                    {data.dailyTrends.map(t => (
                      <tr key={t.date} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="px-4 py-2 text-surface-50 text-xs">{t.date}</td>
                        <td className="px-4 py-2 text-right text-surface-300 text-xs">{t.calls}</td>
                        <td className="px-4 py-2 text-right text-surface-300 text-xs">{t.success}</td>
                        <td className="px-4 py-2 text-right text-emerald-400 font-mono text-xs">{formatMoney(t.fee)}</td>
                        <td className={`px-4 py-2 text-right font-mono text-xs ${t.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatMoney(t.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gateway Stats */}
          {data.gatewayStats?.length > 0 && (
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-800"><h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" />Gateway Performance</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-surface-800">
                    <th className="text-left px-4 py-2 text-surface-400 text-xs uppercase">Gateway</th>
                    <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Calls</th>
                    <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Success</th>
                    <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">ASR</th>
                    <th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">ACD</th>
                  </tr></thead>
                  <tbody>
                    {data.gatewayStats.map(g => (
                      <tr key={g.name} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="px-4 py-2 text-surface-50 font-medium text-xs">{g.name}</td>
                        <td className="px-4 py-2 text-right text-surface-300 text-xs">{g.calls}</td>
                        <td className="px-4 py-2 text-right text-surface-300 text-xs">{g.success}</td>
                        <td className="px-4 py-2 text-right text-surface-300 text-xs">{g.asr}%</td>
                        <td className="px-4 py-2 text-right text-surface-300 text-xs">{g.acd}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
