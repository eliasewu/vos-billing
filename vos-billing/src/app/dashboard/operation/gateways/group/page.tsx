"use client";

import { useState, useEffect } from "react";
import { Network, RefreshCw, Server, Plus, Edit2, Trash2, X } from "lucide-react";

interface GwGroup { id:number; name:string; capacity:number; memo:string; }

export default function GatewayGroupPage(){
  const [groups,setGroups]=useState<GwGroup[]>([]);
  const [loading,setLoading]=useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GwGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", capacity:0, memo:"" });

  const fetchGroups=async()=>{
    setLoading(true);
    try{const r=await fetch("/api/vos/gateway-groups");const d=await r.json();setGroups(d.groups||[]);}
    catch{}finally{setLoading(false);}
  };

  useEffect(()=>{fetchGroups();},[]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingGroup ? `/api/vos/gateway-groups/${editingGroup.id}` : "/api/vos/gateway-groups";
      const method = editingGroup ? "PUT" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowModal(false); setEditingGroup(null); fetchGroups();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this gateway group?")) return;
    try { await fetch(`/api/vos/gateway-groups/${id}`, { method: "DELETE" }); fetchGroups(); } catch {}
  };

  const openEdit = (g: GwGroup) => {
    setEditingGroup(g);
    setForm({ name: g.name, capacity: g.capacity, memo: g.memo });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingGroup(null);
    setForm({ name: "", capacity: 0, memo: "" });
    setShowModal(true);
  };

  return(<div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-bold text-surface-50">Gateway Group</h1><p className="text-surface-400 text-sm mt-1">{groups.length} groups</p></div>
      <div className="flex items-center gap-2">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4"/>Add Group</button>
        <button onClick={fetchGroups} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
      </div>
    </div>

    {loading?<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2].map(i=><div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="h-5 bg-surface-800 rounded w-32 mb-3 animate-pulse"/></div>)}</div>:
    groups.length===0?<div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center text-surface-500"><Network className="w-12 h-12 mx-auto mb-3 text-surface-600"/><p className="text-lg font-medium">No gateway groups</p><p className="text-sm mt-1">Click "Add Group" to create one</p></div>:
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{groups.map(g=><div key={g.id} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5 relative group"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-violet-400"/></div><div><h3 className="text-base font-semibold text-surface-50">{g.name}</h3><p className="text-xs text-surface-500">ID: {g.id}</p></div></div><div className="flex gap-4 text-sm"><div><span className="text-surface-500 text-xs">Capacity</span><p className="text-surface-50">{g.capacity||"—"} calls</p></div></div>{g.memo&&<p className="mt-3 text-xs text-surface-500 border-t border-surface-800 pt-3">{g.memo}</p>}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => openEdit(g)} className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5"/></button>
        <button onClick={() => handleDelete(g.id)} className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
      </div></div>)}</div>}

    {/* Add/Edit Modal */}
    {showModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
            <h2 className="text-lg font-semibold text-surface-50">{editingGroup ? "Edit Group" : "Add Gateway Group"}</h2>
            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div><label className="block text-xs font-medium text-surface-400 mb-1">Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-violet-500/50"/></div>
            <div><label className="block text-xs font-medium text-surface-400 mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-violet-500/50"/></div>
            <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e => setForm({...form, memo: e.target.value})} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-violet-500/50 resize-none"/></div>
          </div>
          <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
            <button onClick={handleSave} disabled={!form.name || saving} className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingGroup ? "Update" : "Create"}</button>
          </div>
        </div>
      </div>
    )}
  </div>);
}
