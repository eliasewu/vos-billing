"use client";

import { useState, useEffect } from "react";
import { CalendarDays, RefreshCw, Download } from "lucide-react";

interface DailyStat { date: string; totalCalls: number; successCalls: number; asr: number; duration: number; acd: number; }

interface Props { gatewayType: "Mapping" | "Routing"; }

export default function CallDailyView({ gatewayType }: Props) {
  const [data, setData] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const endDate = new Date();
      const startDate = new Date(Date.now() - days * 86400000);
      const params = new URLSearchParams();
      params.set("start", startDate.toISOString().slice(0, 10));
      params.set("end", endDate.toISOString().slice(0, 10));
      params.set("limit", "10000");
      const res = await fetch(`/api/vos/cdr?${params}`);
      const d = await res.json();
      if (d.error) { setError(d.error); setData([]); }
      else {
        const cdrs: any[] = d.cdrs || [];
        const dateMap = new Map<string, { calls: number; success: number; duration: number }>();
        for (const cdr of cdrs) {
          const date = cdr.startTime ? new Date(Number(cdr.startTime)).toISOString().slice(0, 10) : "Unknown";
          const existing = dateMap.get(date) || { calls: 0, success: 0, duration: 0 };
          existing.calls++;
          if (cdr.endReason === 0) existing.success++;
          existing.duration += (cdr.feeTime || 0);
          dateMap.set(date, existing);
        }
        const stats: DailyStat[] = [];
        for (let i = days - 1; i >= 0; i--) {
          const dt = new Date(Date.now() - i * 86400000);
          const key = dt.toISOString().slice(0, 10);
          const v = dateMap.get(key) || { calls: 0, success: 0, duration: 0 };
          stats.push({
            date: key, totalCalls: v.calls, successCalls: v.success,
            asr: v.calls > 0 ? Number(((v.success / v.calls) * 100).toFixed(1)) : 0,
            duration: v.duration, acd: v.success > 0 ? Math.round(v.duration / v.success) : 0,
          });
        }
        setData(stats);
      }
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [days]);

  const totalCalls = data.reduce((s, d) => s + d.totalCalls, 0);
  const totalSuccess = data.reduce((s, d) => s + d.successCalls, 0);
  const formatDuration = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`; };
  const maxCalls = Math.max(1, ...data.map(d => d.totalCalls));

  const exportCSV = () => {
    const csv = ["Date,TotalCalls,SuccessCalls,ASR%,ACD,Duration", ...data.map(d => [d.date, d.totalCalls, d.successCalls, d.asr, d.acd, d.duration].join(","))].join("\n");
    const b = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b);
    a.download = `${gatewayType.toLowerCase()}_call_daily.csv`; a.click();
  };

  const gType = gatewayType;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">{gType} — Call Daily</h1><p className="text-surface-400 text-sm mt-1">Daily call volume trends{gType === "Routing" ? " for routing gateways" : ""}</p></div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(parseInt(e.target.value))} className="px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm">
            <option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
          </select>
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4" /></button>
          <button onClick={fetchData} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Total Calls</p><p className="text-2xl font-bold text-surface-50">{totalCalls.toLocaleString()}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Success</p><p className="text-2xl font-bold text-emerald-400">{totalSuccess.toLocaleString()}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Avg/Day</p><p className="text-2xl font-bold text-amber-400">{data.length > 0 ? Math.round(totalCalls / data.length).toLocaleString() : "0"}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Peak Day</p><p className="text-2xl font-bold text-violet-400">{maxCalls.toLocaleString()}</p></div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-end gap-1 h-32">
              {data.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${d.date}: ${d.totalCalls} calls`}>
                  <span className="text-[10px] text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity">{d.totalCalls}</span>
                  <div className="w-full bg-brand-500/50 hover:bg-brand-500/70 rounded-t transition-colors" style={{ height: `${(d.totalCalls / maxCalls) * 100}%`, minHeight: d.totalCalls > 0 ? "4px" : "0" }} />
                  <span className="text-[10px] text-surface-500">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
          <table className="w-full text-sm border-t border-surface-800">
            <thead><tr className="border-b border-surface-800">
              <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Date</th>
              <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Calls</th>
              <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Success</th>
              <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">ASR</th>
              <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">ACD</th>
            </tr></thead>
            <tbody>{loading ? <tr><td colSpan={5} className="p-6 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-surface-500" /></td></tr> :
              data.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-surface-500"><CalendarDays className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No data</p></td></tr> :
              data.map(d => (
                <tr key={d.date} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                  <td className="px-4 py-3 text-surface-50 text-xs font-medium">{d.date}</td>
                  <td className="px-4 py-3 text-right text-surface-300 text-xs font-mono">{d.totalCalls.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 text-xs font-mono">{d.successCalls.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-xs"><span className={`inline-flex px-2 py-0.5 rounded font-mono ${d.asr > 50 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{d.asr}%</span></td>
                  <td className="px-4 py-3 text-right text-surface-300 text-xs">{d.acd}s</td>
                </tr>
              ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
