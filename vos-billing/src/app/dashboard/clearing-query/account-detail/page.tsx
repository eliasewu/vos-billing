"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Search, RefreshCw, DollarSign, Download } from "lucide-react";

interface ClearingAccount { id: number; customerId: number; customerName: string; balance: number; limitMoney: number; status: number; memo: string; }

export default function ClearingAccountDetailPage() {
  const [accounts, setAccounts] = useState<ClearingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/clearing/accounts");
      const data = await res.json();
      if (data.error) setError(data.error); else setAccounts(data.accounts || []);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const formatMoney = (v: number) => `$${Number(v||0).toFixed(4)}`;
  const filtered = accounts.filter(a => (a.customerName||"").toLowerCase().includes(search.toLowerCase()));
  const totalBalance = accounts.reduce((s,a)=>s+a.balance,0);

  const exportCSV = () => {
    const h = ["Customer","Balance","Credit Limit","Status","Memo"];
    const csv = [h.join(","), ...filtered.map(a => [a.customerName,Number(a.balance).toFixed(4),Number(a.limitMoney).toFixed(2),a.status===1?"Active":"Inactive",`"${(a.memo||"").replace(/"/g,'""')}"`].join(","))].join("\n");
    const b=new Blob([csv],{type:"text/csv"}); const aEl=document.createElement("a"); aEl.href=URL.createObjectURL(b); aEl.download="clearing_accounts.csv"; aEl.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Account Detail</h1><p className="text-surface-400 text-sm mt-1">{accounts.length} clearing accounts</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4"/></button>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{accounts.length}</p><p className="text-xs text-surface-400">Accounts</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-400"/></div><div><p className={`text-2xl font-bold ${totalBalance>=0?"text-emerald-400":"text-red-400"}`}>{formatMoney(totalBalance)}</p><p className="text-xs text-surface-400">Total Balance</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-violet-400"/></div><div><p className="text-2xl font-bold text-surface-50">{accounts.filter(a=>a.status===1).length}</p><p className="text-xs text-surface-400">Active</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by customer..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Customer</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Balance</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Credit Limit</th><th className="text-center px-4 py-3 text-surface-400 text-xs uppercase">Status</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Memo</th>
          </tr></thead>
          <tbody>{loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:5}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):filtered.length===0?<tr><td colSpan={5} className="px-4 py-12 text-center text-surface-500"><ShieldCheck className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No clearing accounts</p></td></tr>:filtered.map(a=><tr key={a.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
            <td className="px-4 py-3 text-surface-50 font-medium text-xs">{a.customerName||`Customer #${a.customerId}`}</td>
            <td className={`px-4 py-3 text-right font-mono text-xs ${a.balance<0?"text-red-400":"text-emerald-400"}`}>{formatMoney(a.balance)}</td>
            <td className="px-4 py-3 text-right text-surface-300 font-mono text-xs">${(a.limitMoney||0).toFixed(2)}</td>
            <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${a.status===1?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>{a.status===1?"Active":"Inactive"}</span></td>
            <td className="px-4 py-3 text-surface-400 text-xs max-w-[300px] truncate">{a.memo||"—"}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}
