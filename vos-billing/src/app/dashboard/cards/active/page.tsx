"use client";

import { useState, useEffect } from "react";
import { Radio, RefreshCw, Phone, DollarSign, Wifi, WifiOff } from "lucide-react";
import DataTable from "@/components/DataTable";
import { moneyRender } from "@/components/DataTableHelpers";

interface ActiveCard { id: number; pin: string; displaye164: string; activetime: string; bindlimit: number; money: number; limitmoney: number; usedaccount: string; usedaccountname: string; sold: number; locktype: number; }

export default function ActivePhoneCardsPage() {
  const [cards, setCards] = useState<ActiveCard[]>([]);
  const [summary, setSummary] = useState<{total:number;totalMoney:number;uniqueCustomers:number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <DataTable
        columns={[
          { key: "pin", label: "PIN", render: (c: ActiveCard) => <span className="text-surface-50 font-mono text-xs">{c.pin}</span> },
          { key: "displaye164", label: "E164", render: (c: ActiveCard) => <span className="text-surface-300 font-mono text-xs">{c.displaye164||"—"}</span> },
          { key: "money", label: "Balance", textAlign: "right" as const, render: moneyRender((c: ActiveCard) => Number(c.money || 0)) },
          { key: "limitmoney", label: "Limit", textAlign: "right" as const, render: (c: ActiveCard) => (
            <span className="text-surface-300 font-mono text-xs">${(c.limitmoney||0).toFixed(2)}</span>
          )},
          { key: "usedaccount", label: "Account", render: (c: ActiveCard) => (
            <span className="text-surface-300 text-xs">{c.usedaccount||c.usedaccountname||"—"}</span>
          )},
          { key: "activetime", label: "Active Time", render: (c: ActiveCard) => (
            <span className="text-surface-400 text-xs whitespace-nowrap">{formatTime(c.activetime)}</span>
          )},
          { key: "locktype", label: "Status", textAlign: "center" as const, render: (c: ActiveCard) => (
            c.locktype===0 ? <Wifi className="w-4 h-4 text-emerald-400 inline"/> : <WifiOff className="w-4 h-4 text-red-400 inline"/>
          )},
          { key: "actions", label: "Action", textAlign: "center" as const, width: "6rem", render: (c: ActiveCard) => (
            <button onClick={()=>handleDisconnect(c.id)} className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20">Disconnect</button>
          )},
        ]}
        data={cards}
        searchKey="pin"
        loading={loading}
        emptyIcon={<Radio className="w-10 h-10 text-surface-600" />}
        emptyMessage="No active sessions"
        pageSize={15}
      />
    </div>
  );
}
