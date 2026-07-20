"use client";
import { useState, useEffect } from "react";
import { Package, Layers, RefreshCw, Plus, Trash2, Download, Upload, X, Edit2, Search, Loader2 } from "lucide-react";

interface PkgGroup { id: number; name: string; memo: string; pkgCount: number; privilege: number; }

export default function Page() {
  const [groups, setGroups] = useState<PkgGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PkgGroup | null>(null);
  const [form, setForm] = useState({ name: "", memo: "", privilege: 0 });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true); setError("");
    try { const r = await fetch("/api/vos/packages/groups"); const d = await r.json(); if (d.error) setError(d.error); else setGroups(d.groups||[]); }
    catch { setError("Failed to load"); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditingGroup(null);
    setForm({ name: "", memo: "", privilege: 0 });
    setError(""); setSuccess("");
    setShowModal(true);
  };

  const openEdit = (g: PkgGroup) => {
    setEditingGroup(g);
    setForm({ name: g.name, memo: g.memo || "", privilege: g.privilege || 0 });
    setError(""); setSuccess("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      if (editingGroup) {
        const r = await fetch(`/api/vos/packages/groups?id=${editingGroup.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, memo: form.memo, privilege: form.privilege }),
        });
        const d = await r.json();
        if (d.error) setError(d.error);
        else { setSuccess(`Group "${form.name}" updated`); setShowModal(false); fetchData(); }
      } else {
        const r = await fetch("/api/vos/packages/groups", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const d = await r.json();
        if (d.error) setError(d.error);
        else { setSuccess(`Group "${form.name}" created`); setShowModal(false); fetchData(); }
      }
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this package group and all its packages?")) return;
    try {
      const r = await fetch(`/api/vos/packages/groups?id=${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.error) setError(d.error); else { setSuccess("Group deleted"); fetchData(); }
    } catch { setError("Failed to delete"); }
  };

  const exportCSV = () => {
    const h = ["name","memo","privilege","pkgCount"];
    const csv = [h.join(","), ...groups.map(g => h.map(k => { const v = (g as any)[k]; return typeof v==="string"&&v.includes(",")?`"${v}"`:String(v||""); }).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "package_groups.csv"; a.click();
    URL.revokeObjectURL(url);
  };

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
        const r = await fetch("/api/vos/packages/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: row.name||"Imported", memo: row.memo||"", privilege: parseInt(row.privilege)||0 }) });
        const d = await r.json();
        if (!d.error) ok++;
      } catch {}
    }
    setSuccess(`Imported ${ok} groups`);
    fetchData();
    e.target.value = "";
  };

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Package Group Management</h1><p className="text-surface-400 text-sm mt-1">{groups.length} groups | Manage calling package groups</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400" title="Export CSV"><Download className="w-4 h-4" /></button>
          <label className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-amber-400 cursor-pointer" title="Import CSV"><Upload className="w-4 h-4" /><input type="file" accept=".csv" onChange={handleImport} className="hidden" /></label>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Group</button>
          <button onClick={fetchData} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`} /></button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input type="text" placeholder="Search groups..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Package className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{groups.length}</p><p className="text-xs text-surface-400">Total Groups</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Layers className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{groups.reduce((s,g)=>s+g.pkgCount,0)}</p><p className="text-xs text-surface-400">Total Packages</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Search className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{filtered.length}</p><p className="text-xs text-surface-400">Filtered</p></div></div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array.from({length:3}).map((_,i)=><div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 animate-pulse"><div className="h-5 bg-surface-800 rounded w-3/4 mb-3"/><div className="h-4 bg-surface-800 rounded w-1/2"/></div>) :
          filtered.map(g => (
            <div key={g.id} className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 hover:border-brand-500/30 transition-colors relative group">
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => openEdit(g)} className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(g.id)} className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Package className="w-5 h-5 text-brand-400" /></div><div><h3 className="font-semibold text-surface-50">{g.name}</h3><p className="text-xs text-surface-500">{g.pkgCount} packages</p></div></div>
              <p className="text-xs text-surface-400">{g.memo||"No description"}</p>
              <div className="mt-3 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-surface-500" /><span className="text-xs text-surface-400">Privilege: {g.privilege||0}</span></div>
            </div>
          ))
        }
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <h2 className="text-lg font-semibold text-surface-50">{editingGroup ? "Edit Package Group" : "Add Package Group"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Name *</label><input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Privilege</label><input type="number" value={form.privilege} onChange={e=>setForm({...form,privilege:parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e=>setForm({...form,memo:e.target.value})} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={saving||!form.name.trim()} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Saving..." : editingGroup ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
