"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { GitBranch, Search, RefreshCw, Server, Shield, Users, Plus, Edit2, Trash2, X, ArrowLeft, Download, Settings2, Route, Radio, Clock } from "lucide-react";
import DataTable from "@/components/DataTable";

interface MappingGateway {
  id: number;
  name: string;
  password: string;
  customerPassword: string;
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
  customerAccount: string;
  customerBalance: number;
  // Settings
  calloutCallerPrefixesAllow: number;
  calloutCallerPrefixes: string;
  calloutCalleePrefixesAllow: number;
  calloutCalleePrefixes: string;
  rewriteRulesOutCallee: string;
  rewriteRulesOutCaller: string;
  callerBlacklistPolicy: number;
  calleeBlacklistPolicy: number;
  calloutRoutingGateways: string;
  sipCodecs: string;
  h323Codecs: string;
  dtmfReceiveMethod: number;
  dtmfSendMethodSip: number;
  mediaCheckDirection: number;
  timeoutCallProceeding: number;
  maxCallDurationLower: number;
  maxCallDurationUpper: number;
  scheduledCalloutPrefixes: string;
  scheduledRewriteRulesOut: string;
  scheduledCapacity: string;
}

const LOCK_LABELS: Record<number, string> = { 0: "No Lock", 1: "Locked" };
const CALL_PERM_LABELS: Record<number, string> = { 0: "Domestic", 1: "International", 2: "All" };
const BL_LABELS: Record<number, string> = { 0: "White", 1: "Black", 2: "None" };
const RTP_LABELS: Record<number, string> = { 0: "Off", 1: "On", 2: "Auto" };

const TAB_LABELS = [
  { key: "general", label: "General", icon: Settings2 },
  { key: "outbound", label: "Outbound Rules", icon: Route },
  { key: "codec", label: "Codec & Media", icon: Radio },
  { key: "advanced", label: "Period/Advanced", icon: Clock },
] as const;
type TabKey = typeof TAB_LABELS[number]["key"];

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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const [form, setForm] = useState({
    name: "", password: "", customerPassword: "", lockType: 0, callLevel: 0,
    capacity: 0, priority: 0, registerType: 0, remoteIps: "", rtpForwardType: 0,
    gatewayGroups: "", routingGatewayGroups: "", memo: "",
    customerId: preselectedCustomerId, mbxId: 0,
    calloutCallerPrefixesAllow: 1, calloutCallerPrefixes: "",
    calloutCalleePrefixesAllow: 1, calloutCalleePrefixes: "",
    rewriteRulesOutCallee: "", rewriteRulesOutCaller: "",
    callerBlacklistPolicy: 0, calleeBlacklistPolicy: 0,
    calloutRoutingGateways: "",
    sipCodecs: "", h323Codecs: "",
    dtmfReceiveMethod: 0, dtmfSendMethodSip: 0,
    mediaCheckDirection: 0, timeoutCallProceeding: 30,
    maxCallDurationLower: 0, maxCallDurationUpper: 0,
    scheduledCalloutPrefixes: "", scheduledRewriteRulesOut: "", scheduledCapacity: "",
  });

  const fetchGateways = async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/vos/gateways/mapping?${params}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setGateways(data.gateways || []); setSelectedIds(new Set()); }
    } catch { setError("Failed to load mapping gateways"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGateways(); }, [search]);

  const resetForm = () => setForm({
    name: "", password: "", customerPassword: "", lockType: 0, callLevel: 0,
    capacity: 0, priority: 0, registerType: 0, remoteIps: "", rtpForwardType: 0,
    gatewayGroups: "", routingGatewayGroups: "", memo: "",
    customerId: preselectedCustomerId, mbxId: 0,
    calloutCallerPrefixesAllow: 1, calloutCallerPrefixes: "",
    calloutCalleePrefixesAllow: 1, calloutCalleePrefixes: "",
    rewriteRulesOutCallee: "", rewriteRulesOutCaller: "",
    callerBlacklistPolicy: 0, calleeBlacklistPolicy: 0,
    calloutRoutingGateways: "",
    sipCodecs: "", h323Codecs: "",
    dtmfReceiveMethod: 0, dtmfSendMethodSip: 0,
    mediaCheckDirection: 0, timeoutCallProceeding: 30,
    maxCallDurationLower: 0, maxCallDurationUpper: 0,
    scheduledCalloutPrefixes: "", scheduledRewriteRulesOut: "", scheduledCapacity: "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingGw ? `/api/vos/gateways/mapping/${editingGw.id}` : "/api/vos/gateways/mapping";
      const method = editingGw ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setShowModal(false); setEditingGw(null); setActiveTab("general"); fetchGateways(); }
    } catch { setError("Failed to save"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this mapping gateway?")) return;
    setDeletingIds(prev => new Set(prev).add(id));
    try { await fetch(`/api/vos/gateways/mapping/${id}`, { method: "DELETE" }); fetchGateways(); }
    catch { setError("Failed to delete"); }
    finally { setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  const openEdit = (g: MappingGateway) => {
    setEditingGw(g);
    setForm({
      name: g.name, password: g.password, customerPassword: g.customerPassword || "",
      lockType: g.lockType, callLevel: g.callLevel, capacity: g.capacity, priority: g.priority,
      registerType: g.registerType, remoteIps: g.remoteIps, rtpForwardType: g.rtpForwardType,
      gatewayGroups: g.gatewayGroups, routingGatewayGroups: g.routingGatewayGroups, memo: g.memo || "",
      customerId: g.customerId, mbxId: g.mbxId,
      calloutCallerPrefixesAllow: g.calloutCallerPrefixesAllow ?? 1,
      calloutCallerPrefixes: g.calloutCallerPrefixes || "",
      calloutCalleePrefixesAllow: g.calloutCalleePrefixesAllow ?? 1,
      calloutCalleePrefixes: g.calloutCalleePrefixes || "",
      rewriteRulesOutCallee: g.rewriteRulesOutCallee || "",
      rewriteRulesOutCaller: g.rewriteRulesOutCaller || "",
      callerBlacklistPolicy: g.callerBlacklistPolicy ?? 0,
      calleeBlacklistPolicy: g.calleeBlacklistPolicy ?? 0,
      calloutRoutingGateways: g.calloutRoutingGateways || "",
      sipCodecs: g.sipCodecs || "", h323Codecs: g.h323Codecs || "",
      dtmfReceiveMethod: g.dtmfReceiveMethod ?? 0,
      dtmfSendMethodSip: g.dtmfSendMethodSip ?? 0,
      mediaCheckDirection: g.mediaCheckDirection ?? 0,
      timeoutCallProceeding: g.timeoutCallProceeding ?? 30,
      maxCallDurationLower: g.maxCallDurationLower ?? 0,
      maxCallDurationUpper: g.maxCallDurationUpper ?? 0,
      scheduledCalloutPrefixes: g.scheduledCalloutPrefixes || "",
      scheduledRewriteRulesOut: g.scheduledRewriteRulesOut || "",
      scheduledCapacity: g.scheduledCapacity || "",
    });
    setActiveTab("general");
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingGw(null);
    resetForm();
    setActiveTab("general");
    setShowModal(true);
  };

  useEffect(() => {
    if (preselectedCustomerId > 0) {
      setEditingGw(null);
      resetForm();
      setShowModal(true);
      router.replace("/dashboard/operation/gateways/mapping");
    }
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(g => g.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected gateways?`)) return;
    for (const id of selectedIds) {
      try { await fetch(`/api/vos/gateways/mapping/${id}`, { method: "DELETE" }); } catch {}
    }
    setSelectedIds(new Set()); fetchGateways();
  };

  const exportCSV = () => {
    const rows = ["ID,Name,Customer,Remote IPs,Capacity,Priority,Register Type,Gateway Group,Routing GW Group,Call Perm,Status,Config Pwd,Self-Svc Pwd,Account,Balance,Memo", ...filtered.map(g => [
      g.id, `"${(g.name||"").replace(/"/g,'""')}"`, `"${(g.customerName||"").replace(/"/g,'""')}"`,
      `"${(g.remoteIps||"").replace(/"/g,'""')}"`, g.capacity, g.priority,
      g.registerType === 1 ? "Register" : "No Register", `"${(g.gatewayGroups||"").replace(/"/g,'""')}"`,
      `"${(g.routingGatewayGroups||"").replace(/"/g,'""')}"`, CALL_PERM_LABELS[g.callLevel] || "—",
      LOCK_LABELS[g.lockType] || "Unknown", g.password || "", g.customerPassword || "",
      g.customerAccount || "", g.customerBalance.toFixed(4), `"${(g.memo||"").replace(/"/g,'""')}"`
    ].join(","))].join("\n");
    const b = new Blob([rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "mapping_gateways.csv"; a.click();
  };

  const filtered = gateways.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || (g.remoteIps||"").includes(search) || (g.customerName||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400" title="Export CSV"><Download className="w-4 h-4" /></button>
          <button onClick={fetchGateways} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.length}</p><p className="text-xs text-surface-400">Total Gateways</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.filter(g => g.lockType === 0).length}</p><p className="text-xs text-surface-400">Active</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.filter(g => g.customerName).length}</p><p className="text-xs text-surface-400">Assigned</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><GitBranch className="w-5 h-5 text-amber-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.filter(g => g.callLevel !== 0).length}</p><p className="text-xs text-surface-400">International</p></div></div></div>
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by name, IP, or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>
        {selectedIds.size > 0 && (
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"><Trash2 className="w-4 h-4"/>Delete {selectedIds.size}</button>
        )}
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Full Table */}
      <DataTable
        idKey="id"
        selectedIds={selectedIds}
        onSelectToggle={toggleSelect}
        onSelectAllToggle={toggleSelectAll}
        columns={[
          { key: "name", label: "Gwy Name", render: (g: MappingGateway) => <span className="text-surface-50 font-medium whitespace-nowrap max-w-[120px] truncate block" title={g.name}>{g.name}</span> },
          { key: "lockType", label: "Lock", textAlign: "center" as const, render: (g: MappingGateway) => (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${g.lockType === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${g.lockType === 0 ? "bg-emerald-400" : "bg-red-400"}`} />
              {LOCK_LABELS[g.lockType] || "—"}
            </span>
          )},
          { key: "callLevel", label: "Call Perm", textAlign: "center" as const, render: (g: MappingGateway) => (
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${g.callLevel === 0 ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>
              {CALL_PERM_LABELS[g.callLevel] || `Lvl ${g.callLevel}`}
            </span>
          )},
          { key: "rtpForwardType", label: "Media", textAlign: "center" as const, render: (g: MappingGateway) => (
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${g.rtpForwardType === 2 ? "bg-violet-500/10 text-violet-400" : g.rtpForwardType === 1 ? "bg-emerald-500/10 text-emerald-400" : "bg-surface-800 text-surface-500"}`}>
              {RTP_LABELS[g.rtpForwardType] || "Off"}
            </span>
          )},
          { key: "gatewayGroups", label: "Gwy Group", render: (g: MappingGateway) => <span className="text-surface-300 whitespace-nowrap max-w-[100px] truncate block" title={g.gatewayGroups}>{g.gatewayGroups || "—"}</span> },
          { key: "capacity", label: "Limit", textAlign: "right" as const, render: (g: MappingGateway) => <span className="text-surface-300 tabular-nums">{g.capacity || "—"}</span> },
          { key: "routingGatewayGroups", label: "Rtg GW Group", render: (g: MappingGateway) => (
            g.routingGatewayGroups ? <span className="text-emerald-400">{g.routingGatewayGroups} <span className="text-[10px] text-surface-500">(allow)</span></span> : <span className="text-surface-300">—</span>
          )},
          { key: "memo", label: "Setting", render: (g: MappingGateway) => <span className="text-surface-300 max-w-[100px] truncate block" title={g.memo}>{g.memo || "—"}</span> },
          { key: "remoteIps", label: "IP", render: (g: MappingGateway) => <span className="text-surface-300 font-mono text-[10px] whitespace-nowrap max-w-[100px] truncate block" title={g.remoteIps}>{g.remoteIps || "—"}</span> },
          { key: "priority", label: "Priority", textAlign: "right" as const, render: (g: MappingGateway) => <span className="text-surface-300 tabular-nums">{g.priority}</span> },
          { key: "customerId", label: "Acct ID", textAlign: "right" as const, render: (g: MappingGateway) => <span className="text-surface-300 tabular-nums">{g.customerId || "—"}</span> },
          { key: "customerName", label: "Acct Name", render: (g: MappingGateway) => <span className="text-surface-300 whitespace-nowrap max-w-[100px] truncate block" title={g.customerName||""}>{g.customerName || "—"}</span> },
          { key: "password", label: "Cfg Pwd", render: (g: MappingGateway) => <span className="text-surface-300 font-mono text-[10px] max-w-[80px] truncate block" title={g.password}>{g.password || "—"}</span> },
          { key: "customerPassword", label: "Svc Pwd", render: (g: MappingGateway) => <span className="text-surface-300 font-mono text-[10px] max-w-[80px] truncate block" title={g.customerPassword}>{g.customerPassword || "—"}</span> },
          { key: "actions", label: "Act", textAlign: "center" as const, width: "5rem", render: (g: MappingGateway) => (
            <div className="flex items-center justify-center gap-0.5">
              <button onClick={() => openEdit(g)} className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50" title="Edit"><Edit2 className="w-3 h-3"/></button>
              <button onClick={() => handleDelete(g.id)} disabled={deletingIds.has(g.id)} className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400 disabled:opacity-50" title="Delete"><Trash2 className="w-3 h-3"/></button>
            </div>
          )},
        ]}
        data={gateways}
        loading={loading}
        emptyIcon={<GitBranch className="w-10 h-10 text-surface-600" />}
        emptyMessage="No mapping gateways found"
        emptySubtitle="Try searching by gateway name, IP address, or customer"
        pageSize={20}
      />

      {/* Add/Edit Modal — Tabbed */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 flex-shrink-0">
              <h2 className="text-lg font-semibold text-surface-50">{editingGw ? "Edit Mapping Gateway" : "Add Mapping Gateway"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-surface-800 flex-shrink-0 px-6">
              {TAB_LABELS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-brand-500 text-brand-400"
                      : "border-transparent text-surface-500 hover:text-surface-300"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* ── TAB 1: General ── */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Remote IPs</label><input value={form.remoteIps} onChange={e => setForm({ ...form, remoteIps: e.target.value })} placeholder="e.g. 1.2.3.4,5.6.7.8" className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono" /></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Config Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Self-Svc Password</label><input type="password" value={form.customerPassword} onChange={e => setForm({ ...form, customerPassword: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Priority</label><input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Media Proxy (RTP)</label>
                      <select value={form.rtpForwardType} onChange={e => setForm({ ...form, rtpForwardType: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none">
                        <option value={0}>Off</option><option value={1}>On</option><option value={2}>Auto</option>
                      </select>
                    </div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Register Type</label><select value={form.registerType} onChange={e => setForm({ ...form, registerType: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>No Register</option><option value={1}>Register</option></select></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Call Permission</label><select value={form.callLevel} onChange={e => setForm({ ...form, callLevel: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>Domestic</option><option value={1}>International</option><option value={2}>All</option></select></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={form.lockType} onChange={e => setForm({ ...form, lockType: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>Active</option><option value={1}>Locked</option></select></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID</label><input type="number" value={form.customerId} onChange={e => setForm({ ...form, customerId: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Gateway Groups</label><input value={form.gatewayGroups} onChange={e => setForm({ ...form, gatewayGroups: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-surface-400 mb-1">Routing Gateway Groups</label><input value={form.routingGatewayGroups} onChange={e => setForm({ ...form, routingGatewayGroups: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                  <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo / Notes</label><textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" /></div>
                </div>
              )}

              {/* ── TAB 2: Outbound Rules ── */}
              {activeTab === "outbound" && (
                <div className="space-y-5">
                  <div className="p-4 bg-surface-800/20 rounded-xl border border-surface-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-surface-100">Outbound Caller Prefixes</h3>
                      <select value={form.calloutCallerPrefixesAllow} onChange={e => setForm({ ...form, calloutCallerPrefixesAllow: parseInt(e.target.value) })} className="px-3 py-1.5 bg-surface-800 border border-surface-700/50 rounded-lg text-xs text-surface-50 focus:outline-none">
                        <option value={1}>Allow</option><option value={0}>Forbid</option>
                      </select>
                    </div>
                    <textarea value={form.calloutCallerPrefixes} onChange={e => setForm({ ...form, calloutCallerPrefixes: e.target.value })} placeholder="e.g. 1,44,91" rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div className="p-4 bg-surface-800/20 rounded-xl border border-surface-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-surface-100">Outbound Callee Prefixes</h3>
                      <select value={form.calloutCalleePrefixesAllow} onChange={e => setForm({ ...form, calloutCalleePrefixesAllow: parseInt(e.target.value) })} className="px-3 py-1.5 bg-surface-800 border border-surface-700/50 rounded-lg text-xs text-surface-50 focus:outline-none">
                        <option value={1}>Allow</option><option value={0}>Forbid</option>
                      </select>
                    </div>
                    <textarea value={form.calloutCalleePrefixes} onChange={e => setForm({ ...form, calloutCalleePrefixes: e.target.value })} placeholder="e.g. 1,44,91" rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Caller BL/WL</label>
                      <select value={form.callerBlacklistPolicy} onChange={e => setForm({ ...form, callerBlacklistPolicy: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none">
                        <option value={2}>None</option><option value={0}>White List</option><option value={1}>Black List</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Callee BL/WL</label>
                      <select value={form.calleeBlacklistPolicy} onChange={e => setForm({ ...form, calleeBlacklistPolicy: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none">
                        <option value={2}>None</option><option value={0}>White List</option><option value={1}>Black List</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Rewrite Out Callee (Dial Plan)</label>
                    <textarea value={form.rewriteRulesOutCallee} onChange={e => setForm({ ...form, rewriteRulesOutCallee: e.target.value })} placeholder="Rewrite rules for outbound callee" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Rewrite Out Caller (Dial Plan)</label>
                    <textarea value={form.rewriteRulesOutCaller} onChange={e => setForm({ ...form, rewriteRulesOutCaller: e.target.value })} placeholder="Rewrite rules for outbound caller" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Callout Routing Gateways</label>
                    <input value={form.calloutRoutingGateways} onChange={e => setForm({ ...form, calloutRoutingGateways: e.target.value })} placeholder="e.g. gw1,gw2" className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono" />
                  </div>
                </div>
              )}

              {/* ── TAB 3: Codec & Media ── */}
              {activeTab === "codec" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">SIP Codecs</label>
                    <textarea value={form.sipCodecs} onChange={e => setForm({ ...form, sipCodecs: e.target.value })} placeholder="e.g. g729;g723;g726;g711u;g711a;ilbc" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">H323 Codecs</label>
                    <textarea value={form.h323Codecs} onChange={e => setForm({ ...form, h323Codecs: e.target.value })} placeholder="e.g. g729;g723;g726;g711u;g711a" rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">DTMF Receive Method</label>
                      <select value={form.dtmfReceiveMethod} onChange={e => setForm({ ...form, dtmfReceiveMethod: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none">
                        <option value={0}>RFC 2833</option><option value={1}>SIP INFO</option><option value={2}>Inband</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">DTMF Send Method (SIP)</label>
                      <select value={form.dtmfSendMethodSip} onChange={e => setForm({ ...form, dtmfSendMethodSip: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none">
                        <option value={0}>RFC 2833</option><option value={1}>SIP INFO</option><option value={2}>Inband</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Media Check Direction</label>
                      <select value={form.mediaCheckDirection} onChange={e => setForm({ ...form, mediaCheckDirection: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none">
                        <option value={0}>Disabled</option><option value={1}>Caller→Callee</option><option value={2}>Callee→Caller</option><option value={3}>Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Timeout Call Proceeding (s)</label>
                      <input type="number" value={form.timeoutCallProceeding} onChange={e => setForm({ ...form, timeoutCallProceeding: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Max Call Duration Lower (s)</label>
                      <input type="number" value={form.maxCallDurationLower} onChange={e => setForm({ ...form, maxCallDurationLower: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Max Call Duration Upper (s)</label>
                      <input type="number" value={form.maxCallDurationUpper} onChange={e => setForm({ ...form, maxCallDurationUpper: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: Period/Advanced ── */}
              {activeTab === "advanced" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Period Dial Plan (scheduled callout prefixes)</label>
                    <textarea value={form.scheduledCalloutPrefixes} onChange={e => setForm({ ...form, scheduledCalloutPrefixes: e.target.value })} placeholder="Time-based prefix routing" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Period Rewrite Rules (scheduled rewrite out)</label>
                    <textarea value={form.scheduledRewriteRulesOut} onChange={e => setForm({ ...form, scheduledRewriteRulesOut: e.target.value })} placeholder="Time-based rewrite rules" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Period Capacity (scheduled)</label>
                    <textarea value={form.scheduledCapacity} onChange={e => setForm({ ...form, scheduledCapacity: e.target.value })} placeholder="Time-based capacity schedule" rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                    <p className="text-[10px] text-surface-600 mt-1">Format: time range and capacity, e.g. 08:00-18:00=100,18:00-08:00=50</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.name || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingGw ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
