"use client";

import { useState, useEffect } from "react";
import { Radio, Search, RefreshCw, Phone, DollarSign, Wifi, WifiOff } from "lucide-react";

interface ActiveCard { id: number; pin: string; displaye164: string; activetime: string; bindlimit: number; money: number; limitmoney: number; usedaccount: string; usedaccountname: string; sold: number; locktype: number; }

export default function ActivePhoneCardsPage() {
  const [cards, setCards] = useState<ActiveCard[]>([]);
  const [summary, setSummary] = useState<{total:number;totalMoney:number;uniqueCustomers:number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/active-phone-cards");
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setCards(data.cards || []); setSummary(data.summary || null); }
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDisconnect = async (id: number) => {
    if (!confirm("Disconnect this active session?")) return;
    try { await fetch(`/api/vos/active-phone-cards?id=${id}`, { method: "DELETE" }); fetchData(); } catch {}
  };

  const formatMoney = (v: number) => `$${Number(v||0).toFixed(4)}`;
  const formatTime = (t: string) => t ? new Date(Number(t) * 1000).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  const filtered = cards.filter(c => c.pin.includes(search) || c.displaye164.includes(search) || c.usedaccount.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Active Management</h1><p className="text-surface-400 text-sm mt-1">{cards.length} active phone card sessions</p></div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
        </div>
      </div>

      {summary && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Radio className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{summary.total}</p><p className="text-xs text-surface-400">Active Sessions</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-400"/></div><div><p className="text-2xl font-bold text-emerald-400">{formatMoney(summary.totalMoney)}</p><p className="text-xs text-surface-400">Total Balance</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Phone className="w-5 h-5 text-violet-400"/></div><div><p className="text-2xl font-bold text-surface-50">{summary.uniqueCustomers}</p><p className="text-xs text-surface-400">Unique Customers</p></div></div></div>
      </div>}

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by PIN, E164, or account..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">PIN</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">E164</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Balance</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Limit</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Account</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Active Time</th>
            <th className="text-center px-4 py-3 text-surface-400 text-xs uppercase">Status</th><th className="text-center px-4 py-3 text-surface-400 text-xs uppercase w-24">Action</th>
          </tr></thead>
          <tbody>{loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:8}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):filtered.length===0?<tr><td colSpan={8} className="px-4 py-12 text-center text-surface-500"><Radio className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No active sessions</p></td></tr>:filtered.map(c=><tr key={c.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
            <td className="px-4 py-3 text-surface-50 font-mono text-xs">{c.pin}</td><td className="px-4 py-3 text-surface-300 font-mono text-xs">{c.displaye164||"—"}</td>
            <td className="px-4 py-3 text-right text-emerald-400 font-mono text-xs">{formatMoney(c.money)}</td><td className="px-4 py-3 text-right text-surface-300 font-mono text-xs">${(c.limitmoney||0).toFixed(2)}</td>
            <td className="px-4 py-3 text-surface-300 text-xs">{c.usedaccount||c.usedaccountname||"—"}</td><td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap">{formatTime(c.activetime)}</td>
            <td className="px-4 py-3 text-center">{c.locktype===0?<Wifi className="w-4 h-4 text-emerald-400 inline"/>:<WifiOff className="w-4 h-4 text-red-400 inline"/>}</td>
            <td className="px-4 py-3 text-center"><button onClick={()=>handleDisconnect(c.id)} className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20">Disconnect</button></td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}
