"use client";

import { useState, useEffect } from "react";
import { Receipt, Search, RefreshCw, DollarSign, History, Download } from "lucide-react";

interface PaymentRecord { id: number; customerAccount: string; customerName: string; payMoney: number; customerMoney: number; time: number; memo: string; payType: number; type: number; loginName: string; }

export default function PaymentQueryPage() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchRecords = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/payment?mode=history");
      const data = await res.json();
      if (data.error) setError(data.error); else setRecords(data.history || []);
    } catch { setError("Failed to load payment records"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, []);

  const formatMoney = (v: number) => {
    const abs = Math.abs(v); const s = abs.toFixed(4);
    return v < 0 ? `-$${s}` : `$${s}`;
  };
  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const filtered = records.filter(r =>
    r.customerName.toLowerCase().includes(search.toLowerCase()) ||
    r.customerAccount.toLowerCase().includes(search.toLowerCase()) ||
    r.loginName.toLowerCase().includes(search.toLowerCase())
  );

  const totalTopup = records.reduce((s, r) => s + (r.payMoney > 0 ? r.payMoney : 0), 0);
  const totalDeduct = records.reduce((s, r) => s + (r.payMoney < 0 ? Math.abs(r.payMoney) : 0), 0);

  const exportCSV = () => {
    const h = ["ID","Customer","Account","Amount","BalanceAfter","Type","Time","Operator","Memo"];
    const csv = [h.join(","), ...filtered.map(r => [r.id,r.customerName,r.customerAccount,r.payMoney,r.customerMoney,r.type===1?"Top-up":"Deduction",formatTime(r.time),r.loginName,`"${(r.memo||"").replace(/"/g,'""')}"`].join(","))].join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="payment_records.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Payment Query</h1><p className="text-surface-400 text-sm mt-1">{records.length} payment records</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400" title="Export CSV"><Download className="w-4 h-4" /></button>
          <button onClick={fetchRecords} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><History className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{records.length}</p><p className="text-xs text-surface-400">Transactions</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-400"/></div><div><p className="text-2xl font-bold text-emerald-400">${totalTopup.toFixed(2)}</p><p className="text-xs text-surface-400">Total Top-up</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-red-400"/></div><div><p className="text-2xl font-bold text-red-400">${totalDeduct.toFixed(2)}</p><p className="text-xs text-surface-400">Total Deduction</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by customer or operator..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Customer</th>
            <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Amount</th>
            <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Balance</th>
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Type</th>
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Time</th>
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Operator</th>
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Memo</th>
          </tr></thead>
          <tbody>{loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:7}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):filtered.length===0?<tr><td colSpan={7} className="px-4 py-12 text-center text-surface-500"><Receipt className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No payment records</p></td></tr>:filtered.map(r=><tr key={r.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
            <td className="px-4 py-3"><div className="text-surface-50 font-medium">{r.customerName}</div><div className="text-surface-500 text-xs font-mono">{r.customerAccount}</div></td>
            <td className={`px-4 py-3 text-right font-mono text-sm ${r.payMoney>=0?"text-emerald-400":"text-red-400"}`}>{formatMoney(r.payMoney)}</td>
            <td className="px-4 py-3 text-right font-mono text-sm text-surface-300">{formatMoney(r.customerMoney)}</td>
            <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${r.type===1?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>{r.type===1?"Top-up":"Deduction"}</span></td>
            <td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap">{formatTime(r.time)}</td>
            <td className="px-4 py-3 text-surface-300 text-xs">{r.loginName}</td>
            <td className="px-4 py-3 text-surface-400 text-xs max-w-[200px] truncate">{r.memo||"—"}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}
