"use client";

import { useState, useEffect } from "react";
import { CreditCard, RefreshCw, DollarSign, Trash2, Download } from "lucide-react";
import DataTable from "@/components/DataTable";
import { moneyRender, deleteRender } from "@/components/DataTableHelpers";

interface PhoneCard { id: number; serialNo: string; pin: string; money: number; usedAccount: string; agentAccount: string; expireTime: number; type: number; }

export default function CardsManagementPage() {
  const [cards, setCards] = useState<PhoneCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const totalMoney = cards.reduce((s,c)=>s+c.money,0);

  const exportCSV = () => {
    const h = ["Serial","PIN","Balance","Used Account","Agent","Expires","Type"];
    const csv = [h.join(","), ...cards.filter(c => c.serialNo || c.pin).map(c => [c.serialNo,c.pin,Number(c.money).toFixed(4),c.usedAccount,c.agentAccount,formatTime(c.expireTime),c.type===0?"Active":"Used"].join(","))].join("\n");
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

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <DataTable
        columns={[
          { key: "serialNo", label: "Serial", render: (c: PhoneCard) => <span className="text-surface-50 font-mono text-xs">{c.serialNo}</span> },
          { key: "pin", label: "PIN", render: (c: PhoneCard) => <span className="text-surface-300 font-mono text-xs">{c.pin}</span> },
          { key: "money", label: "Balance", textAlign: "right" as const, render: moneyRender((c: PhoneCard) => c.money) },
          { key: "usedAccount", label: "Used Account", render: (c: PhoneCard) => <span className="text-surface-300 text-xs">{c.usedAccount||"—"}</span> },
          { key: "agentAccount", label: "Agent", render: (c: PhoneCard) => <span className="text-surface-400 text-xs">{c.agentAccount||"—"}</span> },
          { key: "expireTime", label: "Expires", render: (c: PhoneCard) => <span className="text-surface-400 text-xs">{formatTime(c.expireTime)}</span> },
          { key: "type", label: "Type", textAlign: "center" as const, render: (c: PhoneCard) => (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${c.type===0?"bg-emerald-500/10 text-emerald-400":"bg-surface-800 text-surface-500"}`}>
              {c.type===0?"Active":"Used"}
            </span>
          )},
          { key: "actions", label: "Act", textAlign: "center" as const, width: "5rem", render: deleteRender((c) => handleDelete(c.id)) },
        ]}
        data={cards}
        searchKey="serialNo"
        loading={loading}
        emptyIcon={<CreditCard className="w-10 h-10 text-surface-600" />}
        emptyMessage="No cards found"
        pageSize={20}
      />
    </div>
  );
}
