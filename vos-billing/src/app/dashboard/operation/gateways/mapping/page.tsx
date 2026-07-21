"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { GitBranch, Search, RefreshCw, Server, Shield, Users, Plus, Edit2, Trash2, X, ArrowLeft } from "lucide-react";

interface MappingGateway {
  id: number;
  name: string;
  password: string;
  lockType: number;
  callLevel: number;
  capacity: number;
  priority: number;
  registerType: number;
  remoteIps: string;
  rtpForwardType: number;
  gatewayGroups: string;
  routingGatewayGroups: string;
  memo: string;
  customerId: number;
  mbxId: number;
  customerName: string | null;
}

const STATUS_LABELS: Record<number, string> = { 0: "Active", 1: "Locked" };

export default function MappingGatewayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedCustomerId = parseInt(searchParams.get("customer") || "0");
  const preselectedCustomerName = searchParams.get("name") || "";

  const [gateways, setGateways] = useState<MappingGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingGw, setEditingGw] = useState<MappingGateway | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", password:"", lockType:0, callLevel:0, capacity:0, priority:0, registerType:0, remoteIps:"", rtpForwardType:0, gatewayGroups:"", routingGatewayGroups:"", memo:"", customerId: preselectedCustomerId, mbxId:0 });

  const fetchGateways = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/vos/gateways/mapping?${params}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setGateways(data.gateways || []);
    } catch { setError("Failed to load mapping gateways"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGateways(); }, [search]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingGw ? `/api/vos/gateways/mapping/${editingGw.id}` : "/api/vos/gateways/mapping";
      const method = editingGw ? "PUT" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowModal(false); setEditingGw(null); fetchGateways();
    } catch { setError("Failed to save"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this mapping gateway?")) return;
    try { await fetch(`/api/vos/gateways/mapping/${id}`, { method: "DELETE" }); fetchGateways(); } catch {}
  };

  const openEdit = (g: MappingGateway) => {
    setEditingGw(g);
    setForm({ name:g.name, password:g.password, lockType:g.lockType, callLevel:g.callLevel, capacity:g.capacity, priority:g.priority, registerType:g.registerType, remoteIps:g.remoteIps, rtpForwardType:g.rtpForwardType, gatewayGroups:g.gatewayGroups, routingGatewayGroups:g.routingGatewayGroups, memo:g.memo||"", customerId:g.customerId, mbxId:g.mbxId });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingGw(null);
    setForm({ name:"", password:"", lockType:0, callLevel:0, capacity:0, priority:0, registerType:0, remoteIps:"", rtpForwardType:0, gatewayGroups:"", routingGatewayGroups:"", memo:"", customerId: preselectedCustomerId, mbxId:0 });
    setShowModal(true);
  };

  // Auto-open add modal if customer_id was preselected, then strip params
  useEffect(() => {
    if (preselectedCustomerId > 0) {
      setEditingGw(null);
      setForm({ name:"", password:"", lockType:0, callLevel:0, capacity:0, priority:0, registerType:0, remoteIps:"", rtpForwardType:0, gatewayGroups:"", routingGatewayGroups:"", memo:"", customerId: preselectedCustomerId, mbxId:0 });
      setShowModal(true);
      router.replace("/dashboard/operation/gateways/mapping");
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {preselectedCustomerName && (
              <button onClick={() => router.push("/dashboard/accounts/general")} className="p-1.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50" title="Back to accounts">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-surface-50">Mapping Gateway</h1>
          </div>
          <p className="text-surface-400 text-sm mt-1">
            {preselectedCustomerName ? (
              <>Customer: <span className="text-surface-50 font-medium">{preselectedCustomerName}</span> (ID: {preselectedCustomerId}) — Customer / Origination gateway management</>
            ) : (
              "Customer / Origination gateway management"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4"/>Add Gateway</button>
          <button onClick={fetchGateways} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.length}</p><p className="text-xs text-surface-400">Total Gateways</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.filter(g => g.lockType === 0).length}</p><p className="text-xs text-surface-400">Active</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.filter(g => g.customerName).length}</p><p className="text-xs text-surface-400">Has Customer</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by name or IP..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => (<div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-6"><div className="h-6 bg-surface-800 rounded w-32 mb-3 animate-pulse" /><div className="h-4 bg-surface-800 rounded w-48 mb-2 animate-pulse" /></div>))}</div>
      ) : gateways.length === 0 ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center text-surface-500"><GitBranch className="w-12 h-12 mx-auto mb-3 text-surface-600" /><p className="text-lg font-medium">No mapping gateways found</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gateways.map(g => (
            <div key={g.id} className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden hover:border-surface-600/50 transition-colors relative group">
              <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between">
                <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${g.lockType === 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}><GitBranch className={`w-5 h-5 ${g.lockType === 0 ? "text-emerald-400" : "text-red-400"}`} /></div><div><h3 className="text-base font-semibold text-surface-50">{g.name}</h3><p className="text-xs text-surface-500">ID: {g.id} | {g.customerName ? `Customer: ${g.customerName}` : "No customer"}</p></div></div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${g.lockType === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}><span className={`w-1.5 h-1.5 rounded-full ${g.lockType === 0 ? "bg-emerald-400" : "bg-red-400"}`} />{STATUS_LABELS[g.lockType] || "Unknown"}</span>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="text-surface-500 text-xs">Remote IPs</span><p className="text-surface-50 font-mono text-xs truncate" title={g.remoteIps}>{g.remoteIps || "—"}</p></div>
                <div><span className="text-surface-500 text-xs">Capacity</span><p className="text-surface-50">{g.capacity || "—"} calls</p></div>
                <div><span className="text-surface-500 text-xs">Priority</span><p className="text-surface-50">{g.priority}</p></div>
                <div><span className="text-surface-500 text-xs">Register Type</span><p className="text-surface-50">{g.registerType === 1 ? "Register" : "No Register"}</p></div>
                <div><span className="text-surface-500 text-xs">Gateway Group</span><p className="text-surface-50">{g.gatewayGroups || "—"}</p></div>
                <div><span className="text-surface-500 text-xs">Routing GW Groups</span><p className="text-surface-50 text-xs">{g.routingGatewayGroups || "—"}</p></div>
                <div className="col-span-2"><span className="text-surface-500 text-xs">Memo</span><p className="text-surface-50 text-xs">{g.memo || "—"}</p></div>
              </div>
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(g)} className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5"/></button>
                <button onClick={() => handleDelete(g.id)} className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <h2 className="text-lg font-semibold text-surface-50">{editingGw ? "Edit Mapping Gateway" : "Add Mapping Gateway"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Password</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Remote IPs</label><input value={form.remoteIps} onChange={e => setForm({...form, remoteIps: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Priority</label><input type="number" value={form.priority} onChange={e => setForm({...form, priority: parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Register Type</label><select value={form.registerType} onChange={e => setForm({...form, registerType: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>No Register</option><option value={1}>Register</option></select></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={form.lockType} onChange={e => setForm({...form, lockType: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>Active</option><option value={1}>Locked</option></select></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID</label><input type="number" value={form.customerId} onChange={e => setForm({...form, customerId: parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Gateway Groups</label><input value={form.gatewayGroups} onChange={e => setForm({...form, gatewayGroups: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e => setForm({...form, memo: e.target.value})} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none"/></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.name || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingGw ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
