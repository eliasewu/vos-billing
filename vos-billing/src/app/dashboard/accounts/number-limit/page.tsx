"use client";

import { useState, useEffect } from "react";
import { Hash, Search, RefreshCw, Shield, Plus, Edit2, Trash2, X } from "lucide-react";

interface NumLimit { id: number; customerId: number; customerName: string | null; prefix: string; limitCalls: number; limitDuration: number; memo: string; }

export default function NumberLimitPage() {
  const [limits, setLimits] = useState<NumLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState<NumLimit | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: 0, prefix: "", limitCalls: 0, limitDuration: 0, memo: "" });

  const fetchLimits = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/number-limit");
      const data = await res.json();
      if (data.error) setError(data.error); else setLimits(data.limits || []);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLimits(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Note: API supports POST/DELETE only; for edits, delete+recreate
      if (editingLimit) { await fetch(`/api/vos/number-limit?id=${editingLimit.id}`, { method: "DELETE" }); }
      await fetch("/api/vos/number-limit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowModal(false); setEditingLimit(null); fetchLimits();
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this number limit?")) return;
    try { await fetch(`/api/vos/number-limit?id=${id}`, { method: "DELETE" }); fetchLimits(); } catch { setError("Failed to delete"); }
  };

  const openEdit = (l: NumLimit) => {
    setEditingLimit(l);
    setForm({ customerId: l.customerId, prefix: l.prefix, limitCalls: l.limitCalls, limitDuration: l.limitDuration, memo: l.memo || "" });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingLimit(null);
    setForm({ customerId: 0, prefix: "", limitCalls: 0, limitDuration: 0, memo: "" });
    setShowModal(true);
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60), h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${s % 60}s`;
  };

  const filtered = limits.filter(l =>
    l.prefix.toLowerCase().includes(search.toLowerCase()) ||
    (l.customerName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Number Section Limit</h1><p className="text-surface-400 text-sm mt-1">Prefix-based call & duration limits per customer</p></div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Limit</button>
          <button onClick={fetchLimits} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Hash className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{limits.length}</p><p className="text-xs text-surface-400">Total Limits</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{limits.filter(l => l.limitCalls > 0).length}</p><p className="text-xs text-surface-400">With Call Limit</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Hash className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{new Set(limits.map(l => l.prefix)).size}</p><p className="text-xs text-surface-400">Unique Prefixes</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by prefix or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-surface-800">
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">#</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Customer</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Prefix</th>
              <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Call Limit</th>
              <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Duration Limit</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Memo</th>
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase w-24">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i} className="border-b border-surface-800/50">{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>)}</tr>))
                : filtered.length === 0 ? (<tr><td colSpan={7} className="px-4 py-12 text-center text-surface-500"><Hash className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No number limits found</p></td></tr>)
                  : filtered.map(l => (
                    <tr key={l.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                      <td className="px-4 py-3 text-surface-500 text-xs">{l.id}</td>
                      <td className="px-4 py-3 text-surface-50 font-medium">{l.customerName || `Customer #${l.customerId}`}</td>
                      <td className="px-4 py-3 text-surface-300 font-mono text-xs">{l.prefix}</td>
                      <td className="px-4 py-3 text-right text-surface-300">{l.limitCalls > 0 ? l.limitCalls.toLocaleString() : "Unlimited"}</td>
                      <td className="px-4 py-3 text-right text-surface-300 font-mono text-xs">{l.limitDuration > 0 ? formatDuration(l.limitDuration) : "Unlimited"}</td>
                      <td className="px-4 py-3 text-surface-400 text-xs max-w-[200px] truncate">{l.memo || "—"}</td>
                      <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(l)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete(l.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingLimit ? "Edit Limit" : "Add Number Limit"}</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID</label><input type="number" value={form.customerId} onChange={e => setForm({ ...form, customerId: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Prefix *</label><input value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Call Limit</label><input type="number" value={form.limitCalls} onChange={e => setForm({ ...form, limitCalls: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Duration Limit (s)</label><input type="number" value={form.limitDuration} onChange={e => setForm({ ...form, limitDuration: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.prefix || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingLimit ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
