"use client";

import { useState, useEffect } from "react";
import { Route, RefreshCw, GitBranch, Plus, Edit2, Trash2, X } from "lucide-react";
import DataTable, { type Column } from "@/components/DataTable";

interface VRoute { id: number; prefix: string; routeName: string; gatewayId: number; gatewayName: string | null; priority: number; rewritePrefix: string; stripDigits: number; prependDigits: string; status: number; memo: string; }

export default function RouteManagementPage() {
  const [routes, setRoutes] = useState<VRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<VRoute | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ prefix:"", routeName:"", gatewayId:0, priority:0, rewritePrefix:"", stripDigits:0, prependDigits:"", status:0, memo:"" });

  const fetchRoutes = async () => {
    setLoading(true); setError("");
    try { const r=await fetch("/api/vos/routes"); const d=await r.json(); if(d.error)setError(d.error); else setRoutes(d.routes||[]); } catch { setError("Failed"); }
    finally { setLoading(false); }
  };

  useEffect(()=>{fetchRoutes();},[]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingRoute) { await fetch(`/api/vos/routes?id=${editingRoute.id}`, { method: "DELETE" }); }
      await fetch("/api/vos/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowModal(false); setEditingRoute(null); fetchRoutes();
    } catch { setError("Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id:number) => {
    if(!confirm("Delete this route?"))return;
    try { await fetch(`/api/vos/routes?id=${id}`,{method:"DELETE"}); fetchRoutes(); } catch {}
  };

  const openEdit = (r:VRoute) => { setEditingRoute(r); setForm({ prefix:r.prefix,routeName:r.routeName,gatewayId:r.gatewayId,priority:r.priority,rewritePrefix:r.rewritePrefix||"",stripDigits:r.stripDigits||0,prependDigits:r.prependDigits||"",status:r.status,memo:r.memo||"" }); setShowModal(true); };
  const openAdd = () => { setEditingRoute(null); setForm({ prefix:"",routeName:"",gatewayId:0,priority:0,rewritePrefix:"",stripDigits:0,prependDigits:"",status:0,memo:"" }); setShowModal(true); };

  const columns: Column<VRoute>[] = [
    { key: "prefix", label: "Prefix", render: (r) => <span className="text-surface-50 font-mono font-medium text-xs">{r.prefix||"—"}</span> },
    { key: "routeName", label: "Route Name", render: (r) => r.routeName || "—" },
    { key: "gateway", label: "Gateway", render: (r) => r.gatewayName || `GW #${r.gatewayId}` },
    { key: "priority", label: "Priority", textAlign: "right" },
    { key: "status", label: "Status", textAlign: "center", render: (r) => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.status===0?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>{r.status===0?"Active":"Inactive"}</span>
    )},
    { key: "actions", label: "Actions", textAlign: "center", width: "96px", render: (r) => (
      <div className="flex items-center justify-center gap-1">
        <button onClick={()=>openEdit(r)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5"/></button>
        <button onClick={()=>handleDelete(r.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>
    )},
  ];

  return (<div className="p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-surface-50">Route Management</h1><p className="text-surface-400 text-sm mt-1">{routes.length} routes</p></div>
    <div className="flex items-center gap-2"><button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4"/>Add Route</button><button onClick={fetchRoutes} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button></div></div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Total Routes</p><p className="text-2xl font-bold text-surface-50">{routes.length}</p></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Active</p><p className="text-2xl font-bold text-emerald-400">{routes.filter(r=>r.status===0).length}</p></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Gateways</p><p className="text-2xl font-bold text-violet-400">{new Set(routes.map(r=>r.gatewayId)).size}</p></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4"><p className="text-xs text-surface-500 mb-1">Prefixes</p><p className="text-2xl font-bold text-amber-400">{new Set(routes.map(r=>r.prefix).filter(Boolean)).size}</p></div>
    </div>

    {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

    <DataTable
      columns={columns}
      data={routes}
      searchKey="prefix"
      loading={loading}
      emptyMessage="No routes found"
      emptyIcon={<Route className="w-10 h-10 text-surface-600" />}
      pageSize={20}
    />

    {showModal&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingRoute?"Edit Route":"Add Route"}</h2><button onClick={()=>setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button></div>
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-surface-400 mb-1">Prefix *</label><input value={form.prefix} onChange={e=>setForm({...form,prefix:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono"/></div>
          <div><label className="block text-xs font-medium text-surface-400 mb-1">Route Name</label><input value={form.routeName} onChange={e=>setForm({...form,routeName:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
          <div><label className="block text-xs font-medium text-surface-400 mb-1">Gateway ID</label><input type="number" value={form.gatewayId} onChange={e=>setForm({...form,gatewayId:parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
          <div><label className="block text-xs font-medium text-surface-400 mb-1">Priority</label><input type="number" value={form.priority} onChange={e=>setForm({...form,priority:parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
          <div><label className="block text-xs font-medium text-surface-400 mb-1">Strip Digits</label><input type="number" value={form.stripDigits} onChange={e=>setForm({...form,stripDigits:parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"/></div>
          <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={form.status} onChange={e=>setForm({...form,status:parseInt(e.target.value)})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"><option value={0}>Active</option><option value={1}>Inactive</option></select></div>
        </div>
        <div><label className="block text-xs font-medium text-surface-400 mb-1">Rewrite Prefix</label><input value={form.rewritePrefix} onChange={e=>setForm({...form,rewritePrefix:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono"/></div>
        <div><label className="block text-xs font-medium text-surface-400 mb-1">Prepend Digits</label><input value={form.prependDigits} onChange={e=>setForm({...form,prependDigits:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono"/></div>
        <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e=>setForm({...form,memo:e.target.value})} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm resize-none"/></div>
      </div>
      <div className="px-6 py-4 border-t border-surface-800 flex gap-3"><button onClick={()=>setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button><button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving?"Saving...":editingRoute?"Update":"Create"}</button></div>
    </div></div>)}
  </div>);
}
