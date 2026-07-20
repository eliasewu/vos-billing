"use client";

import { useState, useEffect } from "react";
import { Hash, Search, RefreshCw, MapPin, Plus, Edit2, Trash2, X } from "lucide-react";

interface VNumber { id: number; e164: string; areacode: string; location: string; carrier: string; memo: string; }

export default function NumberManagementPage() {
  const [numbers, setNumbers] = useState<VNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingNum, setEditingNum] = useState<VNumber | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ e164:"", areacode:"", location:"", carrier:"", memo:"" });

  const fetchNumbers = async () => {
    setLoading(true); setError("");
    try { const r=await fetch("/api/vos/numbers"); const d=await r.json(); if(d.error)setError(d.error); else setNumbers(d.numbers||[]); } catch { setError("Failed"); }
    finally { setLoading(false); }
  };

  useEffect(()=>{fetchNumbers();},[]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Note: API supports POST/DELETE only; for edits, delete+recreate
      if (editingNum) { await fetch(`/api/vos/numbers?id=${editingNum.id}`, { method: "DELETE" }); }
      await fetch("/api/vos/numbers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowModal(false); setEditingNum(null); fetchNumbers();
    } catch { setError("Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id:number) => {
    if(!confirm("Delete this number?"))return;
    try { await fetch(`/api/vos/numbers?id=${id}`,{method:"DELETE"}); fetchNumbers(); } catch {}
  };

  const openEdit = (n:VNumber) => { setEditingNum(n); setForm({ e164:n.e164,areacode:n.areacode||"",location:n.location||"",carrier:n.carrier||"",memo:n.memo||"" }); setShowModal(true); };
  const openAdd = () => { setEditingNum(null); setForm({ e164:"",areacode:"",location:"",carrier:"",memo:"" }); setShowModal(true); };

  const filtered = numbers.filter(n=>n.e164.includes(search)||n.location.toLowerCase().includes(search.toLowerCase())||n.carrier.toLowerCase().includes(search.toLowerCase()));

  return (<div className="p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-surface-50">Number Management</h1><p className="text-surface-400 text-sm mt-1">{numbers.length} numbers</p></div>
    <div className="flex items-center gap-2"><button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4"/>Add Number</button><button onClick={fetchNumbers} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button></div></div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Total</p><p className="text-2xl font-bold text-surface-50">{numbers.length}</p></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Locations</p><p className="text-2xl font-bold text-emerald-400">{new Set(numbers.map(n=>n.location).filter(Boolean)).size}</p></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Carriers</p><p className="text-2xl font-bold text-violet-400">{new Set(numbers.map(n=>n.carrier).filter(Boolean)).size}</p></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Area Codes</p><p className="text-2xl font-bold text-amber-400">{new Set(numbers.map(n=>n.areacode).filter(Boolean)).size}</p></div>
    </div>

    <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by number, location, or carrier..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

    {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

    <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="border-b border-surface-800">
          <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">E164</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Area Code</th>
          <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Location</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Carrier</th>
          <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Memo</th><th className="text-center px-4 py-3 text-surface-400 text-xs uppercase w-24">Actions</th>
        </tr></thead>
        <tbody>{loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:6}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):filtered.length===0?<tr><td colSpan={6} className="px-4 py-12 text-center text-surface-500"><Hash className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No numbers found</p></td></tr>:filtered.map(n=><tr key={n.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
          <td className="px-4 py-3 text-surface-50 font-mono font-medium text-xs">{n.e164}</td><td className="px-4 py-3 text-surface-300 text-xs">{n.areacode||"—"}</td>
          <td className="px-4 py-3 text-surface-300 text-xs flex items-center gap-1"><MapPin className="w-3 h-3 text-surface-500"/>{n.location||"—"}</td>
          <td className="px-4 py-3 text-surface-300 text-xs">{n.carrier||"—"}</td><td className="px-4 py-3 text-surface-400 text-xs max-w-[200px] truncate">{n.memo||"—"}</td>
          <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={()=>openEdit(n)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5"/></button><button onClick={()=>handleDelete(n.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button></div></td>
        </tr>)}</tbody>
      </table></div>
    </div>

    {showModal&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingNum?"Edit Number":"Add Number"}</h2><button onClick={()=>setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button></div>
      <div className="px-6 py-4 space-y-4">
        <div><label className="block text-xs font-medium text-surface-400 mb-1">E164 Number *</label><input value={form.e164} onChange={e=>setForm({...form,e164:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-surface-400 mb-1">Area Code</label><input value={form.areacode} onChange={e=>setForm({...form,areacode:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
          <div><label className="block text-xs font-medium text-surface-400 mb-1">Location</label><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
        </div>
        <div><label className="block text-xs font-medium text-surface-400 mb-1">Carrier</label><input value={form.carrier} onChange={e=>setForm({...form,carrier:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
        <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e=>setForm({...form,memo:e.target.value})} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm resize-none"/></div>
      </div>
      <div className="px-6 py-4 border-t border-surface-800 flex gap-3"><button onClick={()=>setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button><button onClick={handleSave} disabled={!form.e164||saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving?"Saving...":editingNum?"Update":"Create"}</button></div>
    </div></div>)}
  </div>);
}
