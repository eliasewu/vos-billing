"use client";

import { useState, useEffect } from "react";
import { Key, Search, RefreshCw, Shield, Plus, Edit2, Trash2, X, Loader2 } from "lucide-react";

interface Auth { id: number; customerId: number; customerName: string | null; username: string; webAccess: number; memo: string; }

export default function AuthorizationPage() {
  const [auths, setAuths] = useState<Auth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAuth, setEditingAuth] = useState<Auth | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: 0, username: "", password: "", webAccess: 1, memo: "" });
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const fetchAuths = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/auth");
      const data = await res.json();
      if (data.error) setError(data.error); else setAuths(data.auths || []);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAuths(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Note: API supports POST/DELETE only; for edits, delete+recreate
      if (editingAuth) { await fetch(`/api/vos/auth?id=${editingAuth.id}`, { method: "DELETE" }); }
      await fetch("/api/vos/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowModal(false); setEditingAuth(null); fetchAuths();
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleToggleWebAccess = async (id: number, currentVal: number) => {
    const newVal = currentVal === 1 ? 0 : 1;
    setTogglingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch("/api/vos/auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, webAccess: newVal }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setAuths(prev => prev.map(a => a.id === id ? { ...a, webAccess: newVal } : a));
    } catch { setError("Failed to toggle"); }
    finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this authorization?")) return;
    try { await fetch(`/api/vos/auth?id=${id}`, { method: "DELETE" }); fetchAuths(); } catch { setError("Failed to delete"); }
  };

  const openEdit = (a: Auth) => {
    setEditingAuth(a);
    setForm({ customerId: a.customerId, username: a.username, password: "", webAccess: a.webAccess, memo: a.memo || "" });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingAuth(null);
    setForm({ customerId: 0, username: "", password: "", webAccess: 1, memo: "" });
    setShowModal(true);
  };

  const filtered = auths.filter(a => a.username.toLowerCase().includes(search.toLowerCase()) || (a.customerName || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Authorization Management</h1><p className="text-surface-400 text-sm mt-1">Customer web portal access credentials</p></div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Auth</button>
          <button onClick={fetchAuths} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{auths.length}</p><p className="text-xs text-surface-400">Total Auths</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Key className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{auths.filter(a => a.webAccess === 1).length}</p><p className="text-xs text-surface-400">Web Enabled</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{new Set(auths.map(a => a.customerId)).size}</p><p className="text-xs text-surface-400">Customers</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by username or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-surface-800">
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">#</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Customer</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Username</th>
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase">Web Access</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Memo</th>
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase w-24">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i} className="border-b border-surface-800/50">{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>)}</tr>))
                : filtered.length === 0 ? (<tr><td colSpan={6} className="px-4 py-12 text-center text-surface-500"><Key className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No authorizations found</p></td></tr>)
                  : filtered.map(a => (
                    <tr key={a.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                      <td className="px-4 py-3 text-surface-500 text-xs">{a.id}</td>
                      <td className="px-4 py-3 text-surface-50 font-medium">{a.customerName || `Customer #${a.customerId}`}</td>
                      <td className="px-4 py-3 text-surface-300 font-mono text-xs">{a.username}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleWebAccess(a.id, a.webAccess)}
                          disabled={togglingIds.has(a.id)}
                          title={a.webAccess === 1 ? "Click to disable" : "Click to enable"}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                            a.webAccess === 1 ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          }`}
                        >
                          {togglingIds.has(a.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {a.webAccess === 1 ? "Enabled" : "Disabled"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-surface-400 text-xs max-w-[200px] truncate">{a.memo || "—"}</td>
                      <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete(a.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingAuth ? "Edit Authorization" : "Add Authorization"}</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID</label><input type="number" value={form.customerId} onChange={e => setForm({ ...form, customerId: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Username *</label><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              </div>
              {!editingAuth && <div><label className="block text-xs font-medium text-surface-400 mb-1">Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>}
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Web Access</label><select value={form.webAccess} onChange={e => setForm({ ...form, webAccess: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={1}>Enabled</option><option value={0}>Disabled</option></select></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.username || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingAuth ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
