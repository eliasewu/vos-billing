"use client";
import { useState, useEffect } from "react";
import { Calendar, Package, RefreshCw, Trash2, Download, Upload, Plus, Edit2, X, Search } from "lucide-react";

interface Product { id: number; packageId: number; productType: string; freeDuration: number; periodRate: number; packageName: string; groupName: string; }

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ packageId:0, productType:"", freeDuration:0, periodRate:0 });

  const fetchData = async () => { setLoading(true); setError(""); try { const r=await fetch("/api/vos/packages/period-rate"); const d=await r.json(); if(d.error)setError(d.error); else setProducts(d.products||[]); } catch { setError("Failed"); } finally { setLoading(false); }; };
  useEffect(()=>{fetchData();},[]);

  const handleDelete = async (id:number) => { if(!confirm("Delete this period rate?"))return; try { await fetch("/api/vos/packages/period-rate?id="+id,{method:"DELETE"}); setSuccess("Entry deleted"); fetchData(); } catch { setError("Failed to delete"); } };
  const handleSave = async () => { if(!form.packageId)return; setSaving(true); setError(""); try { const url = editingProduct ? `/api/vos/packages/period-rate/${editingProduct!.id}` : "/api/vos/packages/period-rate"; const method = editingProduct ? "PUT" : "POST"; const r = await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}); const d = await r.json(); if(d.error) setError(d.error); else { setSuccess(editingProduct ? "Updated" : "Created"); setShowModal(false); setEditingProduct(null); fetchData(); } } catch { setError("Failed"); } finally { setSaving(false); } };
  const openEdit = (p:Product) => { setEditingProduct(p); setForm({ packageId:p.packageId, productType:p.productType, freeDuration:p.freeDuration, periodRate:p.periodRate }); setShowModal(true); };
  const openAdd = () => { setEditingProduct(null); setForm({ packageId:0, productType:"", freeDuration:0, periodRate:0 }); setShowModal(true); };
  const formatSec = (s:number) => { const m=Math.floor(s/60); const h=Math.floor(m/60); return h>0?`${h}h ${m%60}m`:`${m}m ${s%60}s`; };
  const exportCSV = () => { const h=["packageName","groupName","productType","freeDuration","periodRate"]; const csv=[h.join(","),...filtered.map(p=>h.map(k=>{const v=(p as any)[k];return typeof v==="string"&&v.includes(",")?`"${v}"`:String(v||"");}).join(","))].join("\n"); const b=new Blob([csv],{type:"text/csv"}); const el=document.createElement("a"); el.href=URL.createObjectURL(b); el.download="period_rates.csv"; el.click(); };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter(l=>l.trim());
    if (lines.length<2) { setError("CSV needs header + data"); return; }
    const headers = lines[0].split(",").map(h=>h.trim().toLowerCase());
    let ok=0;
    for (const line of lines.slice(1)) {
      const vals = line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
      const row: any = {}; headers.forEach((h,i) => { row[h] = vals[i]||""; });
      try {
        const r = await fetch("/api/vos/packages/period-rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: parseInt(row.packageid)||0, productType: row.producttype||"", freeDuration: parseInt(row.freeduration)||0, periodRate: parseFloat(row.periodrate)||0 }) });
        const d = await r.json();
        if (!d.error) ok++;
      } catch {}
    }
    setSuccess(`Imported ${ok} entries`);
    fetchData();
    e.target.value = "";
  };

  const filtered = products.filter(p =>
    (p.packageName||"").toLowerCase().includes(search.toLowerCase()) ||
    (p.groupName||"").toLowerCase().includes(search.toLowerCase()) ||
    (p.productType||"").toLowerCase().includes(search.toLowerCase())
  );

  const avgRate = products.length > 0 ? products.reduce((s,p)=>s+(p.periodRate||0),0) / products.length : 0;

  return (<div className="p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-surface-50">Package Period Rate</h1><p className="text-surface-400 text-sm mt-1">{products.length} entries | Billing rates per period</p></div>
    <div className="flex items-center gap-2">
      <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400" title="Export CSV"><Download className="w-4 h-4"/></button>
      <label className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-amber-400 cursor-pointer" title="Import CSV"><Upload className="w-4 h-4"/><input type="file" accept=".csv" onChange={handleImport} className="hidden"/></label>
      <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4"/>Add Rate</button>
      <button onClick={fetchData} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/></button></div></div>

    {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
    {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>}

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Package className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{products.length}</p><p className="text-xs text-surface-400">Total Rates</p></div></div></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-emerald-400"/></div><div><p className="text-2xl font-bold text-emerald-400">${avgRate.toFixed(4)}</p><p className="text-xs text-surface-400">Avg Rate/min</p></div></div></div>
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Search className="w-5 h-5 text-violet-400"/></div><div><p className="text-2xl font-bold text-surface-50">{filtered.length}</p><p className="text-xs text-surface-400">Filtered</p></div></div></div>
    </div>

    <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by package, group, type..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

    <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-surface-800"><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Package</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Group</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Type</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Free Duration</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Rate/min</th><th className="text-center px-4 py-3 text-surface-400 text-xs uppercase w-20">Actions</th></tr></thead>
    <tbody className="divide-y divide-surface-800/50">{loading?<tr><td colSpan={6} className="p-6 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-surface-500"/></td></tr>:filtered.length===0?<tr><td colSpan={6} className="p-12 text-center text-surface-500"><Calendar className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No period rate entries found</p></td></tr>:filtered.map(p=><tr key={p.id} className="hover:bg-surface-800/30"><td className="px-4 py-3 text-surface-50 font-medium">{p.packageName||"—"}</td><td className="px-4 py-3 text-surface-400 text-xs">{p.groupName||"—"}</td><td className="px-4 py-3 text-surface-300">{p.productType}</td><td className="px-4 py-3 text-right text-surface-50 font-mono">{formatSec(p.freeDuration)}</td><td className="px-4 py-3 text-right text-emerald-400 font-mono">${Number(p.periodRate).toFixed(4)}</td><td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={()=>openEdit(p)} className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5"/></button><button onClick={()=>handleDelete(p.id)} className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button></div></td></tr>)}</tbody></table></div>

    {/* Add/Edit Modal */}
    {showModal&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4"><div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingProduct?"Edit Period Rate":"Add Period Rate"}</h2><button onClick={()=>setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button></div><div className="px-6 py-4 space-y-4"><div><label className="block text-xs font-medium text-surface-400 mb-1">Package ID *</label><input type="number" value={form.packageId} onChange={e=>setForm({...form,packageId:parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div><div><label className="block text-xs font-medium text-surface-400 mb-1">Product Type</label><input value={form.productType} onChange={e=>setForm({...form,productType:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-surface-400 mb-1">Free Duration (s)</label><input type="number" value={form.freeDuration} onChange={e=>setForm({...form,freeDuration:parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div><div><label className="block text-xs font-medium text-surface-400 mb-1">Rate/min</label><input type="number" step="0.0001" value={form.periodRate} onChange={e=>setForm({...form,periodRate:parseFloat(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div></div></div><div className="px-6 py-4 border-t border-surface-800 flex gap-3"><button onClick={()=>setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button><button onClick={handleSave} disabled={saving||!form.packageId} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving?"Saving...":editingProduct?"Update":"Create"}</button></div></div></div>)}
  </div>);
}
