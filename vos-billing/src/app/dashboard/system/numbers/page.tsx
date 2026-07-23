"use client";

import { useState, useEffect } from "react";
import { Hash, RefreshCw, MapPin, Plus, Edit2, Trash2, X } from "lucide-react";
import DataTable, { type Column } from "@/components/DataTable";

interface VNumber { id: number; e164: string; areacode: string; location: string; carrier: string; memo: string; }

export default function NumberManagementPage() {
  const [numbers, setNumbers] = useState<VNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const columns: Column<VNumber>[] = [
    { key: "e164", label: "E164", cellClassName: "text-surface-50 font-mono font-medium text-xs" },
    { key: "areacode", label: "Area Code", render: (n) => n.areacode || "—" },
    { key: "location", label: "Location", render: (n) => n.location ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-surface-500"/>{n.location}</span> : "—" },
    { key: "carrier", label: "Carrier", render: (n) => n.carrier || "—" },
    { key: "memo", label: "Memo", render: (n) => <span className="max-w-[200px] truncate block" title={n.memo||""}>{n.memo || "—"}</span>, cellClassName: "text-surface-400" },
    { key: "actions", label: "Actions", textAlign: "center", width: "96px", render: (n) => (
      <div className="flex items-center justify-center gap-1">
        <button onClick={()=>openEdit(n)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5"/></button>
        <button onClick={()=>handleDelete(n.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>
    )},
  ];

  return (<div className="p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-surface-50">Number Management</h1><p className="text-surface-400 text-sm mt-1">{numbers.length} numbers</p></div>
    <div className="flex items-center gap-2"><button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4"/>Add Number</button><button onClick={fetchNumbers} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button></div></div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Total</p><p className="text-2xl font-bold text-surface-50">{numbers.length}</p></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Locations</p><p className="text-2xl font-bold text-emerald-400">{new Set(numbers.map(n=>n.location).filter(Boolean)).size}</p></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Carriers</p><p className="text-2xl font-bold text-violet-400">{new Set(numbers.map(n=>n.carrier).filter(Boolean)).size}</p></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Area Codes</p><p className="text-2xl font-bold text-amber-400">{new Set(numbers.map(n=>n.areacode).filter(Boolean)).size}</p></div>
    </div>

    {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

    <DataTable
      columns={columns}
      data={numbers}
      searchKey="e164"
      loading={loading}
      emptyMessage="No numbers found"
      emptyIcon={<Hash className="w-10 h-10 text-surface-600" />}
      pageSize={20}
    />

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
