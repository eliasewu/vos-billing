"use client";

import { useState, useEffect } from "react";
import { Settings, RefreshCw, Search, Edit2, X, Check, Loader2, Download } from "lucide-react";

interface SysParam { id: number; name: string; value: string; type: string; memo: string; }

export default function SystemParametersPage() {
  const [params, setParams] = useState<SysParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchParams = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/vos/sysparam");
      const d = await r.json();
      if (d.error) setError(d.error); else setParams(d.params || []);
    } catch { setError("Failed to load parameters"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParams(); }, []);

  const saveEdit = async (id: number) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/sysparam", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, value: editValue }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setParams(prev => prev.map(p => p.id === id ? { ...p, value: editValue } : p));
      setEditingId(null); setSuccess("Parameter updated");
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleApply = async () => {
    setSuccess("Parameters applied — changes saved to database");
  };

  const exportCSV = () => {
    const rows = ["Name,Value,Type,Memo"];
    filtered.forEach(p => rows.push(`"${p.name}","${p.value}","${p.type}","${p.memo || ""}"`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "system_params.csv"; a.click();
  };

  const startEdit = (p: SysParam) => { setEditingId(p.id); setEditValue(p.value); };
  const cancelEdit = () => { setEditingId(null); setEditValue(""); };

  const filtered = params.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.memo || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-400" />System Parameters
          </h1>
          <p className="text-surface-400 text-sm mt-1">{params.length} configurable parameters</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 text-sm transition-colors">
            <Download className="w-4 h-4" />Export
          </button>
          <button onClick={handleApply} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
            <Check className="w-4 h-4" />Apply
          </button>
          <button onClick={fetchParams} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><button onClick={() => setError("")} className="p-0.5 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2"><button onClick={() => setSuccess("")} className="p-0.5 hover:text-emerald-300"><X className="w-3.5 h-3.5" /></button>{success}</div>}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input type="text" placeholder="Search by name or memo..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
      </div>

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-surface-800">
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">#</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Value</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Description</th>
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider w-20">Edit</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-800/50">
                  {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>)}
                </tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-surface-500">
                  <Settings className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No parameters found</p></td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className={`border-b border-surface-800/50 transition-colors ${editingId === p.id ? "bg-brand-500/5" : "hover:bg-surface-800/30"}`}>
                  <td className="px-4 py-3 text-surface-500 text-xs font-mono">{p.id}</td>
                  <td className="px-4 py-3 text-surface-50 font-medium font-mono text-xs">{p.name}</td>
                  <td className="px-4 py-3">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-2">
                        <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-surface-800 border border-brand-500/50 rounded-lg text-surface-50 text-sm font-mono focus:outline-none" autoFocus />
                        <button onClick={() => saveEdit(p.id)} disabled={saving}
                          className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-surface-700 text-surface-400"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : <span className="text-surface-200 font-mono text-xs">{p.value}</span>}
                  </td>
                  <td className="px-4 py-3 text-surface-400 text-xs">{p.type || "—"}</td>
                  <td className="px-4 py-3 text-surface-500 text-xs max-w-[250px] truncate" title={p.memo}>{p.memo || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {editingId !== p.id && (
                      <button onClick={() => startEdit(p)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
