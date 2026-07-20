"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Wifi, WifiOff, RefreshCw, Plus, Edit2, Trash2, X, Search, Download, Upload, ChevronDown, ChevronRight, DollarSign, Server, Loader2, Radio } from "lucide-react";
import GatewaySelector from "@/components/GatewaySelector";

interface ClearingAccount {
  id: number;
  account: string;
  name: string;
  balance: number;
  creditLimit: number;
  status: number;
  gatewayCount: number;
  gateways: ClearingGateway[];
}

interface ClearingGateway {
  id: number;
  name: string;
  remoteips: string;
  prefix: string;
  capacity: number;
  locktype: number;
  signalport: number;
  clearingCustomerId: number;
}

export default function ClearingPage() {
  const [accounts, setAccounts] = useState<ClearingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [togglingAccIds, setTogglingAccIds] = useState<Set<number>>(new Set());
  const [togglingGwIds, setTogglingGwIds] = useState<Set<number>>(new Set());

  // Account modal state
  const [showAccModal, setShowAccModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<ClearingAccount | null>(null);
  const [accForm, setAccForm] = useState({ account: "", name: "", balance: 0, creditLimit: 0, status: 1 });
  const [selectedGatewayIds, setSelectedGatewayIds] = useState<number[]>([]);
  const [savingAcc, setSavingAcc] = useState(false);

  // Gateway modal state
  const [showGwModal, setShowGwModal] = useState(false);
  const [editingGw, setEditingGw] = useState<ClearingGateway | null>(null);
  const [gwParentId, setGwParentId] = useState(0);
  const [gwForm, setGwForm] = useState({ name: "", remoteips: "", prefix: "", capacity: 30, signalport: 5060, locktype: 0 });
  const [savingGw, setSavingGw] = useState(false);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [custRes, gwRes] = await Promise.all([
        fetch("/api/vos/customers?type=1"),
        fetch("/api/vos/gateways?type=routing"),
      ]);
      const custData = await custRes.json();
      const gwData = await gwRes.json();

      const customers: Record<string, any>[] = custData.customers || [];
      const routingGateways: Record<string, any>[] = gwData.gateways || [];

      // Group gateways by customer_id
      const gwMap = new Map<number, ClearingGateway[]>();
      for (const gw of routingGateways) {
        const cid = Number(gw.customer_id || gw.clearingCustomerId || 0);
        if (cid > 0) {
          if (!gwMap.has(cid)) gwMap.set(cid, []);
          gwMap.get(cid)!.push({
            id: Number(gw.id),
            name: String(gw.gateway_name || gw.name || ""),
            remoteips: String(gw.remoteips || gw.ip_addr || ""),
            prefix: String(gw.prefix || ""),
            capacity: Number(gw.capacity || gw.max_calls || 0),
            locktype: Number(gw.locktype) ?? 0,
            signalport: Number(gw.signalport || gw.port || 5060),
            clearingCustomerId: cid,
          });
        }
      }

      // Build account list
      const clearingAccounts: ClearingAccount[] = customers
        .filter((c: any) => (c.customer_type === 1 || c.customer_type === "1" || gwMap.has(Number(c.id))))
        .map((c: any) => {
          const id = Number(c.id);
          const gws = gwMap.get(id) || [];
          return {
            id,
            account: String(c.account || c.customer_name || `#${id}`),
            name: String(c.customer_name || c.name || `Customer ${id}`),
            balance: Number(c.balance || 0),
            creditLimit: Number(c.creditLimit || c.credit || 0),
            status: Number(c.status) || 0,
            gatewayCount: gws.length,
            gateways: gws,
          };
        });

      setAccounts(clearingAccounts);
    } catch { setError("Failed to fetch clearing data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Account CRUD ---
  const openAddAcc = () => {
    setEditingAcc(null);
    setAccForm({ account: "", name: "", balance: 0, creditLimit: 0, status: 1 });
    setSelectedGatewayIds([]);
    setShowAccModal(true);
  };

  const openEditAcc = (a: ClearingAccount) => {
    setEditingAcc(a);
    setAccForm({ account: a.account, name: a.name, balance: a.balance, creditLimit: a.creditLimit, status: a.status });
    setSelectedGatewayIds(a.gateways.map(g => g.id));
    setShowAccModal(true);
  };

  const handleSaveAcc = async () => {
    setSavingAcc(true); setError(""); setSuccess("");
    try {
      if (editingAcc) {
        // Delete old + recreate
        await fetch(`/api/vos/customers/${editingAcc.id}`, { method: "DELETE" });
      }
      const res = await fetch("/api/vos/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: accForm.name, account: accForm.account, balance: accForm.balance, creditLimit: accForm.creditLimit, status: accForm.status, customer_type: 1 }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      // Get account ID and assign gateways
      const savedId = data.id || editingAcc?.id;
      if (savedId && selectedGatewayIds.length > 0) {
        await fetch("/api/vos/gateways/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: savedId, gateway_ids: selectedGatewayIds, type: "routing" }),
        });
      }

      setShowAccModal(false); setSuccess(editingAcc ? "Account updated" : "Account created"); fetchData();
    } catch { setError("Failed to save account"); }
    finally { setSavingAcc(false); }
  };

  const handleDeleteAcc = async (id: number) => {
    if (!confirm("Delete this clearing account and its gateways?")) return;
    setError(""); setSuccess("");
    try {
      const acc = accounts.find(a => a.id === id);
      if (acc) {
        for (const gw of acc.gateways) {
          await fetch(`/api/vos/gateways/${gw.id}`, { method: "DELETE" });
        }
      }
      await fetch(`/api/vos/customers/${id}`, { method: "DELETE" });
      setSuccess("Account deleted"); fetchData();
    } catch { setError("Failed to delete account"); }
  };

  // --- Inline status toggles ---
  const handleToggleAccStatus = async (id: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    setTogglingAccIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/vos/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch { setError("Failed to update status"); }
    finally {
      setTogglingAccIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleToggleGwStatus = async (gwId: number, currentLocktype: number) => {
    const newLocktype = currentLocktype === 0 ? 1 : 0;
    setTogglingGwIds(prev => new Set(prev).add(gwId));
    try {
      const res = await fetch(`/api/vos/gateways/${gwId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newLocktype }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setAccounts(prev => prev.map(a => ({
          ...a,
          gateways: a.gateways.map(gw => gw.id === gwId ? { ...gw, locktype: newLocktype } : gw),
        })));
      }
    } catch { setError("Failed to update gateway"); }
    finally {
      setTogglingGwIds(prev => { const n = new Set(prev); n.delete(gwId); return n; });
    }
  };

  // --- Gateway CRUD ---
  const openAddGw = (accountId: number) => {
    setEditingGw(null);
    setGwParentId(accountId);
    setGwForm({ name: "", remoteips: "", prefix: "", capacity: 30, signalport: 5060, locktype: 0 });
    setShowGwModal(true);
  };

  const openEditGw = (gw: ClearingGateway) => {
    setEditingGw(gw);
    setGwParentId(gw.clearingCustomerId);
    setGwForm({ name: gw.name, remoteips: gw.remoteips, prefix: gw.prefix, capacity: gw.capacity, signalport: gw.signalport, locktype: gw.locktype });
    setShowGwModal(true);
  };

  const handleSaveGw = async () => {
    setSavingGw(true); setError(""); setSuccess("");
    try {
      if (editingGw) {
        await fetch(`/api/vos/gateways/${editingGw.id}`, { method: "DELETE" });
      }
      const res = await fetch("/api/vos/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "routing", name: gwForm.name, remoteips: gwForm.remoteips,
          prefix: gwForm.prefix, capacity: gwForm.capacity, signalport: gwForm.signalport,
          locktype: gwForm.locktype, customer_id: gwParentId,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setShowGwModal(false); setSuccess(editingGw ? "Gateway updated" : "Gateway added"); fetchData(); }
    } catch { setError("Failed to save gateway"); }
    finally { setSavingGw(false); }
  };

  const handleDeleteGw = async (gwId: number) => {
    if (!confirm("Delete this gateway?")) return;
    setError(""); setSuccess("");
    try {
      await fetch(`/api/vos/gateways/${gwId}`, { method: "DELETE" });
      setSuccess("Gateway deleted"); fetchData();
    } catch { setError("Failed to delete gateway"); }
  };

  // --- CSV Export ---
  const exportCSV = () => {
    const rows: string[] = ["Account,Name,Balance,CreditLimit,Status,GatewayCount"];
    filtered.forEach(a => {
      rows.push([a.account, `"${a.name.replace(/"/g, '""')}"`, a.balance.toFixed(4), a.creditLimit.toFixed(2), a.status === 1 ? "Active" : "Inactive", a.gatewayCount].join(","));
      a.gateways.forEach(gw => {
        rows.push(["  →" + gw.name, gw.remoteips, gw.prefix, gw.capacity, gw.signalport, gw.locktype === 0 ? "Active" : "Locked"].join(","));
      });
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "clearing_gateways.csv"; a.click();
  };

  // --- CSV Import ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setError(""); setSuccess("");
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { setError("CSV file must have a header row + data"); return; }
      let ok = 0;
      for (const line of lines.slice(1)) {
        const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const [account, name, balance, creditLimit] = vals;
        if (!account || !name) continue;
        try {
          await fetch("/api/vos/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer_name: name, account, balance: parseFloat(balance) || 0, creditLimit: parseFloat(creditLimit) || 0, status: 1, customer_type: 1 }) });
          ok++;
        } catch {}
      }
      setSuccess(`Imported ${ok} clearing accounts`);
      fetchData();
    } catch { setError("Failed to import CSV"); }
    finally { e.target.value = ""; }
  };

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.account.toLowerCase().includes(search.toLowerCase()) ||
    a.gateways.some(gw => gw.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalGws = accounts.reduce((s, a) => s + a.gatewayCount, 0);
  const activeGws = accounts.reduce((s, a) => s + a.gateways.filter(g => Number(g.locktype) === 0).length, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Clearing Gateway
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage clearing/supplier accounts and their routing gateways
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400" title="Export CSV"><Download className="w-4 h-4" /></button>
          <label className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-amber-400 cursor-pointer" title="Import CSV"><Upload className="w-4 h-4" /><input type="file" accept=".csv" onChange={handleImport} className="hidden" /></label>
          <button onClick={fetchData} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={openAddAcc} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Account</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{accounts.length}</p><p className="text-xs text-surface-400">Clearing Accounts</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-400" /></div><div><p className={`text-2xl font-bold ${totalBalance < 0 ? "text-red-400" : "text-emerald-400"}`}>${totalBalance.toFixed(2)}</p><p className="text-xs text-surface-400">Total Balance</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{totalGws}</p><p className="text-xs text-surface-400">Total Gateways</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center"><Wifi className="w-5 h-5 text-cyan-400" /></div><div><p className="text-2xl font-bold text-surface-50">{activeGws}<span className="text-sm text-surface-500 ml-1">/ {totalGws} active</span></p><p className="text-xs text-surface-400">Active Gateways</p></div></div></div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input type="text" placeholder="Search accounts, gateways..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
      </div>

      {/* Account + Gateway List */}
      {loading ? (
        <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-6"><div className="h-5 bg-surface-800 rounded w-32 mb-3 animate-pulse" /><div className="h-4 bg-surface-800 rounded w-48 animate-pulse" /></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center text-surface-500">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-surface-600" />
          <p className="text-lg font-medium">No clearing accounts found</p>
          <p className="text-sm mt-1">Click "Add Account" to create a clearing/supplier account</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(account => {
            const isExpanded = expandedId === account.id;
            return (
              <div key={account.id} className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
                {/* Account Header */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <button onClick={() => setExpandedId(isExpanded ? null : account.id)} className="flex items-center gap-3 min-w-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-surface-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-surface-400 flex-shrink-0" />}
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-5 h-5 text-emerald-400" /></div>
                    <div className="min-w-0 text-left">
                      <div className="text-surface-50 font-medium truncate">{account.name}</div>
                      <div className="text-surface-500 text-xs">Account: {account.account} | Gateways: {account.gatewayCount}</div>
                    </div>
                  </button>
                  <div className="flex items-center gap-4 text-sm flex-shrink-0">
                    <div><span className={`${account.balance < 0 ? "text-red-400" : "text-emerald-400"} font-mono`}>${account.balance.toFixed(2)}</span></div>
                    <span
                      onClick={() => handleToggleAccStatus(account.id, account.status)}
                      title={account.status === 1 ? "Click to deactivate" : "Click to activate"}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${account.status === 1 ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}
                    >
                      {togglingAccIds.has(account.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {account.status === 1 ? "Active" : "Inactive"}
                    </span>
                    <button onClick={() => openAddGw(account.id)} className="p-1.5 rounded hover:bg-violet-500/10 text-surface-400 hover:text-violet-400" title="Add Gateway"><Plus className="w-4 h-4" /></button>
                    <button onClick={() => openEditAcc(account)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteAcc(account.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Gateways Table */}
                {isExpanded && (
                  <div className="border-t border-surface-800/50">
                    {account.gateways.length === 0 ? (
                      <div className="p-6 text-center text-surface-500 text-sm">No gateways assigned. Click the + button to add one.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-surface-800/30 border-b border-surface-700/50">
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">ID</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">IP</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Port</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Prefix</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Cap.</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-surface-400">Status</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-surface-400 w-20">Act</th>
                          </tr></thead>
                          <tbody className="divide-y divide-surface-800">
                            {account.gateways.map(gw => (
                              <tr key={gw.id} className="hover:bg-surface-800/30">
                                <td className="px-4 py-2 font-mono text-surface-400 text-xs">{gw.id}</td>
                                <td className="px-4 py-2 text-surface-50 font-medium text-xs">
                                  <div className="flex items-center gap-1.5">
                                    {Number(gw.locktype) === 0 ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                                    {gw.name}
                                  </div>
                                </td>
                                <td className="px-4 py-2 font-mono text-surface-300 text-xs">{gw.remoteips || "—"}</td>
                                <td className="px-4 py-2 text-surface-300 text-xs">{gw.signalport || 5060}</td>
                                <td className="px-4 py-2 font-mono text-surface-300 text-xs max-w-[150px] truncate">{gw.prefix || "—"}</td>
                                <td className="px-4 py-2 text-surface-300 text-xs">{gw.capacity}</td>
                                <td className="px-4 py-2 text-center">
                                  <button
                                    onClick={() => handleToggleGwStatus(gw.id, Number(gw.locktype))}
                                    disabled={togglingGwIds.has(gw.id)}
                                    title={Number(gw.locktype) === 0 ? "Click to lock" : "Click to unlock"}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${Number(gw.locktype) === 0 ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}
                                  >
                                    {togglingGwIds.has(gw.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                    {Number(gw.locktype) === 0 ? "Active" : "Locked"}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => openEditGw(gw)} className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleDeleteGw(gw.id)} className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Account Add/Edit Modal */}
      {showAccModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingAcc ? "Edit Clearing Account" : "Add Clearing Account"}</h2><button onClick={() => setShowAccModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Account *</label><input value={accForm.account} onChange={e => setAccForm({ ...accForm, account: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Name *</label><input value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Balance</label><input type="number" step="0.0001" value={accForm.balance} onChange={e => setAccForm({ ...accForm, balance: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Credit Limit</label><input type="number" step="0.01" value={accForm.creditLimit} onChange={e => setAccForm({ ...accForm, creditLimit: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm" /></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={accForm.status} onChange={e => setAccForm({ ...accForm, status: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"><option value={1}>Active</option><option value={0}>Inactive</option></select></div>

              {/* Gateway Selector */}
              <div className="border-t border-surface-800 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Radio className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-medium text-surface-400">Routing Gateway Assignment</span>
                </div>
                <GatewaySelector
                  gatewayType="routing"
                  customerId={editingAcc?.id}
                  selectedIds={selectedGatewayIds}
                  onChange={setSelectedGatewayIds}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowAccModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSaveAcc} disabled={!accForm.account || !accForm.name || savingAcc} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{savingAcc ? "Saving..." : editingAcc ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Add/Edit Modal */}
      {showGwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingGw ? "Edit Gateway" : "Add Gateway"}</h2><button onClick={() => setShowGwModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Gateway Name *</label><input value={gwForm.name} onChange={e => setGwForm({ ...gwForm, name: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Remote IPs *</label><input value={gwForm.remoteips} onChange={e => setGwForm({ ...gwForm, remoteips: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono" placeholder="192.168.1.1" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Port</label><input type="number" value={gwForm.signalport} onChange={e => setGwForm({ ...gwForm, signalport: parseInt(e.target.value) || 5060 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Prefix</label><input value={gwForm.prefix} onChange={e => setGwForm({ ...gwForm, prefix: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Capacity</label><input type="number" value={gwForm.capacity} onChange={e => setGwForm({ ...gwForm, capacity: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm" /></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={gwForm.locktype} onChange={e => setGwForm({ ...gwForm, locktype: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm"><option value={0}>Active</option><option value={1}>Locked</option></select></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowGwModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSaveGw} disabled={!gwForm.name || !gwForm.remoteips || savingGw} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{savingGw ? "Saving..." : editingGw ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
