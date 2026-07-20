"use client";

import { useState, useEffect } from "react";
import { BarChart3, GitBranch, RefreshCw, Download, Calendar, X } from "lucide-react";

interface CrossStat { callerArea: string; calleeArea: string; totalCalls: number; successCalls: number; asr: number; }

export default function RoutingCrossAnalysisPage() {
  const [data, setData] = useState<CrossStat[]>([]);
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
        const crossMap = new Map<string, { calls: number; success: number }>();
        for (const cdr of cdrs) {
          const caller = cdr.callerAreaCode || "Unknown";
          const callee = cdr.calleeAreaCode || "Unknown";
          const key = `${caller}→${callee}`;
          const existing = crossMap.get(key) || { calls: 0, success: 0 };
          existing.calls++;
          if (cdr.endReason === 0) existing.success++;
          crossMap.set(key, existing);
        }
        const stats: CrossStat[] = Array.from(crossMap.entries())
          .map(([key, v]) => {
            const [caller, callee] = key.split("→");
            return { callerArea: caller, calleeArea: callee, totalCalls: v.calls, successCalls: v.success, asr: v.calls > 0 ? Number(((v.success / v.calls) * 100).toFixed(1)) : 0 };
          })
          .sort((a, b) => b.totalCalls - a.totalCalls)
          .slice(0, 200);
        setData(stats);
      }
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const totalCalls = data.reduce((s, d) => s + d.totalCalls, 0);
  const uniqueCallers = new Set(data.map(d => d.callerArea)).size;
  const uniqueCallees = new Set(data.map(d => d.calleeArea)).size;

  const exportCSV = () => {
    const csv = ["CallerArea,CalleeArea,TotalCalls,SuccessCalls,ASR%", ...data.map(d => [d.callerArea, d.calleeArea, d.totalCalls, d.successCalls, d.asr].join(","))].join("\n");
    const b = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "routing_cross_analysis.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Routing — Cross Analysis</h1><p className="text-surface-400 text-sm mt-1">Caller area → Callee area cross-reference for routing gateways</p></div>
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
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Caller Areas</p><p className="text-2xl font-bold text-cyan-400">{uniqueCallers}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Callee Areas</p><p className="text-2xl font-bold text-violet-400">{uniqueCallees}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Cross Pairs</p><p className="text-2xl font-bold text-amber-400">{data.length}</p></div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Caller Area</th>
            <th className="text-center px-4 py-3 text-surface-400 text-xs uppercase"></th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Callee Area</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Calls</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Success</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">ASR</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="p-6 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-surface-500" /></td></tr> :
            data.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-surface-500"><GitBranch className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No cross-analysis data — adjust date range</p></td></tr> :
            data.map((d, i) => (
              <tr key={i} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                <td className="px-4 py-3 text-surface-50 font-mono text-xs">{d.callerArea}</td>
                <td className="px-4 py-3 text-center text-surface-500">→</td>
                <td className="px-4 py-3 text-surface-50 font-mono text-xs">{d.calleeArea}</td>
                <td className="px-4 py-3 text-right text-surface-300 text-xs">{d.totalCalls.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-emerald-400 text-xs">{d.successCalls.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-xs"><span className={`inline-flex px-2 py-0.5 rounded font-mono ${d.asr > 50 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{d.asr}%</span></td>
              </tr>
            ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
