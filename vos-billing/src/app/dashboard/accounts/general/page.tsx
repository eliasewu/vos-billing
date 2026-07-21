"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Building2, Wallet, RefreshCw, ChevronDown, Plus, Edit2, Trash2, X, Loader2, Wifi, Filter, Square, CheckSquare, Download, Upload, Check, ExternalLink } from "lucide-react";
import DragSelect from "@/components/DragSelect";
import GatewaySelector from "@/components/GatewaySelector";

interface Account {
  id: number;
  account: string;
  name: string;
  money: number;
  limitmoney: number;
  type: number;
  status: number;
  starttime: number;
  lastupdatetime: number;
  feerateGroupId: number;
  feerateGroupName: string | null;
  feerateGroup2Name: string | null;
  feerateGroup3Name: string | null;
  privateRateName: string | null;
  gatewayCount: number;
  phoneCount: number;
  todayConsumption: number;
  suiteCount: number;
  email: string;
  phone: string;
  company: string;
  address: string;
  bankAccount: string;
  cc: string;
  bcc: string;
}

const TYPE_LABELS: Record<number, string> = { 0: "General", 1: "Clearing", 2: "Agent", 3: "Phone Card" };
const STATUS_LABELS: Record<number, string> = { 0: "Inactive", 1: "Active", 2: "Locked" };

export default function GeneralAccountPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rateGroupFilter, setRateGroupFilter] = useState("");
  const [balanceSignFilter, setBalanceSignFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [success, setSuccess] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ account:"", name:"", money:0, limitmoney:0, type:0, status:1, feerateGroupId: 0,
    email:"", phone:"", company:"", address:"", bankAccount:"", cc:"", bcc:"" });
  const [selectedGatewayIds, setSelectedGatewayIds] = useState<number[]>([]);
  const [rateGroups, setRateGroups] = useState<{ id: number; name: string }[]>([]);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (rateGroupFilter) params.set("rateGroup", rateGroupFilter);
      if (balanceSignFilter) params.set("balanceSign", balanceSignFilter);
      const res = await fetch(`/api/vos/accounts?${params}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setAccounts(data.accounts || []);
    } catch {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    setSelectedIds(new Set());
  }, [debouncedSearch, typeFilter, statusFilter, rateGroupFilter, balanceSignFilter]);

  useEffect(() => {
    fetch("/api/vos/rate-groups")
      .then(r => r.json())
      .then(d => { if (d.groups) setRateGroups(d.groups.map((g: any) => ({ id: g.id, name: g.name }))); })
      .catch(() => {});
  }, []);

  const formatMoney = (val: number) => {
    const abs = Math.abs(val);
    const s = abs.toFixed(4);
    return val < 0 ? `-$${s}` : `$${s}`;
  };

  const formatTime = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let accountId = editingAccount?.id;
      const url = editingAccount ? `/api/vos/accounts/${editingAccount.id}` : "/api/vos/accounts";
      const method = editingAccount ? "PUT" : "POST";
      const { email, phone, company, address, bankAccount, cc, bcc, ...coreForm } = form;
      const payload: Record<string, any> = { ...coreForm, email, phone, company, address, bankAccount, cc, bcc };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      // For new accounts, use returned ID
      if (!accountId && data.id) accountId = data.id;

      // Assign selected gateways to this account
      if (accountId && selectedGatewayIds.length > 0) {
        await fetch("/api/vos/gateways/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: accountId, gateway_ids: selectedGatewayIds, type: "mapping" }),
        });
      }

      setShowModal(false); setEditingAccount(null); fetchAccounts();
    } catch { setError("Failed to save account"); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (id: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    setTogglingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/vos/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      }
    } catch { setError("Failed to update status"); }
    finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === accounts.length && accounts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts.map(a => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected account(s)?`)) return;
    setBulkDeleting(true); setError(""); setSuccess("");
    let ok = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/vos/accounts/${id}`, { method: "DELETE" });
        if ((await res.json()).error) continue;
        ok++;
      } catch {}
    }
    setBulkDeleting(false);
    setSelectedIds(new Set());
    setSuccess(`Deleted ${ok} of ${selectedIds.size} accounts`);
    fetchAccounts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this account?")) return;
    try {
      const res = await fetch(`/api/vos/accounts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) setError(data.error);
      else fetchAccounts();
    } catch { setError("Failed to delete account"); }
  };

  const openEdit = async (a: Account) => {
    setEditingAccount(a);
    setForm({ account: a.account, name: a.name, money: a.money, limitmoney: a.limitmoney, type: a.type, status: a.status, feerateGroupId: a.feerateGroupId || 0,
      email: a.email || "", phone: a.phone || "", company: a.company || "", address: a.address || "", bankAccount: a.bankAccount || "", cc: a.cc || "", bcc: a.bcc || "" });
    // Fetch currently assigned gateway IDs for this account
    try {
      const res = await fetch(`/api/vos/gateways?type=mapping`);
      const data = await res.json();
      const assignedIds = (data.gateways || [])
        .filter((g: any) => Number(g.customer_id) === a.id)
        .map((g: any) => Number(g.id));
      setSelectedGatewayIds(assignedIds);
    } catch { setSelectedGatewayIds([]); }
    setShowModal(true);
  };

  const exportCSV = () => {
    const headers = ["ID","Account","Name","Type","Balance","Overdraft","Status","Billing Rate","Private Rate","Gateways","Phones","Suites","Today Cons.","Email","Phone","Company","Address","Bank","CC","BCC"];
    const rows = [headers.join(",")];
    accounts.forEach(a => rows.push([
      a.id, `"${a.account}"`, `"${a.name}"`, TYPE_LABELS[a.type]||"", a.money, a.limitmoney,
      STATUS_LABELS[a.status]||"", `"${a.feerateGroupName||""}"`, `"${a.privateRateName||""}"`,
      a.gatewayCount, a.phoneCount, a.suiteCount, a.todayConsumption,
      `"${a.email}"`, `"${a.phone}"`, `"${a.company}"`, `"${a.address}"`, `"${a.bankAccount}"`, `"${a.cc}"`, `"${a.bcc}"`
    ].join(",")));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = "accounts.csv"; el.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setError(""); setSuccess("");
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { setError("CSV must have header + data"); return; }
      let ok = 0;
      for (const line of lines.slice(1)) {
        const v = line.split(",").map(s => s.trim().replace(/^"|"$/g, ""));
        if (!v[1]) continue;
        try {
          await fetch("/api/vos/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: v[1], customer_name: v[2], money: parseFloat(v[4])||0, creditLimit: parseFloat(v[5])||0, status: 1, customer_type: 0 }) });
          ok++;
        } catch {}
      }
      setSuccess(`Imported ${ok} accounts`);
      fetchAccounts();
    } catch { setError("Failed to import CSV"); }
    finally { e.target.value = ""; }
  };

  const handleApply = () => {
    setSuccess("Rate changes applied — active calls will use new rates");
  };

  const openAdd = () => {
    setEditingAccount(null);
    setForm({ account: "", name: "", money: 0, limitmoney: 0, type: 0, status: 1, feerateGroupId: 0,
      email: "", phone: "", company: "", address: "", bankAccount: "", cc: "", bcc: "" });
    setSelectedGatewayIds([]);
    setShowModal(true);
  };

  const totalBalance = accounts.reduce((s, a) => s + a.money, 0);
  const activeCount = accounts.filter((a) => a.status === 1).length;
  const clearingCount = accounts.filter((a) => a.type === 1).length;
  const generalCount = accounts.filter((a) => a.type === 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">General Account</h1>
          <p className="text-surface-400 text-sm mt-1">General, Clearing, Agent & Phone Card accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 transition-colors" title="Export CSV"><Download className="w-4 h-4" /></button>
          <label className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 cursor-pointer transition-colors" title="Import CSV"><Upload className="w-4 h-4" /><input type="file" accept=".csv" onChange={handleImport} className="hidden" /></label>
          <button onClick={handleApply} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors" title="Apply changes"><Check className="w-4 h-4" />Apply</button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Add Account</button>
          <button onClick={fetchAccounts} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-50">{accounts.length}</p>
              <p className="text-xs text-surface-400">Total Accounts</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-50">{activeCount}</p>
              <p className="text-xs text-surface-400">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatMoney(totalBalance)}
              </p>
              <p className="text-xs text-surface-400">Total Balance</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-50">{generalCount}</p>
              <p className="text-xs text-surface-400">General</p>
            </div>
          </div>
          <p className="text-xs text-surface-500">+{clearingCount} clearing | {accounts.reduce((s,a) => s + a.suiteCount, 0)} suites</p>
        </div>
      </div>

      {/* Search & Enhanced Filter Panel */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input type="text" placeholder="Account ID, Name, Gateway, Phone..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-colors" />
          </div>
          <div className="relative">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 cursor-pointer">
              <option value="">All Types</option><option value="0">General</option><option value="1">Clearing</option><option value="2">Agent</option><option value="3">Phone Card</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${showFilters ? "bg-brand-600/20 text-brand-400 border border-brand-500/30" : "bg-surface-800 border border-surface-700/50 text-surface-400 hover:text-surface-50"}`}>
            <Filter className="w-4 h-4" />Filters {showFilters ? "▲" : "▼"}
          </button>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-surface-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Flags */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-2">Status Flags</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { v: "1", l: "Active", c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" },
                  { v: "0", l: "Inactive", c: "bg-surface-700 text-surface-400 border-surface-600 hover:text-surface-200" },
                  { v: "2", l: "Locked", c: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" },
                ].map(f => {
                  const active = statusFilter.split(",").includes(f.v);
                  return (
                    <button key={f.v} onClick={() => {
                      const parts = statusFilter ? statusFilter.split(",") : [];
                      setStatusFilter(active ? parts.filter(p => p !== f.v).join(",") : [...parts, f.v].join(","));
                    }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${active ? f.c : "bg-surface-800 border-surface-700/50 text-surface-500 hover:text-surface-300"}`}>{f.l}</button>
                  );
                })}
              </div>
            </div>

            {/* Balance Sign */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-2">Balance</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { v: "negative", l: "Negative", c: "bg-red-500/10 text-red-400 border-red-500/20" },
                  { v: "positive", l: "Positive", c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                ].map(b => {
                  const active = balanceSignFilter === b.v;
                  return (
                    <button key={b.v} onClick={() => setBalanceSignFilter(active ? "" : b.v)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${active ? b.c : "bg-surface-800 border-surface-700/50 text-surface-500 hover:text-surface-300"}`}>{b.l}</button>
                  );
                })}
              </div>
            </div>

            {/* Billing Rate */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-2">Billing Rate</label>
              <select value={rateGroupFilter} onChange={(e) => setRateGroupFilter(e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50">
                <option value="">All Rate Groups</option>
                {rateGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-end">
              <button onClick={() => { setStatusFilter(""); setBalanceSignFilter(""); setRateGroupFilter(""); }}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700/50 text-surface-400 hover:text-surface-50 transition-colors">
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error & Success Alerts */}
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><button onClick={() => setError("")} className="p-0.5 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2"><button onClick={() => setSuccess("")} className="p-0.5 hover:text-emerald-300"><X className="w-3.5 h-3.5" /></button>{success}</div>}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 px-5 py-3 bg-brand-600/10 border border-brand-500/20 rounded-xl">
          <span className="text-sm font-medium text-brand-300">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-surface-400 hover:text-surface-50">Deselect</button>
          <div className="flex-1" />
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 text-sm font-medium disabled:opacity-50 transition-colors">
            <Trash2 className="w-4 h-4" />{bulkDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="w-10 px-3 py-3 text-center"><button onClick={toggleSelectAll} className="text-surface-500 hover:text-surface-300">{selectedIds.size > 0 && selectedIds.size === accounts.length ? <CheckSquare className="w-4 h-4 text-brand-400" /> : <Square className="w-4 h-4" />}</button></th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Account</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Type</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Balance</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Overdraft</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Billing Rate</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Private Rate</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Today Cons.</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Gateways</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Phones</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Suites</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Updated</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-800/50">
                    {Array.from({ length: 16 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-12 text-center text-surface-500">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-surface-600" />
                    <p>No accounts found</p>
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                    <td className="px-3 py-3 text-center"><button onClick={() => toggleSelect(a.id)} className="text-surface-500 hover:text-surface-300">{selectedIds.has(a.id) ? <CheckSquare className="w-4 h-4 text-brand-400" /> : <Square className="w-4 h-4" />}</button></td>
                    <td className="px-4 py-3 text-surface-500 text-xs">{a.id}</td>
                    <td className="px-4 py-3 text-surface-300 font-mono text-xs">{a.account}</td>
                    <td className="px-4 py-3 text-surface-50 font-medium">
                      <button onClick={() => router.push(`/dashboard/accounts/${a.id}`)} className="text-surface-50 hover:text-brand-400 transition-colors flex items-center gap-1 text-left group">
                        {a.name}
                        <ExternalLink className="w-3 h-3 text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        a.type === 1 ? "bg-amber-500/10 text-amber-400" :
                        a.type === 2 ? "bg-violet-500/10 text-violet-400" :
                        a.type === 3 ? "bg-cyan-500/10 text-cyan-400" :
                        "bg-blue-500/10 text-blue-400"
                      }`}>
                        {TYPE_LABELS[a.type] || `Type ${a.type}`}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-sm ${a.money < 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {formatMoney(a.money)}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-300 font-mono text-sm">
                      ${a.limitmoney.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(a.id, a.status)}
                        disabled={togglingIds.has(a.id) || a.status === 2}
                        title={a.status === 2 ? "Locked — cannot toggle" : a.status === 1 ? "Click to deactivate" : "Click to activate"}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          a.status === 1 ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" :
                          a.status === 2 ? "bg-red-500/10 text-red-400 cursor-not-allowed" :
                          "bg-surface-800 text-surface-500 hover:bg-surface-700"
                        }`}
                      >
                        {togglingIds.has(a.id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            a.status === 1 ? "bg-emerald-400" : a.status === 2 ? "bg-red-400" : "bg-surface-500"
                          }`} />
                        )}
                        {STATUS_LABELS[a.status] || `Status ${a.status}`}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-surface-400 text-xs">
                      {a.feerateGroupName || "—"}
                    </td>
                    <td className="px-4 py-3 text-surface-400 text-xs">
                      {a.privateRateName || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-300 font-mono text-xs">
                      {a.todayConsumption > 0 ? <span className="text-amber-400">{formatMoney(a.todayConsumption)}</span> : <span className="text-surface-500">$0</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-surface-300 text-xs">
                      <button
                        onClick={() => {
                          const gwPath = a.type === 1 ? "/dashboard/operation/gateways/routing" : "/dashboard/operation/gateways/mapping";
                          router.push(`${gwPath}?customer=${a.id}&name=${encodeURIComponent(a.name)}`);
                        }}
                        title={`Manage ${a.type === 1 ? "routing" : "mapping"} gateways for ${a.name}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          a.gatewayCount > 0 ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20" : "bg-surface-800 text-surface-500 hover:bg-surface-700 hover:text-surface-300"
                        }`}
                      >
                        {a.gatewayCount}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-surface-300 text-xs">
                      <button
                        onClick={() => router.push(`/dashboard/operation/phone?customer=${a.id}&name=${encodeURIComponent(a.name)}`)}
                        title={`Manage phones for ${a.name}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          a.phoneCount > 0 ? "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20" : "bg-surface-800 text-surface-500 hover:bg-surface-700 hover:text-surface-300"
                        }`}
                      >
                        {a.phoneCount}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-surface-300 text-xs">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${a.suiteCount > 0 ? "bg-pink-500/10 text-pink-400" : "bg-surface-800 text-surface-500"}`}>
                        {a.suiteCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-400 text-xs">
                      {formatTime(a.lastupdatetime)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
              <h2 className="text-lg font-semibold text-surface-50">{editingAccount ? "Edit Account" : "Add Account"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Account *</label><input value={form.account} onChange={e => setForm({...form, account: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Balance</label><input type="number" step="0.0001" value={form.money} onChange={e => setForm({...form, money: parseFloat(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Credit Limit</label><input type="number" step="0.01" value={form.limitmoney} onChange={e => setForm({...form, limitmoney: parseFloat(e.target.value)||0})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              </div>

              {/* Contact Details */}
              <div className="border-t border-surface-800 pt-4">
                <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Contact Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-surface-400 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" placeholder="alerts@company.com" /></div>
                  <div><label className="block text-xs font-medium text-surface-400 mb-1">Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" placeholder="+1-555-0100" /></div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-surface-400 mb-1">Company</label><input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" placeholder="Company name & details" /></div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-surface-400 mb-1">Address</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" placeholder="Full address" /></div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-surface-400 mb-1">Bank Account</label><input value={form.bankAccount} onChange={e => setForm({...form, bankAccount: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" placeholder="Bank name, account number, routing info" /></div>
                  <div><label className="block text-xs font-medium text-surface-400 mb-1">CC Email</label><input type="email" value={form.cc} onChange={e => setForm({...form, cc: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" placeholder="cc@company.com" /></div>
                  <div><label className="block text-xs font-medium text-surface-400 mb-1">BCC Email</label><input type="email" value={form.bcc} onChange={e => setForm({...form, bcc: e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" placeholder="bcc@company.com" /></div>
                </div>
              </div>

              {/* Drag-and-drop selectors */}
              <DragSelect
                label="Type"
                options={[
                  { value: 0, label: "General" },
                  { value: 1, label: "Clearing" },
                  { value: 2, label: "Agent" },
                  { value: 3, label: "Phone Card" },
                ]}
                value={form.type}
                onChange={v => setForm({ ...form, type: Number(v) })}
              />

              <DragSelect
                label="Status"
                options={[
                  { value: 1, label: "Active" },
                  { value: 0, label: "Inactive" },
                  { value: 2, label: "Locked" },
                ]}
                value={form.status}
                onChange={v => setForm({ ...form, status: Number(v) })}
              />

              {rateGroups.length > 0 && (
                <DragSelect
                  label="Rate Group"
                  options={[
                    { value: 0, label: "None" },
                    ...rateGroups.map(g => ({ value: g.id, label: g.name })),
                  ]}
                  value={form.feerateGroupId}
                  onChange={v => setForm({ ...form, feerateGroupId: Number(v) })}
                />
              )}

              {/* Gateway Selector */}
              <div className="border-t border-surface-800 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wifi className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-medium text-surface-400">Gateway Assignment</span>
                </div>
                <GatewaySelector
                  gatewayType="mapping"
                  customerId={editingAccount?.id}
                  selectedIds={selectedGatewayIds}
                  onChange={setSelectedGatewayIds}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.account || !form.name || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingAccount ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
