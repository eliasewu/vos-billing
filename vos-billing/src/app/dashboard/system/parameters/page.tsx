"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, Search, RefreshCw, Settings, Edit2, X, Check } from "lucide-react";

interface SysParam { id: number; name: string; value: string; type: string; memo: string; }

export default function SystemParametersPage() {
  const [params, setParams] = useState<SysParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchParams = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/sysparam");
      const data = await res.json();
      if (data.error) setError(data.error); else setParams(data.params || []);
    } catch { setError("Failed to load parameters"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParams(); }, []);

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      await fetch("/api/vos/sysparam", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, value: editValue }) });
      setEditingId(null); fetchParams();
    } catch { setError("Failed to update"); }
    finally { setSaving(false); }
  };

  const startEdit = (p: SysParam) => {
    setEditingId(p.id); setEditValue(p.value);
  };

  const cancelEdit = () => { setEditingId(null); setEditValue(""); };

  const filtered = params.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.memo||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">System Parameters</h1><p className="text-surface-400 text-sm mt-1">{params.length} configurable parameters</p></div>
        <button onClick={fetchParams} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by name or memo..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">#</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Name</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Value</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Type</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Memo</th><th className="text-center px-4 py-3 text-surface-400 text-xs uppercase w-24">Actions</th>
          </tr></thead>
          <tbody>{loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:6}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):filtered.length===0?<tr><td colSpan={6} className="px-4 py-12 text-center text-surface-500"><Settings className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No parameters found</p></td></tr>:filtered.map(p=><tr key={p.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
            <td className="px-4 py-3 text-surface-500 text-xs">{p.id}</td><td className="px-4 py-3 text-surface-50 font-medium font-mono text-xs">{p.name}</td>
            <td className="px-4 py-3">{editingId===p.id?<div className="flex items-center gap-2"><input value={editValue} onChange={e=>setEditValue(e.target.value)} className="w-40 px-2 py-1 bg-surface-800 border border-brand-500/50 rounded text-surface-50 text-xs"/><button onClick={()=>handleSave(p.id)} disabled={saving} className="p-1 rounded bg-emerald-600 text-white"><Check className="w-3.5 h-3.5"/></button><button onClick={cancelEdit} className="p-1 rounded text-surface-400 hover:text-surface-50"><X className="w-3.5 h-3.5"/></button></div>:<span className="text-surface-300 font-mono text-xs">{p.value}</span>}</td>
            <td className="px-4 py-3 text-surface-400 text-xs">{p.type||"—"}</td><td className="px-4 py-3 text-surface-400 text-xs max-w-[300px] truncate">{p.memo||"—"}</td>
            <td className="px-4 py-3 text-center">{editingId!==p.id&&<button onClick={()=>startEdit(p)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5"/></button>}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}
