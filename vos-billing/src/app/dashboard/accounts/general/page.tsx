"use client";

import { useState, useEffect } from "react";
import { Search, Users, Building2, Wallet, RefreshCw, ChevronDown, Plus, Edit2, Trash2, X, Loader2, Wifi } from "lucide-react";
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
}

const TYPE_LABELS: Record<number, string> = { 0: "Customer", 1: "Supplier", 2: "Agent" };
const STATUS_LABELS: Record<number, string> = { 0: "Inactive", 1: "Active", 2: "Locked" };

export default function GeneralAccountPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ account:"", name:"", money:0, limitmoney:0, type:0, status:1, feerateGroupId: 0 });
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
  }, [debouncedSearch, typeFilter]);

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
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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
    setForm({ account: a.account, name: a.name, money: a.money, limitmoney: a.limitmoney, type: a.type, status: a.status, feerateGroupId: a.feerateGroupId || 0 });
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

  const openAdd = () => {
    setEditingAccount(null);
    setForm({ account: "", name: "", money: 0, limitmoney: 0, type: 0, status: 1, feerateGroupId: 0 });
    setSelectedGatewayIds([]);
    setShowModal(true);
  };

  const totalBalance = accounts.reduce((s, a) => s + a.money, 0);
  const activeCount = accounts.filter((a) => a.status === 1).length;
  const supplierCount = accounts.filter((a) => a.type === 1).length;
  const customerCount = accounts.filter((a) => a.type === 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">General Account</h1>
          <p className="text-surface-400 text-sm mt-1">Customer & Supplier account management</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
          <button
            onClick={fetchAccounts}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
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
              <p className="text-2xl font-bold text-surface-50">{customerCount}</p>
              <p className="text-xs text-surface-400">Customers</p>
            </div>
          </div>
          <p className="text-xs text-surface-500">+{supplierCount} suppliers</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Search by name or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 transition-colors cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="0">Customer</option>
            <option value="1">Supplier</option>
            <option value="2">Agent</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Account</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Type</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Balance</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Credit Limit</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Rate Group</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Last Updated</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-800/50">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-surface-500">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-surface-600" />
                    <p>No accounts found</p>
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 text-surface-500 text-xs">{a.id}</td>
                    <td className="px-4 py-3 text-surface-300 font-mono text-xs">{a.account}</td>
                    <td className="px-4 py-3 text-surface-50 font-medium">{a.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        a.type === 1 ? "bg-amber-500/10 text-amber-400" :
                        a.type === 2 ? "bg-violet-500/10 text-violet-400" :
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

              {/* Drag-and-drop selectors */}
              <DragSelect
                label="Type"
                options={[
                  { value: 0, label: "Customer" },
                  { value: 1, label: "Supplier" },
                  { value: 2, label: "Agent" },
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
