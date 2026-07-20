"use client";

import { useState, useEffect } from "react";
import { CreditCard, Search, RefreshCw, DollarSign, Trash2, Download } from "lucide-react";

interface PhoneCard { id: number; serialNo: string; pin: string; money: number; usedAccount: string; agentAccount: string; expireTime: number; type: number; }

export default function CardsManagementPage() {
  const [cards, setCards] = useState<PhoneCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchCards = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/phone-cards");
      const data = await res.json();
      if (data.error) setError(data.error); else setCards(data.cards || []);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCards(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this card?")) return;
    try { await fetch(`/api/vos/phone-cards?id=${id}`, { method: "DELETE" }); fetchCards(); } catch {}
  };

  const formatMoney = (v: number) => `$${v.toFixed(4)}`;
  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const filtered = cards.filter(c => c.serialNo.toLowerCase().includes(search.toLowerCase()) || c.pin.includes(search) || c.usedAccount.includes(search));
  const totalMoney = cards.reduce((s,c)=>s+c.money,0);

  const exportCSV = () => {
    const h = ["Serial","PIN","Balance","Used Account","Agent","Expires","Type"];
    const csv = [h.join(","), ...filtered.map(c => [c.serialNo,c.pin,Number(c.money).toFixed(4),c.usedAccount,c.agentAccount,formatTime(c.expireTime),c.type===0?"Active":"Used"].join(","))].join("\n");
    const b=new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="phone_cards.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Cards Management</h1><p className="text-surface-400 text-sm mt-1">{cards.length} phone cards</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4"/></button>
          <button onClick={fetchCards} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{cards.length}</p><p className="text-xs text-surface-400">Total Cards</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-400"/></div><div><p className="text-2xl font-bold text-emerald-400">{formatMoney(totalMoney)}</p><p className="text-xs text-surface-400">Total Balance</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-violet-400"/></div><div><p className="text-2xl font-bold text-surface-50">{cards.filter(c=>c.usedAccount).length}</p><p className="text-xs text-surface-400">Assigned</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by serial, PIN, or account..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Serial</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">PIN</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Balance</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Used Account</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Agent</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Expires</th>
            <th className="text-center px-4 py-3 text-surface-400 text-xs uppercase">Type</th><th className="text-center px-4 py-3 text-surface-400 text-xs uppercase w-20">Act</th>
          </tr></thead>
          <tbody>{loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:8}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):filtered.length===0?<tr><td colSpan={8} className="px-4 py-12 text-center text-surface-500"><CreditCard className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No cards found</p></td></tr>:filtered.map(c=><tr key={c.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
            <td className="px-4 py-3 text-surface-50 font-mono text-xs">{c.serialNo}</td><td className="px-4 py-3 text-surface-300 font-mono text-xs">{c.pin}</td>
            <td className="px-4 py-3 text-right text-emerald-400 font-mono text-xs">{formatMoney(c.money)}</td><td className="px-4 py-3 text-surface-300 text-xs">{c.usedAccount||"—"}</td>
            <td className="px-4 py-3 text-surface-400 text-xs">{c.agentAccount||"—"}</td><td className="px-4 py-3 text-surface-400 text-xs">{formatTime(c.expireTime)}</td>
            <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${c.type===0?"bg-emerald-500/10 text-emerald-400":"bg-surface-800 text-surface-500"}`}>{c.type===0?"Active":"Used"}</span></td>
            <td className="px-4 py-3 text-center"><button onClick={()=>handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button></td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}
