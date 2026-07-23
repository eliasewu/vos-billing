"use client";

import { useState, useEffect } from "react";
import { UserCog, DollarSign, Users, Plus, Edit2, Trash2, X, Loader2, RefreshCw } from "lucide-react";
import DataTable from "@/components/DataTable";
import { moneyRender, actionsRender, statusToggleRender } from "@/components/DataTableHelpers";

interface Agent { id: number; name: string; account: string; money: number; limitMoney: number; rate: number; status: number; parentId: number; parentName: string; memo: string; }

export default function AgentAccountPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", account: "", password: "", money: 0, limitMoney: 0, rate: 0, status: 0, parentId: 0, memo: "" });
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const fetchAgents = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/agents");
      const data = await res.json();
      if (data.error) setError(data.error); else setAgents(data.agents || []);
    } catch { setError("Failed to load agents"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingAgent) {
        const res = await fetch("/api/vos/agents", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingAgent.id, ...form }) });
        const data = await res.json();
        if (data.error) setError(data.error);
        else { setShowModal(false); setEditingAgent(null); fetchAgents(); }
      } else {
        const res = await fetch("/api/vos/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const data = await res.json();
        if (data.error) setError(data.error);
        else { setShowModal(false); setEditingAgent(null); fetchAgents(); }
      }
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (id: number, currentStatus: number) => {
    const newStatus = currentStatus === 0 ? 1 : 0;
    setTogglingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch("/api/vos/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setAgents(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch { setError("Failed to toggle status"); }
    finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this agent?")) return;
    try { await fetch(`/api/vos/agents?id=${id}`, { method: "DELETE" }); fetchAgents(); } catch { setError("Failed to delete"); }
  };

  const openEdit = (a: Agent) => {
    setEditingAgent(a);
    setForm({ name: a.name, account: a.account, password: "", money: a.money, limitMoney: a.limitMoney, rate: a.rate, status: a.status, parentId: a.parentId, memo: a.memo || "" });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingAgent(null);
    setForm({ name: "", account: "", password: "", money: 0, limitMoney: 0, rate: 0, status: 0, parentId: 0, memo: "" });
    setShowModal(true);
  };

  const formatMoney = (v: number) => `$${v.toFixed(4)}`;
  const totalBalance = agents.reduce((s, a) => s + a.money, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Agent Account</h1><p className="text-surface-400 text-sm mt-1">{agents.length} agents</p></div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Agent</button>
          <button onClick={fetchAgents} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><UserCog className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{agents.length}</p><p className="text-xs text-surface-400">Total Agents</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{agents.filter(a => a.status === 0).length}</p><p className="text-xs text-surface-400">Active</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-400" /></div><div><p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatMoney(totalBalance)}</p><p className="text-xs text-surface-400">Total Balance</p></div></div></div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <DataTable
        columns={[
          { key: "id", label: "#", render: (a: Agent) => <span className="text-surface-500 text-xs">{a.id}</span> },
          { key: "name", label: "Name", render: (a: Agent) => <span className="text-surface-50 font-medium">{a.name}</span> },
          { key: "account", label: "Account", render: (a: Agent) => <span className="text-surface-300 font-mono text-xs">{a.account}</span> },
          { key: "money", label: "Balance", textAlign: "right" as const, render: moneyRender((a: Agent) => a.money) },
          { key: "limitMoney", label: "Limit", textAlign: "right" as const, render: (a: Agent) => (
            <span className="text-surface-300 font-mono text-sm">${a.limitMoney.toFixed(2)}</span>
          )},
          { key: "rate", label: "Rate %", textAlign: "right" as const, render: (a: Agent) => <span className="text-surface-300">{a.rate}%</span> },
          { key: "status", label: "Status", textAlign: "center" as const, render: statusToggleRender({
            getId: (a) => a.id, getStatus: (a) => a.status, onToggle: handleToggleStatus, togglingIds,
            labels: { 0: "Active", 1: "Inactive" },
          }) },
          { key: "parentName", label: "Parent", render: (a: Agent) => <span className="text-surface-400 text-xs">{a.parentName || "—"}</span> },
          { key: "actions", label: "Actions", textAlign: "center" as const, render: actionsRender(openEdit, (a) => handleDelete(a.id)) },
        ]}
        data={agents}
        searchKey="name"
        loading={loading}
        emptyIcon={<UserCog className="w-10 h-10 text-surface-600" />}
        emptyMessage="No agents found"
        pageSize={15}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingAgent ? "Edit Agent" : "Add Agent"}</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Account *</label><input value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                {!editingAgent && <div><label className="block text-xs font-medium text-surface-400 mb-1">Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>}
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Balance</label><input type="number" step="0.0001" value={form.money} onChange={e => setForm({ ...form, money: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Credit Limit</label><input type="number" step="0.01" value={form.limitMoney} onChange={e => setForm({ ...form, limitMoney: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Commission Rate</label><input type="number" step="0.1" value={form.rate} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"><option value={0}>Active</option><option value={1}>Inactive</option></select></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.name || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingAgent ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
