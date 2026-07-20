"use client";

import { useState, useEffect } from "react";
import { MapPin, RefreshCw, Download, Calendar, X } from "lucide-react";

interface AreaStat { areaCode: string; totalCalls: number; successCalls: number; asr: number; duration: number; acd: number; }

interface Props { gatewayType: "Mapping" | "Routing"; }

export default function AreaAnalysisView({ gatewayType }: Props) {
  const [data, setData] = useState<AreaStat[]>([]);
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
        const areaMap = new Map<string, { calls: number; success: number; duration: number }>();
        for (const cdr of cdrs) {
          const area = cdr.calleeAreaCode || cdr.callerAreaCode || "Unknown";
          const existing = areaMap.get(area) || { calls: 0, success: 0, duration: 0 };
          existing.calls++;
          if (cdr.endReason === 0) existing.success++;
          existing.duration += (cdr.feeTime || 0);
          areaMap.set(area, existing);
        }
        const stats: AreaStat[] = Array.from(areaMap.entries())
          .map(([area, v]) => ({
            areaCode: area, totalCalls: v.calls, successCalls: v.success,
            asr: v.calls > 0 ? Number(((v.success / v.calls) * 100).toFixed(1)) : 0,
            duration: v.duration, acd: v.success > 0 ? Math.round(v.duration / v.success) : 0,
          }))
          .sort((a, b) => b.totalCalls - a.totalCalls)
          .slice(0, 200);
        setData(stats);
      }
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const totalCalls = data.reduce((s, d) => s + d.totalCalls, 0);
  const totalSuccess = data.reduce((s, d) => s + d.successCalls, 0);
  const formatDuration = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`; };

  const exportCSV = () => {
    const csv = ["AreaCode,TotalCalls,SuccessCalls,ASR%,ACD,Duration", ...data.map(d => [d.areaCode, d.totalCalls, d.successCalls, d.asr, d.acd, d.duration].join(","))].join("\n");
    const b = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b);
    a.download = `${gatewayType.toLowerCase()}_area_analysis.csv`; a.click();
  };

  const gType = gatewayType;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">{gType} — Area Analysis</h1><p className="text-surface-400 text-sm mt-1">Call distribution by area code{gType === "Routing" ? " for routing gateways" : ""}</p></div>
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
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Success</p><p className="text-2xl font-bold text-emerald-400">{totalSuccess.toLocaleString()}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">ASR</p><p className="text-2xl font-bold text-amber-400">{totalCalls > 0 ? ((totalSuccess / totalCalls) * 100).toFixed(1) : "0"}%</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Areas</p><p className="text-2xl font-bold text-violet-400">{data.length}</p></div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Area Code</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Total Calls</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Success</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">ASR</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Duration</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">ACD</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="p-6 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-surface-500" /></td></tr> :
            data.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-surface-500"><MapPin className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No area data — adjust date range</p></td></tr> :
            data.map((d, i) => (
              <tr key={d.areaCode + i} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                <td className="px-4 py-3 text-surface-50 font-mono text-xs flex items-center gap-1.5"><MapPin className="w-3 h-3 text-surface-500" />{d.areaCode}</td>
                <td className="px-4 py-3 text-right text-surface-300 text-xs">{d.totalCalls.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-emerald-400 text-xs">{d.successCalls.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-xs"><span className={`inline-flex px-2 py-0.5 rounded font-mono ${d.asr > 50 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{d.asr}%</span></td>
                <td className="px-4 py-3 text-right text-surface-300 text-xs font-mono">{formatDuration(d.duration)}</td>
                <td className="px-4 py-3 text-right text-surface-300 text-xs">{d.acd}s</td>
              </tr>
            ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
