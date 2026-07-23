"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeftRight, Search, RefreshCw, Plus, Edit2, Trash2, X, ArrowLeft, Settings2, Route, Clock, Radio } from "lucide-react";
import DataTable from "@/components/DataTable";

interface RoutingGateway {
  id: number;
  name: string;
  prefix: string;
  prefixStyle: number;
  password: string;
  customerPassword: string;
  lockType: number;
  callLevel: number;
  capacity: number;
  priority: number;
  protocol: string;
  remoteIps: string;
  rtpForwardType: number;
  gatewayGroups: string;
  memo: string;
  clearingCustomerId: number;
  clearingName: string;
  clearingAccount: string;
  clearingBalance: number;
  clearingLimit: number;
  rewriteInCallee: string | null;
  rewriteInCaller: string | null;
  sipCodecs: string | null;
  h323Codecs: string | null;
  timeoutInvite: number;
  timeoutRinging: number;
  callerBlacklistPolicy: number;
  calleeBlacklistPolicy: number;
  callerPrefixesAllow: number;
  callerPrefixes: string;
  calleePrefixesAllow: number;
  calleePrefixes: string;
  forwardingPrefixes: string;
  denyCallerCallee: string;
  scheduledCapacity: string;
  scheduledPriority: string;
  scheduledCallinPrefixes: string;
  scheduledRewriteRulesIn: string;
  mappingGatewayNames: string;
}

const PREFIX_MODE_LABELS: Record<number, string> = { 0: "Prefix", 1: "Prefix+", 2: "E.164" };
const LOCK_LABELS: Record<number, string> = { 0: "No Lock", 1: "Bar All Call" };
const BL_LABELS: Record<number, string> = { 0: "White", 1: "Black", 2: "None" };
const RTP_LABELS: Record<number, string> = { 0: "Off", 1: "On", 2: "Auto" };

const TAB_LABELS = [
  { key: "general", label: "General", icon: Settings2 },
  { key: "routing", label: "Routing Rules", icon: Route },
  { key: "period", label: "Period/Capacity", icon: Clock },
  { key: "codec", label: "Codec", icon: Radio },
] as const;
type TabKey = typeof TAB_LABELS[number]["key"];

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
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [editingMediaId, setEditingMediaId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "", prefix: "", password: "", customerPassword: "",
    lockType: 0, capacity: 0, priority: 0, remoteIps: "",
    rtpForwardType: 0, gatewayGroups: "", memo: "",
    clearingCustomerId: preselectedCustomerId,
    // Tab 2: Routing Rules
    callerPrefixesAllow: 1, callerPrefixes: "",
    calleePrefixesAllow: 1, calleePrefixes: "",
    forwardingPrefixes: "",
    callerBlacklistPolicy: 0, calleeBlacklistPolicy: 0,
    rewriteRulesInCaller: "", rewriteRulesInCallee: "",
    denyCallerCallee: "",
    // Tab 3: Period/Capacity
    scheduledCapacity: "", scheduledPriority: "",
    scheduledCallinPrefixes: "", scheduledRewriteRulesIn: "",
    // Tab 4: Codec
    sipCodecs: "", h323Codecs: "",
    timeoutInvite: 30, timeoutRinging: 60,
  });

  const fetchGateways = async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/vos/gateways/routing?${params}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setGateways(data.gateways || []); setSelectedIds(new Set()); }
    } catch { setError("Failed to load routing gateways"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGateways(); }, [search]);

  const resetForm = () => setForm({
    name: "", prefix: "", password: "", customerPassword: "",
    lockType: 0, capacity: 0, priority: 0, remoteIps: "",
    rtpForwardType: 0, gatewayGroups: "", memo: "",
    clearingCustomerId: preselectedCustomerId,
    callerPrefixesAllow: 1, callerPrefixes: "",
    calleePrefixesAllow: 1, calleePrefixes: "",
    forwardingPrefixes: "",
    callerBlacklistPolicy: 0, calleeBlacklistPolicy: 0,
    rewriteRulesInCaller: "", rewriteRulesInCallee: "",
    denyCallerCallee: "",
    scheduledCapacity: "", scheduledPriority: "",
    scheduledCallinPrefixes: "", scheduledRewriteRulesIn: "",
    sipCodecs: "", h323Codecs: "",
    timeoutInvite: 30, timeoutRinging: 60,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingGw ? `/api/vos/gateways/routing/${editingGw.id}` : "/api/vos/gateways/routing";
      const method = editingGw ? "PUT" : "POST";
      const body: any = { ...form };
      // For POST, also send prefixStyle / protocol
      if (!editingGw) {
        body.prefixStyle = 0;
        body.protocol = "0";
      }
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setShowModal(false); setEditingGw(null); setActiveTab("general"); fetchGateways();
    } catch { setError("Failed to save"); } finally { setSaving(false); }
  };

  const quickUpdateMedia = async (gwId: number, newVal: number) => {
    const prevVal = gateways.find(g => g.id === gwId)?.rtpForwardType;
    // Optimistic update
    setGateways(prev => prev.map(g => g.id === gwId ? { ...g, rtpForwardType: newVal } : g));
    try {
      // Send full gateway object to avoid overwriting other fields
      const full = gateways.find(g => g.id === gwId);
      if (!full) return;
      await fetch(`/api/vos/gateways/routing/${gwId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: full.name, prefix: full.prefix, password: full.password, customerPassword: full.customerPassword,
          lockType: full.lockType, callLevel: full.callLevel, capacity: full.capacity, priority: full.priority,
          remoteIps: full.remoteIps, rtpForwardType: newVal, gatewayGroups: full.gatewayGroups, memo: full.memo,
          clearingCustomerId: full.clearingCustomerId,
          callerPrefixesAllow: full.callerPrefixesAllow, callerPrefixes: full.callerPrefixes,
          calleePrefixesAllow: full.calleePrefixesAllow, calleePrefixes: full.calleePrefixes,
          forwardingPrefixes: full.forwardingPrefixes,
          callerBlacklistPolicy: full.callerBlacklistPolicy, calleeBlacklistPolicy: full.calleeBlacklistPolicy,
          rewriteRulesInCaller: full.rewriteInCaller, rewriteRulesInCallee: full.rewriteInCallee,
          denyCallerCallee: full.denyCallerCallee,
          scheduledCapacity: full.scheduledCapacity, scheduledPriority: full.scheduledPriority,
          scheduledCallinPrefixes: full.scheduledCallinPrefixes, scheduledRewriteRulesIn: full.scheduledRewriteRulesIn,
          sipCodecs: full.sipCodecs, h323Codecs: full.h323Codecs,
          timeoutInvite: full.timeoutInvite, timeoutRinging: full.timeoutRinging,
        }),
      });
    } catch {
      // Revert on failure
      setGateways(prev => prev.map(g => g.id === gwId ? { ...g, rtpForwardType: prevVal ?? 0 } : g));
      setError("Failed to update Media Proxy");
    }
    setEditingMediaId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this routing gateway?")) return;
    setDeletingIds(prev => new Set(prev).add(id));
    try { await fetch(`/api/vos/gateways/routing/${id}`, { method: "DELETE" }); fetchGateways(); }
    catch { setError("Failed to delete"); }
    finally { setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  const openEdit = (g: RoutingGateway) => {
    setEditingGw(g);
    setForm({
      name: g.name, prefix: g.prefix || "", password: g.password || "", customerPassword: g.customerPassword || "",
      lockType: g.lockType, capacity: g.capacity, priority: g.priority, remoteIps: g.remoteIps || "",
      rtpForwardType: g.rtpForwardType ?? 0, gatewayGroups: g.gatewayGroups || "", memo: g.memo || "",
      clearingCustomerId: g.clearingCustomerId,
      callerPrefixesAllow: g.callerPrefixesAllow ?? 1, callerPrefixes: g.callerPrefixes || "",
      calleePrefixesAllow: g.calleePrefixesAllow ?? 1, calleePrefixes: g.calleePrefixes || "",
      forwardingPrefixes: g.forwardingPrefixes || "",
      callerBlacklistPolicy: g.callerBlacklistPolicy ?? 0, calleeBlacklistPolicy: g.calleeBlacklistPolicy ?? 0,
      rewriteRulesInCaller: g.rewriteInCaller || "", rewriteRulesInCallee: g.rewriteInCallee || "",
      denyCallerCallee: g.denyCallerCallee || "",
      scheduledCapacity: g.scheduledCapacity || "", scheduledPriority: g.scheduledPriority || "",
      scheduledCallinPrefixes: g.scheduledCallinPrefixes || "", scheduledRewriteRulesIn: g.scheduledRewriteRulesIn || "",
      sipCodecs: g.sipCodecs || "", h323Codecs: g.h323Codecs || "",
      timeoutInvite: g.timeoutInvite ?? 30, timeoutRinging: g.timeoutRinging ?? 60,
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
      router.replace("/dashboard/operation/gateways/routing");
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
    setError("");
    for (const id of selectedIds) {
      try { await fetch(`/api/vos/gateways/routing/${id}`, { method: "DELETE" }); } catch {}
    }
    setSelectedIds(new Set());
    fetchGateways();
  };

  const filtered = gateways.filter(g =>
    (g.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (g.prefix || "").includes(search) ||
    (g.remoteIps || "").includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Gateway</button>
          <button onClick={fetchGateways} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-surface-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-surface-50">{gateways.length}</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-surface-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{gateways.filter(g => g.lockType === 0).length}</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-surface-500 mb-1">Bar All Call</p>
          <p className="text-2xl font-bold text-red-400">{gateways.filter(g => g.lockType === 1).length}</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-surface-500 mb-1">Has IP</p>
          <p className="text-2xl font-bold text-violet-400">{gateways.filter(g => g.remoteIps).length}</p>
        </div>
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input type="text" placeholder="Search by name, prefix, or IP..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
        </div>
        {selectedIds.size > 0 && (
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" />Delete {selectedIds.size}
          </button>
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
          { key: "name", label: "Gw Name", render: (g: RoutingGateway) => <span className="text-surface-50 font-medium whitespace-nowrap max-w-[120px] truncate block" title={g.name}>{g.name}</span> },
          { key: "prefix", label: "Prefix", render: (g: RoutingGateway) => <span className="text-surface-300 font-mono whitespace-nowrap">{g.prefix || "—"}</span> },
          { key: "prefixStyle", label: "Mode", textAlign: "center" as const, render: (g: RoutingGateway) => <span className="text-surface-300">{PREFIX_MODE_LABELS[g.prefixStyle] || "—"}</span> },
          { key: "gatewayGroups", label: "Gw Group", render: (g: RoutingGateway) => <span className="text-surface-300 whitespace-nowrap max-w-[100px] truncate block" title={g.gatewayGroups}>{g.gatewayGroups || "—"}</span> },
          { key: "mappingGatewayNames", label: "Mapping GW", render: (g: RoutingGateway) => (
            g.mappingGatewayNames ? (
              <span className={g.callerPrefixesAllow === 1 ? "text-emerald-400" : "text-amber-400"}>
                {g.mappingGatewayNames}
                <span className="text-[10px] ml-1 text-surface-500">({g.callerPrefixesAllow === 1 ? "allow" : "forbid"})</span>
              </span>
            ) : <span className="text-surface-300">—</span>
          )},
          { key: "rtpForwardType", label: "Media", textAlign: "center" as const, render: (g: RoutingGateway) => (
            editingMediaId === g.id ? (
              <select
                value={g.rtpForwardType}
                onChange={e => quickUpdateMedia(g.id, parseInt(e.target.value))}
                onBlur={() => setEditingMediaId(null)}
                autoFocus
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-800 border border-brand-500/50 text-surface-50 focus:outline-none cursor-pointer"
              >
                <option value={0}>Off</option>
                <option value={1}>On</option>
                <option value={2}>Auto</option>
              </select>
            ) : (
              <button
                onClick={() => setEditingMediaId(g.id)}
                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium hover:opacity-80 cursor-pointer transition-opacity ${g.rtpForwardType === 2 ? "bg-violet-500/10 text-violet-400" : g.rtpForwardType === 1 ? "bg-emerald-500/10 text-emerald-400" : "bg-surface-800 text-surface-500"}`}
                title="Click to change Media Proxy"
              >
                {RTP_LABELS[g.rtpForwardType] || "Off"}
              </button>
            )
          )},
          { key: "lockType", label: "Lock", textAlign: "center" as const, render: (g: RoutingGateway) => (
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${g.lockType === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {LOCK_LABELS[g.lockType] || "—"}
            </span>
          )},
          { key: "capacity", label: "Limit", textAlign: "right" as const, render: (g: RoutingGateway) => <span className="text-surface-300 tabular-nums">{g.capacity || "—"}</span> },
          { key: "priority", label: "Priority", textAlign: "right" as const, render: (g: RoutingGateway) => <span className="text-surface-300 tabular-nums">{g.priority}</span> },
          { key: "remoteIps", label: "IP", render: (g: RoutingGateway) => <span className="text-surface-300 font-mono text-[10px] whitespace-nowrap max-w-[100px] truncate block" title={g.remoteIps}>{g.remoteIps || "—"}</span> },
          { key: "password", label: "Config Pwd", render: (g: RoutingGateway) => <span className="text-surface-300 font-mono text-[10px] max-w-[80px] truncate block" title={g.password}>{g.password || "—"}</span> },
          { key: "customerPassword", label: "Self-Svc Pwd", render: (g: RoutingGateway) => <span className="text-surface-300 font-mono text-[10px] max-w-[80px] truncate block" title={g.customerPassword}>{g.customerPassword || "—"}</span> },
          { key: "callerBlacklistPolicy", label: "Caller BL/WL", textAlign: "center" as const, render: (g: RoutingGateway) => (
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${g.callerBlacklistPolicy === 0 ? "bg-emerald-500/10 text-emerald-400" : g.callerBlacklistPolicy === 1 ? "bg-red-500/10 text-red-400" : "bg-surface-800 text-surface-500"}`}>
              {BL_LABELS[g.callerBlacklistPolicy] || "None"}
            </span>
          )},
          { key: "calleeBlacklistPolicy", label: "Callee BL/WL", textAlign: "center" as const, render: (g: RoutingGateway) => (
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${g.calleeBlacklistPolicy === 0 ? "bg-emerald-500/10 text-emerald-400" : g.calleeBlacklistPolicy === 1 ? "bg-red-500/10 text-red-400" : "bg-surface-800 text-surface-500"}`}>
              {BL_LABELS[g.calleeBlacklistPolicy] || "None"}
            </span>
          )},
          { key: "clearingName", label: "Acct Name", render: (g: RoutingGateway) => <span className="text-surface-300 whitespace-nowrap max-w-[100px] truncate block" title={g.clearingName}>{g.clearingName || "—"}</span> },
          { key: "clearingBalance", label: "Balance", textAlign: "right" as const, render: (g: RoutingGateway) => (
            <span className={`font-mono tabular-nums ${g.clearingBalance < 0 ? "text-red-400" : g.clearingBalance > 0 ? "text-emerald-400" : "text-surface-300"}`}>
              ${g.clearingBalance.toFixed(4)}
            </span>
          )},
          { key: "billing", label: "Billing #", render: (g: RoutingGateway) => (
            g.rewriteInCallee ? (
              <span className="text-surface-300 text-[10px] whitespace-nowrap">
                <span className="text-brand-400">pre:</span>{g.rewriteInCallee}
                {g.rewriteInCaller && <><span className="text-surface-600 mx-0.5">|</span><span className="text-amber-400">post:</span>{g.rewriteInCaller}</>}
              </span>
            ) : <span className="text-surface-300">—</span>
          )},
          { key: "actions", label: "Act", textAlign: "center" as const, width: "5rem", render: (g: RoutingGateway) => (
            <div className="flex items-center justify-center gap-0.5">
              <button onClick={() => openEdit(g)} className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50" title="Edit"><Edit2 className="w-3 h-3" /></button>
              <button onClick={() => handleDelete(g.id)} disabled={deletingIds.has(g.id)} className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400 disabled:opacity-50" title="Delete"><Trash2 className="w-3 h-3" /></button>
            </div>
          )},
        ]}
        data={gateways}
        loading={loading}
        emptyIcon={<ArrowLeftRight className="w-10 h-10 text-surface-600" />}
        emptyMessage="No routing gateways found"
        emptySubtitle="Try searching by name, prefix, or IP address"
        pageSize={20}
      />

      {/* Add/Edit Modal — Tabbed */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 flex-shrink-0">
              <h2 className="text-lg font-semibold text-surface-50">{editingGw ? "Edit Routing Gateway" : "Add Routing Gateway"}</h2>
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
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Prefix</label><input value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div className="col-span-2"><label className="block text-xs font-medium text-surface-400 mb-1">Remote IPs</label><input value={form.remoteIps} onChange={e => setForm({ ...form, remoteIps: e.target.value })} placeholder="e.g. 1.2.3.4,5.6.7.8" className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono" /></div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Media Proxy</label>
                      <select value={form.rtpForwardType} onChange={e => setForm({ ...form, rtpForwardType: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none">
                        <option value={0}>Off</option><option value={1}>On</option><option value={2}>Auto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Status</label>
                      <select value={form.lockType} onChange={e => setForm({ ...form, lockType: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none">
                        <option value={0}>No Lock</option><option value={1}>Bar All Call</option>
                      </select>
                    </div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Priority</label><input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Config Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                    <div><label className="block text-xs font-medium text-surface-400 mb-1">Self-Svc Password</label><input type="password" value={form.customerPassword} onChange={e => setForm({ ...form, customerPassword: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-surface-400 mb-1">Gateway Groups</label><input value={form.gatewayGroups} onChange={e => setForm({ ...form, gatewayGroups: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                  <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo / Notes</label><textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" /></div>
                </div>
              )}

              {/* ── TAB 2: Routing Rules ── */}
              {activeTab === "routing" && (
                <div className="space-y-5">
                  {/* Caller Prefixes */}
                  <div className="p-4 bg-surface-800/20 rounded-xl border border-surface-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-surface-100">Caller Prefixes</h3>
                      <select value={form.callerPrefixesAllow} onChange={e => setForm({ ...form, callerPrefixesAllow: parseInt(e.target.value) })} className="px-3 py-1.5 bg-surface-800 border border-surface-700/50 rounded-lg text-xs text-surface-50 focus:outline-none">
                        <option value={1}>Allow</option><option value={0}>Forbid</option>
                      </select>
                    </div>
                    <textarea value={form.callerPrefixes} onChange={e => setForm({ ...form, callerPrefixes: e.target.value })} placeholder="e.g. 1,44,91" rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>

                  {/* Callee Prefixes */}
                  <div className="p-4 bg-surface-800/20 rounded-xl border border-surface-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-surface-100">Routing Callee Prefixes (Allow/Forbid)</h3>
                      <select value={form.calleePrefixesAllow} onChange={e => setForm({ ...form, calleePrefixesAllow: parseInt(e.target.value) })} className="px-3 py-1.5 bg-surface-800 border border-surface-700/50 rounded-lg text-xs text-surface-50 focus:outline-none">
                        <option value={1}>Allow</option><option value={0}>Forbid</option>
                      </select>
                    </div>
                    <textarea value={form.calleePrefixes} onChange={e => setForm({ ...form, calleePrefixes: e.target.value })} placeholder="e.g. 1,44,91" rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>

                  {/* Forwarding Prefixes */}
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Forwarding Prefixes</label>
                    <textarea value={form.forwardingPrefixes} onChange={e => setForm({ ...form, forwardingPrefixes: e.target.value })} placeholder="e.g. 00" rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>

                  {/* Call/Route Restriction */}
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

                  {/* Dial Plans */}
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Routing Caller Dial Plan (Rewrite In Caller)</label>
                    <textarea value={form.rewriteRulesInCaller} onChange={e => setForm({ ...form, rewriteRulesInCaller: e.target.value })} placeholder="Rewrite rules for caller number" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Routing Callee Dial Plan (Rewrite In Callee)</label>
                    <textarea value={form.rewriteRulesInCallee} onChange={e => setForm({ ...form, rewriteRulesInCallee: e.target.value })} placeholder="Rewrite rules for callee number" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>

                  {/* Deny Caller-Callee */}
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Deny Caller-Callee (same city codes)</label>
                    <input value={form.denyCallerCallee} onChange={e => setForm({ ...form, denyCallerCallee: e.target.value })} placeholder="e.g. 1,44" className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono" />
                  </div>
                </div>
              )}

              {/* ── TAB 3: Period/Capacity ── */}
              {activeTab === "period" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Period Capacity (scheduled)</label>
                    <textarea value={form.scheduledCapacity} onChange={e => setForm({ ...form, scheduledCapacity: e.target.value })} placeholder="Time-based capacity schedule" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                    <p className="text-[10px] text-surface-600 mt-1">Format: time range and capacity, e.g. 08:00-18:00=100,18:00-08:00=50</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Period Priority (scheduled)</label>
                    <textarea value={form.scheduledPriority} onChange={e => setForm({ ...form, scheduledPriority: e.target.value })} placeholder="Time-based priority schedule" rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Period Dial Plan (scheduled callin prefixes)</label>
                    <textarea value={form.scheduledCallinPrefixes} onChange={e => setForm({ ...form, scheduledCallinPrefixes: e.target.value })} placeholder="Time-based prefix routing" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">Period Call Restriction (scheduled rewrite rules)</label>
                    <textarea value={form.scheduledRewriteRulesIn} onChange={e => setForm({ ...form, scheduledRewriteRulesIn: e.target.value })} placeholder="Time-based rewrite rules" rows={3} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono resize-none" />
                  </div>
                </div>
              )}

              {/* ── TAB 4: Codec ── */}
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
                      <label className="block text-xs font-medium text-surface-400 mb-1">Timeout Invite (s)</label>
                      <input type="number" value={form.timeoutInvite} onChange={e => setForm({ ...form, timeoutInvite: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">Timeout Ringing (s)</label>
                      <input type="number" value={form.timeoutRinging} onChange={e => setForm({ ...form, timeoutRinging: parseInt(e.target.value) || 60 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
                    </div>
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
