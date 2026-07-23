"use client";

import { useState, useEffect } from "react";
import { Shield, Search, RefreshCw, Globe, Plus, Trash2, X, Download, CheckSquare, ShieldOff, ShieldCheck, ArrowRightLeft, Lock, Unlock, AlertTriangle, Gauge } from "lucide-react";
import DataTable from "@/components/DataTable";

interface IpEntry { id: number; area: string; customerId: number; customerName: string | null; ip: string; count: number; memo: string; rateLimitCps: number; }

export default function IpWhitelistPage() {
  const [whitelist, setWhitelist] = useState<IpEntry[]>([]);
  const [blacklist, setBlacklist] = useState<IpEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"whitelist" | "blacklist">("whitelist");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalMode, setModalMode] = useState<"whitelist" | "blacklist">("whitelist");
  const [form, setForm] = useState({ ip: "", area: "", memo: "", customerId: 0, rateLimitCps: 0 });
  const [customers, setCustomers] = useState<{id:number;name:string}[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [defaultDeny, setDefaultDeny] = useState(false);
  const [togglingFirewall, setTogglingFirewall] = useState(false);
  const [iptablesAvailable, setIptablesAvailable] = useState(true);

  const fetchIps = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/ip-whitelist");
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setWhitelist(data.whitelist || []);
        setBlacklist(data.blacklist || []);
        setDefaultDeny(data.defaultDeny || false);
        setIptablesAvailable(data.iptablesAvailable !== false);
        setSelectedIds(new Set());
      }
    } catch { setError("Failed to load IP list"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchIps(); }, []);

  useEffect(() => {
    fetch("/api/vos/customers")
      .then(r => r.json())
      .then(d => setCustomers((d.customers || []).map((c: any) => ({ id: c.id, name: c.customer_name || c.name || '' }))))
      .catch(() => {});
  }, []);

  const currentList = activeTab === "whitelist" ? whitelist : blacklist;

  const handleAdd = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/ip-whitelist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, listType: modalMode === "blacklist" ? 1 : 0 }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setShowModal(false);
        setForm({ ip: "", area: "", memo: "", customerId: 0, rateLimitCps: 0 });
        setSuccess(`IP ${data.ip} ${data.updated ? "updated" : "added"} to ${modalMode}`);
        fetchIps();
      }
    } catch { setError("Failed to add IP"); }
    finally { setSaving(false); }
  };

  const handleToggleList = async (ip: string, currentType: "whitelist" | "blacklist") => {
    const newType = currentType === "whitelist" ? 1 : 0;
    const newLabel = currentType === "whitelist" ? "blacklist" : "whitelist";
    setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/ip-whitelist", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, listType: newType }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setSuccess(`IP ${ip} moved to ${newLabel}`); fetchIps(); }
    } catch { setError("Failed to update IP"); }
  };

  const handleDelete = async (ip: string, fromList: "whitelist" | "blacklist") => {
    const autoBlacklist = fromList === "whitelist";
    const confirmMsg = autoBlacklist
      ? `Remove ${ip} from whitelist?\n\n⚠️ It will be automatically blacklisted.`
      : `Remove ${ip} from blacklist?`;
    if (!confirm(confirmMsg)) return;
    setError(""); setSuccess("");
    try {
      const params = new URLSearchParams({ ip });
      if (autoBlacklist) params.set("auto_blacklist", "1");
      const res = await fetch(`/api/vos/ip-whitelist?${params}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        if (data.autoBlacklisted) setSuccess(`IP ${ip} moved to blacklist`);
        else setSuccess(`IP ${ip} removed`);
        fetchIps();
      }
    } catch { setError("Failed to remove IP"); }
  };

  const handleFirewallToggle = async () => {
    setTogglingFirewall(true); setError(""); setSuccess("");
    const action = defaultDeny ? "disable_deny" : "enable_deny";
    try {
      const res = await fetch("/api/vos/ip-whitelist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firewall_action: action }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setDefaultDeny(data.defaultDeny);
        setSuccess(data.message);
      }
    } catch { setError("Failed to toggle firewall"); }
    finally { setTogglingFirewall(false); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    const list = activeTab === "whitelist" ? filteredWhitelist : filteredBlacklist;
    if (selectedIds.size === list.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(list.map(e => e.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const autoBl = activeTab === "whitelist";
    const msg = autoBl
      ? `Remove ${selectedIds.size} IPs from whitelist?\n\n⚠ They will be auto-blacklisted.`
      : `Delete ${selectedIds.size} IPs from blacklist?`;
    if (!confirm(msg)) return;
    setError(""); setSuccess("");
    let ok = 0;
    const selected = (activeTab === "whitelist" ? whitelist : blacklist).filter(e => selectedIds.has(e.id));
    for (const entry of selected) {
      try {
        const params = new URLSearchParams({ ip: entry.ip });
        if (autoBl) params.set("auto_blacklist", "1");
        await fetch(`/api/vos/ip-whitelist?${params}`, { method: "DELETE" });
        ok++;
      } catch {}
    }
    setSelectedIds(new Set());
    if (ok === 0) setError("Failed to process any IPs");
    else if (ok < selected.length) setSuccess(`Processed ${ok} of ${selected.length} IPs`);
    else setSuccess(`Processed all ${ok} IP${ok > 1 ? "s" : ""}`);
    fetchIps();
  };

  const exportCSV = () => {
    const list = activeTab === "whitelist" ? filteredWhitelist : filteredBlacklist;
    const typeLabel = activeTab === "whitelist" ? "Whitelist" : "Blacklist";
    const rows = [`ID,IP Address,Client,Area,CPS Limit,Hits,Memo,Type`, ...list.map(e => [e.id, e.ip, `"${(e.customerName||"").replace(/"/g,'""')}"`, `"${(e.area||"").replace(/"/g,'""')}"`, e.rateLimitCps || 0, e.count, `"${(e.memo||"").replace(/"/g,'""')}"`, typeLabel].join(","))].join("\n");
    const b = new Blob([rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `ip_${activeTab}.csv`; a.click();
  };

  const filteredWhitelist = whitelist.filter(e => e.ip.includes(search) || (e.area||"").toLowerCase().includes(search.toLowerCase()) || (e.memo||"").toLowerCase().includes(search.toLowerCase()));
  const filteredBlacklist = blacklist.filter(e => e.ip.includes(search) || (e.area||"").toLowerCase().includes(search.toLowerCase()) || (e.memo||"").toLowerCase().includes(search.toLowerCase()));
  const displayList = activeTab === "whitelist" ? filteredWhitelist : filteredBlacklist;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">IP Whitelist Firewall</h1>
          <p className="text-surface-400 text-sm mt-1">
            Allowlist & blocklist IPs for SIP signaling (port 5060) — {whitelist.length} whitelisted, {blacklist.length} blacklisted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setModalMode("whitelist"); setForm({ ip: "", area: "", memo: "", customerId: 0, rateLimitCps: 0 }); setCustomerSearch(""); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add to Whitelist</button>
          <button onClick={() => { setModalMode("blacklist"); setForm({ ip: "", area: "", memo: "", customerId: 0, rateLimitCps: 0 }); setCustomerSearch(""); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium"><ShieldOff className="w-4 h-4" />Add to Blacklist</button>
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400" title="Export CSV"><Download className="w-4 h-4" /></button>
          <button onClick={fetchIps} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-emerald-400">{whitelist.length}</p><p className="text-xs text-surface-400">Whitelisted</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center"><ShieldOff className="w-5 h-5 text-red-400" /></div><div><p className="text-2xl font-bold text-red-400">{blacklist.length}</p><p className="text-xs text-surface-400">Blacklisted</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Globe className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{new Set([...whitelist, ...blacklist].map(i => i.area).filter(Boolean)).size}</p><p className="text-xs text-surface-400">Regions</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{[...whitelist, ...blacklist].reduce((s, i) => s + i.count, 0).toLocaleString()}</p><p className="text-xs text-surface-400">Total Hits</p></div></div></div>
        {/* Firewall Status Card */}
        <div className={`border rounded-xl p-5 transition-colors ${defaultDeny ? 'bg-amber-500/5 border-amber-500/30' : 'bg-emerald-500/5 border-emerald-500/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${defaultDeny ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                {defaultDeny ? <Lock className="w-5 h-5 text-amber-400" /> : <Unlock className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <p className={`text-sm font-bold ${defaultDeny ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {defaultDeny ? 'Deny All' : 'Allow All'}
                </p>
                <p className="text-xs text-surface-400">Default Policy</p>
              </div>
            </div>
            <button
              onClick={handleFirewallToggle}
              disabled={togglingFirewall || !iptablesAvailable}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-30 ${defaultDeny ? 'bg-amber-600' : 'bg-surface-600'}`}
              title={!iptablesAvailable ? 'iptables not available' : defaultDeny ? 'Disable default deny — allow all inbound SIP' : 'Enable default deny — only whitelisted IPs allowed'}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${defaultDeny ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-xs text-surface-400 mt-2">
            {defaultDeny
              ? <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" />Only whitelisted IPs can send inbound SIP traffic</span>
              : <span>All IPs can send inbound SIP traffic (port 5060)</span>
            }
          </p>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>}

      {/* iptables unavailable warning */}
      {!iptablesAvailable && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">iptables Not Available</p>
            <p className="text-xs text-red-400/80 mt-1">
              Firewall rules cannot be applied at the OS level. This typically happens in Docker containers without <code className="px-1 py-0.5 bg-red-500/10 rounded text-red-300 text-xs font-mono">--cap-add=NET_ADMIN</code> or on non-Linux systems. IP entries are still saved in the database but won't block traffic.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface-900 border border-surface-700/50 rounded-xl p-1 w-fit">
        <button onClick={() => { setActiveTab("whitelist"); setSelectedIds(new Set()); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "whitelist" ? "bg-emerald-600 text-white shadow-sm" : "text-surface-400 hover:text-surface-50 hover:bg-surface-800"}`}><ShieldCheck className="w-4 h-4" />Whitelist ({whitelist.length})</button>
        <button onClick={() => { setActiveTab("blacklist"); setSelectedIds(new Set()); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "blacklist" ? "bg-red-600 text-white shadow-sm" : "text-surface-400 hover:text-surface-50 hover:bg-surface-800"}`}><ShieldOff className="w-4 h-4" />Blacklist ({blacklist.length})</button>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by IP, area, or memo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {selectedIds.size > 0 && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === "whitelist" ? "bg-amber-500/10 border border-amber-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
          <CheckSquare className={`w-4 h-4 ${activeTab === "whitelist" ? "text-amber-400" : "text-red-400"}`} />
          <span className={`text-sm font-medium ${activeTab === "whitelist" ? "text-amber-400" : "text-red-400"}`}>{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-50 hover:bg-surface-700 transition-colors">Deselect</button>
          <button onClick={handleBulkDelete} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${activeTab === "whitelist" ? "bg-amber-600 hover:bg-amber-500" : "bg-red-600 hover:bg-red-500"}`}><Trash2 className="w-4 h-4" />{activeTab === "whitelist" ? "Blacklist Selected" : "Delete Selected"}</button>
        </div>
      )}

      <DataTable
        idKey="id"
        selectedIds={selectedIds}
        onSelectToggle={toggleSelect}
        onSelectAllToggle={toggleSelectAll}
        columns={[
          { key: "id", label: "#", render: (e: IpEntry) => <span className="text-surface-500 text-xs">{e.id}</span> },
          { key: "ip", label: "IP Address", render: (e: IpEntry) => <span className="text-surface-50 font-mono font-medium text-sm">{e.ip}</span> },
          { key: "customerName", label: "Client / Company", render: (e: IpEntry) => <span className="text-surface-300 text-xs">{e.customerName || "—"}</span> },
          { key: "area", label: "Area", render: (e: IpEntry) => <span className="text-surface-300 text-xs">{e.area || "—"}</span> },
          { key: "count", label: "Hits", textAlign: "right" as const, render: (e: IpEntry) => <span className="text-surface-300 font-mono text-xs">{e.count.toLocaleString()}</span> },
          { key: "rateLimitCps", label: "CPS Limit", textAlign: "right" as const, render: (e: IpEntry) => (
            <span className={e.rateLimitCps > 0 ? "text-brand-400 font-mono text-xs font-medium" : "text-surface-500 text-xs"}>
              {e.rateLimitCps > 0 ? `${e.rateLimitCps}/s` : "—"}
            </span>
          )},
          { key: "memo", label: "Memo", render: (e: IpEntry) => <span className="text-surface-400 text-xs max-w-[300px] truncate block">{e.memo || "—"}</span> },
          { key: "actions", label: "Actions", textAlign: "center" as const, width: "8rem", render: (e: IpEntry) => (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => handleToggleList(e.ip, activeTab)}
                className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-brand-400"
                title={`Move to ${activeTab === "whitelist" ? "blacklist" : "whitelist"}`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(e.ip, activeTab)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400" title={activeTab === "whitelist" ? "Remove & auto-blacklist" : "Delete from blacklist"}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )},
        ]}
        data={displayList}
        loading={loading}
        emptyIcon={<Shield className="w-10 h-10 text-surface-600" />}
        emptyMessage={`No IPs in ${activeTab}`}
        emptySubtitle={activeTab === "whitelist" ? "Add IPs to allow SIP traffic on port 5060" : "IPs removed from whitelist are auto-blacklisted"}
        pageSize={15}
      />

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <h2 className="text-lg font-semibold text-surface-50 flex items-center gap-2">
                {modalMode === "whitelist" ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <ShieldOff className="w-5 h-5 text-red-400" />}
                Add IP to {modalMode === "whitelist" ? "Whitelist" : "Blacklist"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="block text-xs font-medium text-surface-400 mb-1">IP Address * (e.g. 192.168.1.0/24)</label><input value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.1 or 10.0.0.0/8" className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono" /></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Area / Region</label><input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="US, EU, Asia..." className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Client / Company</label>
                {customers.length > 0 ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Search client..."
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"
                    />
                    {customerSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg max-h-32 overflow-y-auto">
                        {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 15).map(c => (
                          <button key={c.id} type="button" onClick={() => { setForm({...form, customerId: c.id}); setCustomerSearch(c.name); }}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-surface-700 ${form.customerId === c.id ? 'text-brand-400 bg-brand-500/10' : 'text-surface-300'}`}>
                            {c.name} <span className="text-surface-500 text-xs">ID:{c.id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <input type="number" value={form.customerId || ""} onChange={e => setForm({ ...form, customerId: parseInt(e.target.value) || 0 })} placeholder="Customer ID" className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
                )}
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" placeholder="Client name or reason..." /></div>
              {/* Rate limit — whitelist only */}
              {modalMode === "whitelist" && (
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-brand-400" />
                    Max Calls/Sec (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={form.rateLimitCps || ""}
                    onChange={e => setForm({ ...form, rateLimitCps: parseInt(e.target.value) || 0 })}
                    placeholder="0 (unlimited)"
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
                  />
                  <p className="text-xs text-surface-500 mt-1">
                    Limits SIP INVITE rate per second from this IP. Uses iptables hashlimit. Leave 0 for no limit.
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleAdd} disabled={!form.ip || saving} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 text-white ${modalMode === "whitelist" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>{saving ? "Adding..." : `Add to ${modalMode}`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
