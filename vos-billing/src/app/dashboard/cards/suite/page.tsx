"use client";

import { useState, useEffect } from "react";
import { Layers, Search, RefreshCw, CreditCard, Plus, Trash2, X } from "lucide-react";

interface CardSuite { id: number; name: string; quantity: number; faceValue: number; expireDays: number; prefix: string; pinLength: number; memo: string; }

export default function SuiteManagementPage() {
  const [suites, setSuites] = useState<CardSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", quantity: 100, faceValue: 10, expireDays: 90, prefix: "", pinLength: 10, memo: "" });

  const fetchSuites = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/card-suites");
      const data = await res.json();
      if (data.error) setError(data.error); else setSuites(data.suites || []);
    } catch { setError("Failed to load card suites"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuites(); }, []);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/vos/card-suites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.error) setError("Failed");
      else { setShowModal(false); fetchSuites(); }
    } catch { setError("Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this card suite?")) return;
    try { await fetch(`/api/vos/card-suites?id=${id}`, { method: "DELETE" }); fetchSuites(); } catch {}
  };

  const filtered = suites.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Suite Management</h1><p className="text-surface-400 text-sm mt-1">{suites.length} card suites</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setForm({ name: "", quantity: 100, faceValue: 10, expireDays: 90, prefix: "", pinLength: 10, memo: "" }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4"/>Add Suite</button>
          <button onClick={fetchSuites} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
        </div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by name..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {loading?<div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="h-5 bg-surface-800 rounded w-32 mb-3 animate-pulse"/></div>)}</div>:
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5 hover:border-brand-500/30 transition-colors relative group">
            <button onClick={()=>handleDelete(s.id)} className="absolute top-3 right-3 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-brand-400"/></div><div><h3 className="font-semibold text-surface-50">{s.name}</h3><p className="text-xs text-surface-500">ID: {s.id}</p></div></div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-surface-500 text-xs">Quantity</span><p className="text-surface-50">{s.quantity}</p></div>
              <div><span className="text-surface-500 text-xs">Face Value</span><p className="text-emerald-400">${s.faceValue}</p></div>
              <div><span className="text-surface-500 text-xs">Expire Days</span><p className="text-surface-50">{s.expireDays}</p></div>
              <div><span className="text-surface-500 text-xs">PIN Length</span><p className="text-surface-50">{s.pinLength}</p></div>
            </div>
            {s.prefix && <p className="mt-2 text-xs text-surface-400 font-mono">Prefix: {s.prefix}</p>}
            {s.memo && <p className="mt-1 text-xs text-surface-500 border-t border-surface-800 pt-2">{s.memo}</p>}
          </div>
        ))}
      </div>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">Add Card Suite</h2><button onClick={()=>setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button></div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Quantity</label><input type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Face Value ($)</label><input type="number" step="0.01" value={form.faceValue} onChange={e=>setForm({...form,faceValue:parseFloat(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Expire Days</label><input type="number" value={form.expireDays} onChange={e=>setForm({...form,expireDays:parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">PIN Length</label><input type="number" value={form.pinLength} onChange={e=>setForm({...form,pinLength:parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Prefix</label><input value={form.prefix} onChange={e=>setForm({...form,prefix:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono"/></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e=>setForm({...form,memo:e.target.value})} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm resize-none"/></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={()=>setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleAdd} disabled={!form.name||saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving?"Creating...":"Create Suite"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
