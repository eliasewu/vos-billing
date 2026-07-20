"use client";

import { useState, useEffect } from "react";
import { Calendar, Search, RefreshCw, DollarSign, PhoneCall, Timer, Download } from "lucide-react";

interface DailyReport { id: number; date: string; customerId: number; customerName: string; calls: number; success: number; duration: number; fee: number; cost: number; profit: number; asr: number; acd: number; }

export default function DailyReportPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [summary, setSummary] = useState<{totalCalls:number;totalFee:number;totalProfit:number;totalDuration:number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchReports = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/reports/daily");
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setReports(data.reports || []); setSummary(data.summary); }
    } catch { setError("Failed to load daily reports"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const formatMoney = (v: number) => `$${Number(v||0).toFixed(4)}`;
  const formatDuration = (s: number) => { const h=Math.floor(s/3600), m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; };

  const filtered = reports.filter(r =>
    (r.customerName||"").toLowerCase().includes(search.toLowerCase()) ||
    r.date.includes(search)
  );

  const exportCSV = () => {
    const h = ["Date","Customer","Calls","Success","ASR","ACD","Duration","Revenue","Cost","Profit"];
    const csv = [h.join(","), ...filtered.map(r => [r.date,r.customerName,r.calls,r.success,r.asr,r.acd,r.duration,Number(r.fee).toFixed(4),Number(r.cost).toFixed(4),Number(r.profit).toFixed(4)].join(","))].join("\n");
    const b=new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="daily_reports.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Daily Report</h1><p className="text-surface-400 text-sm mt-1">{reports.length} daily records</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4"/></button>
          <button onClick={fetchReports} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
        </div>
      </div>

      {summary && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Total Calls</p><p className="text-2xl font-bold text-surface-50">{summary.totalCalls?.toLocaleString()}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Total Duration</p><p className="text-2xl font-bold text-amber-400">{formatDuration(summary.totalDuration)}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Total Revenue</p><p className="text-2xl font-bold text-emerald-400">{formatMoney(summary.totalFee)}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Total Profit</p><p className={`text-2xl font-bold ${summary.totalProfit>=0?"text-emerald-400":"text-red-400"}`}>{formatMoney(summary.totalProfit)}</p></div>
      </div>}

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by customer or date..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Date</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Customer</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Calls</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Success</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">ASR</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">ACD</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Revenue</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Cost</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Profit</th>
          </tr></thead>
          <tbody>{loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:9}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):filtered.length===0?<tr><td colSpan={9} className="px-4 py-12 text-center text-surface-500"><Calendar className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No daily reports</p></td></tr>:filtered.map(r=><tr key={r.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
            <td className="px-4 py-3 text-surface-50 font-medium text-xs">{r.date}</td><td className="px-4 py-3 text-surface-300 text-xs">{r.customerName||"—"}</td>
            <td className="px-4 py-3 text-right text-surface-300 text-xs">{r.calls?.toLocaleString()}</td><td className="px-4 py-3 text-right text-surface-300 text-xs">{r.success?.toLocaleString()}</td>
            <td className="px-4 py-3 text-right text-surface-300 text-xs">{r.asr}%</td><td className="px-4 py-3 text-right text-surface-300 text-xs">{r.acd}s</td>
            <td className="px-4 py-3 text-right text-emerald-400 font-mono text-xs">{formatMoney(r.fee)}</td><td className="px-4 py-3 text-right text-red-400 font-mono text-xs">{formatMoney(r.cost)}</td>
            <td className={`px-4 py-3 text-right font-mono text-xs ${r.profit>=0?"text-emerald-400":"text-red-400"}`}>{formatMoney(r.profit)}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}
