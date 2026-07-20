"use client";

import { useState, useEffect } from "react";
import { Users, RefreshCw, Shield, Plus, Edit2, Trash2, X, Loader2, Search, ChevronDown } from "lucide-react";

interface VUser {
  id: number; loginName: string; userName: string; level: number;
  lockType: number; expireTime: number; lastLogin: number;
  lastModifyPassword: number; createdUserId: number; memo: string;
  limitMacs: number; macs: string; privilegeId: number;
}

const LEVELS: Record<number, string> = { 0: "User", 1: "Admin", 2: "Super Admin", 3: "System" };

export default function UserManagementPage() {
  const [users, setUsers] = useState<VUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<VUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    loginName: "", userName: "", password: "", level: 0, lockType: 0,
    expireTime: 0, memo: "", limitMacs: 0, macs: "", privilegeId: 0,
  });

  const fetchUsers = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/vos/users");
      const d = await r.json();
      if (d.error) setError(d.error);
      else setUsers(d.users || []);
    } catch { setError("Failed to load users"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const method = editingUser ? "PUT" : "POST";
      const body = editingUser ? { id: editingUser.id, ...form } : form;
      const res = await fetch("/api/vos/users", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setShowModal(false); setEditingUser(null);
      setSuccess(editingUser ? "User updated" : "User created");
      fetchUsers();
    } catch { setError("Failed to save user"); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (id: number, currentLockType: number) => {
    const newLockType = currentLockType === 0 ? 1 : 0;
    setTogglingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch("/api/vos/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lockType: newLockType }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setUsers(prev => prev.map(u => u.id === id ? { ...u, lockType: newLockType } : u));
    } catch { setError("Failed to toggle status"); }
    finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/vos/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setSuccess("User deleted"); fetchUsers(); }
    } catch { setError("Failed to delete"); }
  };

  const openEdit = (u: VUser) => {
    setEditingUser(u);
    setForm({
      loginName: u.loginName, userName: u.userName, password: "",
      level: u.level, lockType: u.lockType, expireTime: u.expireTime,
      memo: u.memo || "", limitMacs: u.limitMacs, macs: u.macs || "", privilegeId: u.privilegeId,
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm({ loginName: "", userName: "", password: "", level: 0, lockType: 0, expireTime: 0, memo: "", limitMacs: 0, macs: "", privilegeId: 0 });
    setShowModal(true);
  };

  const fmtTime = (t: number) => t ? new Date(t * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    const matchSearch = !s || u.loginName.toLowerCase().includes(s) || (u.userName || "").toLowerCase().includes(s);
    const matchLevel = !levelFilter || u.level === parseInt(levelFilter);
    return matchSearch && matchLevel;
  });

  const active = users.filter(u => u.lockType === 0).length;
  const locked = users.filter(u => u.lockType === 1).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            User Management
          </h1>
          <p className="text-surface-400 text-sm mt-1">{users.length} users | {active} active | {locked} locked</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />Add User
          </button>
          <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { n: users.length, l: "Total Users", c: "bg-brand-500/10 text-brand-400" },
          { n: active, l: "Active", c: "bg-emerald-500/10 text-emerald-400" },
          { n: locked, l: "Locked", c: "bg-red-500/10 text-red-400" },
          { n: users.filter(u => u.level >= 2).length, l: "Admins", c: "bg-amber-500/10 text-amber-400" },
        ].map(s => (
          <div key={s.l} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.c.split(" ")[0]} flex items-center justify-center`}>
                <Shield className={`w-5 h-5 ${s.c.split(" ")[1]}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-50">{s.n}</p>
                <p className="text-xs text-surface-400">{s.l}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error & Success */}
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><button onClick={() => setError("")} className="p-0.5 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2"><button onClick={() => setSuccess("")} className="p-0.5 hover:text-emerald-300"><X className="w-3.5 h-3.5" /></button>{success}</div>}

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input type="text" placeholder="Search by login or display name..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
        </div>
        <div className="relative">
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 cursor-pointer">
            <option value="">All Levels</option>
            <option value="0">User</option>
            <option value="1">Admin</option>
            <option value="2">Super Admin</option>
            <option value="3">System</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Login</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Name</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Level</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Last Login</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Expires</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">MACs</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-800/50">
                    {Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-surface-500">
                  <Users className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No users found</p></td></tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 text-surface-500 text-xs">{u.id}</td>
                    <td className="px-4 py-3 text-surface-300 font-mono text-xs">{u.loginName}</td>
                    <td className="px-4 py-3 text-surface-50 font-medium">{u.userName || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        u.level >= 2 ? "bg-amber-500/10 text-amber-400" : u.level === 1 ? "bg-blue-500/10 text-blue-400" : "bg-surface-800 text-surface-400"
                      }`}>{LEVELS[u.level] || `L${u.level}`}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(u.id, u.lockType)}
                        disabled={togglingIds.has(u.id)}
                        title={u.lockType === 0 ? "Click to lock" : "Click to unlock"}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          u.lockType === 0 ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        }`}
                      >
                        {togglingIds.has(u.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {u.lockType === 0 ? "Active" : "Locked"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-surface-400 text-xs">{fmtTime(u.lastLogin)}</td>
                    <td className="px-4 py-3 text-surface-400 text-xs">{u.expireTime ? fmtTime(u.expireTime) : "Never"}</td>
                    <td className="px-4 py-3 text-center text-surface-500 text-xs">{u.limitMacs || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <h2 className="text-lg font-semibold text-surface-50">{editingUser ? "Edit User" : "Add User"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Login Name *</label><input value={form.loginName} onChange={e => setForm({ ...form, loginName: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Display Name</label><input value={form.userName} onChange={e => setForm({ ...form, userName: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">{editingUser ? "New Password (leave blank to keep)" : "Password *"}</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Level</label><select value={form.level} onChange={e => setForm({ ...form, level: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>User</option><option value={1}>Admin</option><option value={2}>Super Admin</option><option value={3}>System</option></select></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={form.lockType} onChange={e => setForm({ ...form, lockType: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>Active</option><option value={1}>Locked</option></select></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Expire Time</label><input type="datetime-local" value={form.expireTime ? (()=>{const d=new Date(form.expireTime*1000);const p=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`})() : ""} onChange={e => setForm({ ...form, expireTime: e.target.value ? Math.floor(new Date(e.target.value).getTime() / 1000) : 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">MAC Limit</label><input type="number" value={form.limitMacs} onChange={e => setForm({ ...form, limitMacs: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.loginName || (!editingUser && !form.password) || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingUser ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
