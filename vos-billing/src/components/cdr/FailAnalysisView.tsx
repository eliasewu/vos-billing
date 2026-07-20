"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Download, Calendar, X } from "lucide-react";

interface FailStat { endReason: string; count: number; pct: string; }

interface Props { gatewayType: "Mapping" | "Routing"; }

const END_REASON_LABELS: Record<string, string> = {
  "0": "Normal", "1": "Busy", "2": "No Answer", "3": "Cancel",
  "4": "Forbidden", "5": "Timeout", "6": "No Route", "7": "Congestion", "8": "No Circuit",
};

export default function FailAnalysisView({ gatewayType }: Props) {
  const [data, setData] = useState<FailStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      params.set("limit", "5000");
      const res = await fetch(`/api/vos/cdr?${params}`);
      const d = await res.json();
      if (d.error) { setError(d.error); setData([]); }
      else {
        const cdrs: any[] = d.cdrs || [];
        const reasonMap = new Map<string, number>();
        for (const cdr of cdrs) {
          const reason = String(cdr.endReason ?? "unknown");
          reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
        }
        const total = cdrs.length;
        const stats: FailStat[] = Array.from(reasonMap.entries())
          .map(([reason, count]) => ({
            endReason: END_REASON_LABELS[reason] || `R:${reason}`,
            count, pct: total > 0 ? ((count / total) * 100).toFixed(1) : "0",
          }))
          .sort((a, b) => b.count - a.count);
        setData(stats);
      }
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const totalFails = data.filter(d => d.endReason !== "Normal").reduce((s, d) => s + d.count, 0);
  const totalCalls = data.reduce((s, d) => s + d.count, 0);

  const exportCSV = () => {
    const csv = ["EndReason,Count,Percentage", ...data.map(d => [d.endReason, d.count, d.pct].join(","))].join("\n");
    const b = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b);
    a.download = `${gatewayType.toLowerCase()}_fail_analysis.csv`; a.click();
  };

  const gType = gatewayType;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">{gType} — Fail Analysis</h1><p className="text-surface-400 text-sm mt-1">Call failure breakdown by end reason{gType === "Routing" ? " for routing gateways" : ""}</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4" /></button>
          <button onClick={fetchData} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50" /></div>
        <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" /><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50" /></div>
        {(startDate || endDate) && <button onClick={() => { setStartDate(""); setEndDate(""); }} className="flex items-center gap-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-xs text-surface-400 hover:text-surface-50"><X className="w-3 h-3" />Clear</button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Total Calls</p><p className="text-2xl font-bold text-surface-50">{totalCalls.toLocaleString()}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Failed Calls</p><p className="text-2xl font-bold text-red-400">{totalFails.toLocaleString()}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Fail Rate</p><p className="text-2xl font-bold text-amber-400">{totalCalls > 0 ? ((totalFails / totalCalls) * 100).toFixed(1) : "0"}%</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Reasons</p><p className="text-2xl font-bold text-violet-400">{data.length}</p></div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">End Reason</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Count</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">%</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Distribution</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={4} className="p-6 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-surface-500" /></td></tr> :
            data.length === 0 ? <tr><td colSpan={4} className="p-12 text-center text-surface-500"><AlertTriangle className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No call data — adjust date range</p></td></tr> :
            data.map((d, i) => {
              const isFail = d.endReason !== "Normal";
              return (
                <tr key={i} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                  <td className="px-4 py-3 text-surface-50 text-xs font-medium">{d.endReason}</td>
                  <td className={`px-4 py-3 text-right font-mono text-xs ${isFail ? "text-red-400" : "text-emerald-400"}`}>{d.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-surface-300 text-xs">{d.pct}%</td>
                  <td className="px-4 py-3"><div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${isFail ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${d.pct}%` }} /></div></td>
                </tr>
              );
            })}</tbody>
        </table></div>
      </div>
    </div>
  );
}
