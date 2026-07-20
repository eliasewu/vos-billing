"use client";

import { useState, useEffect } from "react";
import { Users, RefreshCw, Shield, Key, Plus, Edit2, Trash2, X } from "lucide-react";

interface VUser { id:number; loginName:string; userName:string; level:number; lockType:number; expireTime:number; }

const LEVELS:Record<number,string>={0:"User",1:"Admin",2:"Super Admin",3:"System"};

export default function UserManagementPage() {
  const [users,setUsers]=useState<VUser[]>([]);
  const [loading,setLoading]=useState(true);

  const fetchUsers=async()=>{
    setLoading(true);
    try{const r=await fetch("/api/vos/users");const d=await r.json();setUsers(d.users||[]);}catch{}finally{setLoading(false);}
  };

  useEffect(()=>{fetchUsers();},[]);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<VUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ loginName:"", userName:"", password:"", level:0, lockType:0, expireTime:0 });

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingUser ? `/api/vos/users/${editingUser.id}` : "/api/vos/users";
      const method = editingUser ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.error) {/* handle */} else { setShowModal(false); setEditingUser(null); fetchUsers(); }
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try { await fetch(`/api/vos/users/${id}`, { method: "DELETE" }); fetchUsers(); } catch {}
  };

  const openEdit = (u: VUser) => {
    setEditingUser(u);
    setForm({ loginName: u.loginName, userName: u.userName, password: "", level: u.level, lockType: u.lockType, expireTime: u.expireTime });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm({ loginName: "", userName: "", password: "", level: 0, lockType: 0, expireTime: 0 });
    setShowModal(true);
  };

  const fmtTime=(t:number)=>t?new Date(t*1000).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}):"Never";
  const active=users.filter(u=>u.lockType===0).length;

  return (<div className="p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-surface-50">User Management</h1><p className="text-surface-400 text-sm mt-1">{users.length} users | {active} active</p></div>
    <div className="flex items-center gap-2">
      <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4"/>Add User</button>
      <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
    </div></div>
    {loading?<div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="h-5 bg-surface-800 rounded w-32 mb-3 animate-pulse"/></div>)}</div>:
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{users.map(u=><div key={u.id} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5 relative group"><div className="flex items-center gap-3 mb-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${u.lockType===0?"bg-emerald-500/10":"bg-red-500/10"}`}><Shield className={`w-5 h-5 ${u.lockType===0?"text-emerald-400":"text-red-400"}`}/></div><div><h3 className="text-base font-semibold text-surface-50">{u.userName||u.loginName}</h3><p className="text-xs text-surface-500">@{u.loginName}</p></div></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-surface-500">Level</span><span className="text-surface-50">{LEVELS[u.level]||`L${u.level}`}</span></div><div className="flex justify-between"><span className="text-surface-500">Status</span><span className={u.lockType===0?"text-emerald-400":"text-red-400"}>{u.lockType===0?"Active":"Locked"}</span></div><div className="flex justify-between"><span className="text-surface-500">Expires</span><span className="text-surface-300 text-xs">{fmtTime(u.expireTime)}</span></div></div>
    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={() => openEdit(u)} className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5"/></button>
      <button onClick={() => handleDelete(u.id)} className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
    </div></div>)}</div>}

    {/* Add/Edit Modal */}
    {showModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
            <h2 className="text-lg font-semibold text-surface-50">{editingUser ? "Edit User" : "Add User"}</h2>
            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Login Name *</label><input value={form.loginName} onChange={e => setForm({...form, loginName: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Display Name</label><input value={form.userName} onChange={e => setForm({...form, userName: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
            </div>
            {!editingUser && <div><label className="block text-xs font-medium text-surface-400 mb-1">Password *</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Level</label><select value={form.level} onChange={e => setForm({...form, level: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>User</option><option value={1}>Admin</option><option value={2}>Super Admin</option><option value={3}>System</option></select></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={form.lockType} onChange={e => setForm({...form, lockType: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>Active</option><option value={1}>Locked</option></select></div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
            <button onClick={handleSave} disabled={!form.loginName || (!editingUser && !form.password) || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingUser ? "Update" : "Create"}</button>
          </div>
        </div>
      </div>
    )}
  </div>);
}
