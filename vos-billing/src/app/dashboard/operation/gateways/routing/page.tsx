"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeftRight, Search, RefreshCw, Server, Shield, Wifi, Plus, Edit2, Trash2, X, ArrowLeft } from "lucide-react";

interface RoutingGateway {
  id: number; name: string; prefix: string; prefixStyle: number; lockType: number; callLevel: number; capacity: number; priority: number; ipType: number; encrypt: number; protocol: string; remoteIps: string; rtpForwardType: number; signalPort: number; signalPortLocal: number; gatewayGroups: string; memo: string; mbxId: number; clearingCustomerId: number; rewriteInCallee: string | null; rewriteInCaller: string | null; sipCodecs: string | null; timeoutInvite: number; timeoutRinging: number; settingCapacity: number;
}

const STATUS_LABELS: Record<number, string> = { 0: "Active", 1: "Locked" };
const PROTOCOL_LABELS: Record<string, string> = { "0": "SIP", "1": "H.323", "2": "IAX2" };

export default function RoutingGatewayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedCustomerId = parseInt(searchParams.get("customer") || "0");
  const preselectedCustomerName = searchParams.get("name") || "";

  const [gateways, setGateways] = useState<RoutingGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingGw, setEditingGw] = useState<RoutingGateway | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", prefix:"", protocol:"0", lockType:0, capacity:0, priority:0, remoteIps:"", signalPort:5060, gatewayGroups:"", memo:"", encrypt:0, callLevel:0, clearingCustomerId: preselectedCustomerId });

  const fetchGateways = async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/vos/gateways/routing?${params}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setGateways(data.gateways || []);
    } catch { setError("Failed to load routing gateways"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGateways(); }, [search]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingGw ? `/api/vos/gateways/routing/${editingGw.id}` : "/api/vos/gateways/routing";
      const method = editingGw ? "PUT" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowModal(false); setEditingGw(null); fetchGateways();
    } catch { setError("Failed to save"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this routing gateway?")) return;
    try { await fetch(`/api/vos/gateways/routing/${id}`, { method: "DELETE" }); fetchGateways(); } catch {}
  };

  const openEdit = (g: RoutingGateway) => {
    setEditingGw(g);
    setForm({ name:g.name, prefix:g.prefix||"", protocol:g.protocol, lockType:g.lockType, capacity:g.capacity, priority:g.priority, remoteIps:g.remoteIps||"", signalPort:g.signalPort||5060, gatewayGroups:g.gatewayGroups||"", memo:g.memo||"", encrypt:g.encrypt, callLevel:g.callLevel, clearingCustomerId:g.clearingCustomerId });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingGw(null);
    setForm({ name:"", prefix:"", protocol:"0", lockType:0, capacity:0, priority:0, remoteIps:"", signalPort:5060, gatewayGroups:"", memo:"", encrypt:0, callLevel:0, clearingCustomerId: preselectedCustomerId });
    setShowModal(true);
  };

  useEffect(() => {
    if (preselectedCustomerId > 0) {
      setEditingGw(null);
      setForm({ name:"", prefix:"", protocol:"0", lockType:0, capacity:0, priority:0, remoteIps:"", signalPort:5060, gatewayGroups:"", memo:"", encrypt:0, callLevel:0, clearingCustomerId: preselectedCustomerId });
      setShowModal(true);
      router.replace("/dashboard/operation/gateways/routing");
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
            <h1 className="text-2xl font-bold text-surface-50">Routing Gateway</h1>
          </div>
          <p className="text-surface-400 text-sm mt-1">
            {preselectedCustomerName ? (
              <>Supplier: <span className="text-surface-50 font-medium">{preselectedCustomerName}</span> (ID: {preselectedCustomerId}) — Supplier / Clearing gateway management</>
            ) : (
              "Supplier / Clearing gateway management"
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
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.filter((g) => g.lockType === 0).length}</p><p className="text-xs text-surface-400">Active</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Wifi className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.filter((g) => g.remoteIps).length}</p><p className="text-xs text-surface-400">Has Remote IP</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by name, prefix, or IP..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-6"><div className="h-6 bg-surface-800 rounded w-32 mb-3 animate-pulse" /><div className="h-4 bg-surface-800 rounded w-48 mb-2 animate-pulse" /><div className="h-4 bg-surface-800 rounded w-24 animate-pulse" /></div>))}</div>
      ) : gateways.length === 0 ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center text-surface-500"><ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-surface-600" /><p className="text-lg font-medium">No routing gateways found</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gateways.map((g) => (
            <div key={g.id} className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden hover:border-surface-600/50 transition-colors relative group">
              <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between">
                <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${g.lockType === 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}><ArrowLeftRight className={`w-5 h-5 ${g.lockType === 0 ? "text-emerald-400" : "text-red-400"}`} /></div><div><h3 className="text-base font-semibold text-surface-50">{g.name}</h3><p className="text-xs text-surface-500">ID: {g.id} | Priority: {g.priority}</p></div></div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${g.lockType === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}><span className={`w-1.5 h-1.5 rounded-full ${g.lockType === 0 ? "bg-emerald-400" : "bg-red-400"}`} />{STATUS_LABELS[g.lockType] || "Unknown"}</span>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="text-surface-500 text-xs">Prefix</span><p className="text-surface-50 font-mono">{g.prefix || "—"}</p></div>
                <div><span className="text-surface-500 text-xs">Protocol</span><p className="text-surface-50">{PROTOCOL_LABELS[g.protocol] || `Type ${g.protocol}`}</p></div>
                <div><span className="text-surface-500 text-xs">Remote IPs</span><p className="text-surface-50 font-mono text-xs truncate" title={g.remoteIps}>{g.remoteIps || "—"}</p></div>
                <div><span className="text-surface-500 text-xs">Signal Port</span><p className="text-surface-50 font-mono">{g.signalPort || "—"}</p></div>
                <div><span className="text-surface-500 text-xs">Capacity</span><p className="text-surface-50">{g.capacity || "—"} calls</p></div>
                <div><span className="text-surface-500 text-xs">Gateway Group</span><p className="text-surface-50">{g.gatewayGroups || "—"}</p></div>
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
              <h2 className="text-lg font-semibold text-surface-50">{editingGw ? "Edit Routing Gateway" : "Add Routing Gateway"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Prefix</label><input value={form.prefix} onChange={e => setForm({...form, prefix: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Protocol</label><select value={form.protocol} onChange={e => setForm({...form, protocol: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value="0">SIP</option><option value="1">H.323</option><option value="2">IAX2</option></select></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Remote IPs</label><input value={form.remoteIps} onChange={e => setForm({...form, remoteIps: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Signal Port</label><input type="number" value={form.signalPort} onChange={e => setForm({...form, signalPort: parseInt(e.target.value)||5060})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Priority</label><input type="number" value={form.priority} onChange={e => setForm({...form, priority: parseInt(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={form.lockType} onChange={e => setForm({...form, lockType: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>Active</option><option value={1}>Locked</option></select></div>
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
