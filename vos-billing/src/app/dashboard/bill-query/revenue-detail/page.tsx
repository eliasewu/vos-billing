"use client";

import { useState, useEffect } from "react";
import { DollarSign, Search, RefreshCw, PhoneCall, BarChart3, Download } from "lucide-react";

interface RevenueDetail { id: number; date: string; customerId: number; customerName: string; calls: number; fee: number; profit: number; }

export default function RevenueDetailPage() {
  const [details, setDetails] = useState<RevenueDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/bill-query/revenue");
      const data = await res.json();
      if (data.error) setError(data.error); else setDetails(data.details || []);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const formatMoney = (v: number) => `$${Number(v||0).toFixed(4)}`;
  const filtered = details.filter(d => (d.customerName||"").toLowerCase().includes(search.toLowerCase()) || d.date.includes(search));
  const totalFee = details.reduce((s,d)=>s+d.fee,0);
  const totalProfit = details.reduce((s,d)=>s+d.profit,0);

  const exportCSV = () => {
    const h = ["Date","Customer","Calls","Revenue","Profit"];
    const csv = [h.join(","), ...filtered.map(d => [d.date,d.customerName,d.calls,Number(d.fee).toFixed(4),Number(d.profit).toFixed(4)].join(","))].join("\n");
    const b=new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="revenue_detail.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Revenue Detail</h1><p className="text-surface-400 text-sm mt-1">{details.length} records</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4"/></button>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{details.length}</p><p className="text-xs text-surface-400">Records</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-400"/></div><div><p className="text-2xl font-bold text-emerald-400">{formatMoney(totalFee)}</p><p className="text-xs text-surface-400">Total Revenue</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-violet-400"/></div><div><p className={`text-2xl font-bold ${totalProfit>=0?"text-emerald-400":"text-red-400"}`}>{formatMoney(totalProfit)}</p><p className="text-xs text-surface-400">Total Profit</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by customer or date..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Date</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Customer</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Calls</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Revenue</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Profit</th>
          </tr></thead>
          <tbody>{loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:5}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):filtered.length===0?<tr><td colSpan={5} className="px-4 py-12 text-center text-surface-500"><DollarSign className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No revenue records</p></td></tr>:filtered.map(d=><tr key={d.id||d.date+"-"+d.customerId} className="border-b border-surface-800/50 hover:bg-surface-800/30">
            <td className="px-4 py-3 text-surface-50 text-xs">{d.date}</td><td className="px-4 py-3 text-surface-300 text-xs">{d.customerName||"—"}</td>
            <td className="px-4 py-3 text-right text-surface-300 text-xs">{d.calls?.toLocaleString()}</td>
            <td className="px-4 py-3 text-right text-emerald-400 font-mono text-xs">{formatMoney(d.fee)}</td>
            <td className={`px-4 py-3 text-right font-mono text-xs ${d.profit>=0?"text-emerald-400":"text-red-400"}`}>{formatMoney(d.profit)}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}
