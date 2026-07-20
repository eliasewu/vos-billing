"use client";

import { useState, useEffect } from "react";
import { Phone, Search, RefreshCw, Server, Plus, Edit2, Trash2, X } from "lucide-react";

interface VoipPhone { id: number; e164: string; capacity: number; callLevel: number; status: number; customerName: string | null; }

export default function PhoneOperationPage() {
  const [phones, setPhones] = useState<VoipPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPhone, setEditingPhone] = useState<VoipPhone | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ e164: "", password: "", capacity: 2, callLevel: 0, status: 0, customerId: 0 });

  const fetchPhones = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/phones");
      const data = await res.json();
      if (data.error) setError(data.error); else setPhones(data.phones || []);
    } catch { setError("Failed to load phones"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPhones(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Note: API supports POST/DELETE only; for edits, delete+recreate
      if (editingPhone) { await fetch(`/api/vos/phones?id=${editingPhone.id}`, { method: "DELETE" }); }
      await fetch("/api/vos/phones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowModal(false); setEditingPhone(null); fetchPhones();
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this phone?")) return;
    try { await fetch(`/api/vos/phones?id=${id}`, { method: "DELETE" }); fetchPhones(); } catch { setError("Failed to delete"); }
  };

  const openEdit = (p: VoipPhone) => {
    setEditingPhone(p);
    setForm({ e164: p.e164, password: "", capacity: p.capacity, callLevel: p.callLevel, status: p.status, customerId: 0 });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingPhone(null);
    setForm({ e164: "", password: "", capacity: 2, callLevel: 0, status: 0, customerId: 0 });
    setShowModal(true);
  };

  const filtered = phones.filter(p => p.e164.includes(search) || (p.customerName || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Phone Operation</h1><p className="text-surface-400 text-sm mt-1">{phones.length} phone numbers registered</p></div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Phone</button>
          <button onClick={fetchPhones} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Phone className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{phones.length}</p><p className="text-xs text-surface-400">Total Phones</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{phones.filter(p => p.status === 0).length}</p><p className="text-xs text-surface-400">Active</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Phone className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{phones.filter(p => p.customerName).length}</p><p className="text-xs text-surface-400">Assigned</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by number or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-surface-800">
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">#</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">E164 Number</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Customer</th>
              <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Capacity</th>
              <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Call Level</th>
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase">Status</th>
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase w-24">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i} className="border-b border-surface-800/50">{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>)}</tr>))
                : filtered.length === 0 ? (<tr><td colSpan={7} className="px-4 py-12 text-center text-surface-500"><Phone className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No phones found</p></td></tr>)
                  : filtered.map(p => (
                    <tr key={p.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                      <td className="px-4 py-3 text-surface-500 text-xs">{p.id}</td>
                      <td className="px-4 py-3 text-surface-50 font-mono font-medium">{p.e164}</td>
                      <td className="px-4 py-3 text-surface-300 text-xs">{p.customerName || "—"}</td>
                      <td className="px-4 py-3 text-right text-surface-300">{p.capacity}</td>
                      <td className="px-4 py-3 text-right text-surface-300">{p.callLevel}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{p.status === 0 ? "Active" : "Inactive"}</span></td>
                      <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingPhone ? "Edit Phone" : "Add Phone"}</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="block text-xs font-medium text-surface-400 mb-1">E164 Number *</label><input value={form.e164} onChange={e => setForm({ ...form, e164: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              {!editingPhone && <div><label className="block text-xs font-medium text-surface-400 mb-1">Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Call Level</label><input type="number" value={form.callLevel} onChange={e => setForm({ ...form, callLevel: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID</label><input type="number" value={form.customerId} onChange={e => setForm({ ...form, customerId: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>Active</option><option value={1}>Inactive</option></select></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.e164 || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingPhone ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
