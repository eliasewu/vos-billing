"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, ChevronDown, ChevronRight, RefreshCw, Shield, Edit3, Save, X, Settings2, Plus, Trash2, Zap, Loader2 } from "lucide-react";

interface RateGroup {
  id: number;
  name: string;
  privilege: number;
  fakeminute: number;
  isprivate: number;
  memo: string;
  rate_count: number;
  min_rate: number;
  max_rate: number;
  creator_name: string;
  using_accounts: number;
}

interface Rate {
  id: number;
  prefix: string;
  areacode: string;
  locktype: number;
  fee: number;
  tax: number;
  period: number;
  ivrfee: number;
  ivrperiod: number;
  type: number;
  feerategroup_id: number;
  group_name: string;
  privilege: number;
  fakeminute: number;
  isprivate: number;
  area_name: string;
  plan_fee: number;
  plan_period: number;
  plan_segment: number;
  plan_execute_time: number;
}

const TYPE_LABELS: Record<number, string> = {
  0: "Standard",
  1: "Flat Rate",
  2: "Tiered",
  3: "Premium",
};

export default function RatesPage() {
  const [groups, setGroups] = useState<RateGroup[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [editForm, setEditForm] = useState<Partial<Rate>>({});
  const [saving, setSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RateGroup | null>(null);
  const [groupForm, setGroupForm] = useState<Partial<RateGroup>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ prefix: "", areacode: "", fee: 0, tax: 0, period: 6, fakeminute: 60, ivrfee: 0, ivrperiod: 0, type: 0, locktype: 0 });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState("");
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vos/rates");
      const data = await res.json();
      if (data.error) setError(data.error);
      else setGroups(data.rateGroups || []);
    } catch {
      setError("Failed to fetch rate groups");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRates = async (groupId: number) => {
    setLoadingRates(true);
    try {
      const res = await fetch(`/api/vos/rates?group_id=${groupId}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setRates(data.rates || []);
    } catch {
      setError("Failed to fetch rates");
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const openEdit = (rate: Rate) => {
    setEditingRate(rate);
    setEditForm({ ...rate });
    setError("");
  };

  const handleSave = async () => {
    if (!editingRate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vos/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingRate.id, ...editForm }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setEditingRate(null);
        setEditForm({});
        if (expandedGroup) fetchRates(expandedGroup);
        fetchGroups();
      }
    } catch {
      setError("Failed to save rate");
    } finally {
      setSaving(false);
    }
  };

  const openEditGroup = (group: RateGroup) => {
    setEditingGroup(group);
    setGroupForm({ name: group.name, fakeminute: group.fakeminute, isprivate: group.isprivate, memo: group.memo });
    setError("");
  };

  const handleSaveGroup = async () => {
    if (!editingGroup) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vos/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: editingGroup.id, ...groupForm }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setEditingGroup(null);
        setGroupForm({});
        fetchGroups();
        if (expandedGroup === editingGroup.id) fetchRates(editingGroup.id);
      }
    } catch {
      setError("Failed to save group");
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (id: number) => {
    if (expandedGroup === id) {
      setExpandedGroup(null);
      setRates([]);
    } else {
      setExpandedGroup(id);
      fetchRates(id);
    }
  };

  const handleAddRate = async () => {
    if (!expandedGroup) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vos/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feerategroup_id: expandedGroup, ...addForm }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setShowAddModal(false);
        setAddForm({ prefix: "", areacode: "", fee: 0, tax: 0, period: 6, fakeminute: 60, ivrfee: 0, ivrperiod: 0, type: 0, locktype: 0 });
        fetchRates(expandedGroup);
        fetchGroups();
      }
    } catch { setError("Failed to add rate"); }
    finally { setSaving(false); }
  };

  const handleApply = async () => {
    if (!confirm("Apply rate changes to active calls? This will reload the rate table.")) return;
    setApplying(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/rates/apply", { method: "POST" });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        const msg = data.message || "Rates applied successfully";
        setSuccess(msg);
        setTimeout(() => setSuccess(""), 5000);
      }
    } catch { setError("Failed to apply rates"); }
    finally { setApplying(false); }
  };

  const handleDeleteRate = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/vos/rates?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setDeletingId(null);
        if (expandedGroup) fetchRates(expandedGroup);
        fetchGroups();
      }
    } catch { setError("Failed to delete rate"); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Rate Management
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            {groups.length} rate groups • Prefix rates, billing cycles, taxes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            title="Apply rate changes to active calls"
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {applying ? "Applying..." : "Apply"}
          </button>
          <button
            onClick={fetchGroups}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      {/* Rate Groups */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center">
            <p className="text-surface-500">No rate groups found</p>
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className={`bg-surface-900 border rounded-xl overflow-hidden transition-colors ${
                expandedGroup === group.id
                  ? "border-emerald-500/30"
                  : "border-surface-700/50"
              }`}
            >
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-surface-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  {expandedGroup === group.id ? (
                    <ChevronDown className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-surface-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-surface-50 truncate">
                        {group.name}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditGroup(group); }}
                        className="p-1 rounded hover:bg-surface-700 text-surface-500 hover:text-cyan-400 transition-colors"
                        title="Edit group settings"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                      {group.isprivate === 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" />
                          Private
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-surface-500 mt-1 flex-wrap">
                      <span>{group.rate_count} prefixes</span>
                      {group.rate_count > 0 && (
                        <>
                          <span>·</span>
                          <span>Min: ${Number(group.min_rate).toFixed(6)}</span>
                          <span>·</span>
                          <span>Max: ${Number(group.max_rate).toFixed(4)}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>Fake min: {group.fakeminute}s</span>
                      {group.using_accounts > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-cyan-400">{group.using_accounts} account{group.using_accounts !== 1 ? "s" : ""}</span>
                        </>
                      )}
                      {group.creator_name && (
                        <>
                          <span>·</span>
                          <span className="text-surface-500">by {group.creator_name}</span>
                        </>
                      )}
                      {group.memo && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[200px]">{group.memo}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Rates Table */}
              {expandedGroup === group.id && (
                <div className="border-t border-surface-700/50">
                  <div className="px-5 py-3 bg-surface-800/20 flex items-center justify-between">
                    <span className="text-xs text-surface-500">{rates.length} rates</span>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Rate
                    </button>
                  </div>
                  {loadingRates ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                  ) : rates.length === 0 ? (
                    <p className="text-surface-500 text-sm text-center py-8">
                      No rates in this group
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface-800/30 border-b border-surface-700/50">
                            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-surface-400">#</th>
                            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-surface-400">Prefix</th>
                            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-surface-400">Area Code</th>
                            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-surface-400">Area Name</th>
                            <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase text-surface-400">Rate ($/min)</th>
                            <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase text-surface-400">Tax</th>
                            <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase text-surface-400">Cycle / Inc</th>
                            <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase text-surface-400">IVR Fee</th>
                            <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase text-surface-400">IVR Period</th>
                            <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase text-surface-400">Plan Rate</th>
                            <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase text-surface-400">Plan Cycle</th>
                            <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase text-surface-400">Type</th>
                            <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase text-surface-400">Status</th>
                            <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase text-surface-400 w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-800">
                          {rates.map((r, i) => (
                            <tr key={r.id} className={`hover:bg-surface-800/30 transition-colors ${r.locktype !== 0 ? "bg-red-500/5" : ""}`}>
                              <td className="px-3 py-2.5 text-surface-500 font-mono text-[11px]">{i + 1}</td>
                              <td className="px-3 py-2.5 font-mono text-emerald-400 font-medium text-xs">
                                {r.prefix}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-surface-300 text-xs">
                                {r.areacode || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-surface-300 text-xs">
                                {r.area_name || "—"}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-surface-50 text-right text-xs">
                                ${Number(r.fee).toFixed(6)}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-amber-400 text-right text-xs">
                                {r.tax > 0 ? `${(Number(r.tax) * 100).toFixed(1)}%` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                                  r.period === 1 && r.fakeminute === 1 ? "bg-emerald-500/10 text-emerald-400" :
                                  r.period === 6 && r.fakeminute === 6 ? "bg-blue-500/10 text-blue-400" :
                                  r.period === 30 && r.fakeminute === 1 ? "bg-amber-500/10 text-amber-400" :
                                  r.period === 60 && r.fakeminute === 1 ? "bg-purple-500/10 text-purple-400" :
                                  r.period === 60 && r.fakeminute === 60 ? "bg-cyan-500/10 text-cyan-400" :
                                  "bg-surface-800 text-surface-400"
                                }`}>
                                  {r.period}/{r.fakeminute}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-surface-400 text-right text-xs">
                                {r.ivrfee > 0 ? `$${Number(r.ivrfee).toFixed(4)}` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-surface-400 text-center text-xs">
                                {r.ivrperiod > 0 ? `${r.ivrperiod}s` : "—"}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-surface-50 text-right text-xs">
                                {r.plan_fee > 0 ? `$${Number(r.plan_fee).toFixed(6)}` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {r.plan_period > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 font-mono">{r.plan_period}s</span>
                                ) : (
                                  <span className="text-surface-600">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-800 text-surface-400">
                                  {TYPE_LABELS[r.type] || `Type ${r.type}`}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    r.locktype === 0
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : "bg-red-500/10 text-red-400"
                                  }`}
                                >
                                  {r.locktype === 0 ? "Active" : "Locked"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => openEdit(r)}
                                    className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-brand-400 transition-colors"
                                    title="Edit rate"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { if (confirm(`Delete rate ${r.prefix}?`)) handleDeleteRate(r.id); }}
                                    disabled={deletingId === r.id}
                                    className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                    title="Delete rate"
                                  >
                                    {deletingId === r.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
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
          ))
        )}
      </div>

      {/* Edit Rate Modal */}
      {editingRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) { setEditingRate(null); setEditForm({}); } }} />
          <div className="relative bg-surface-900 border border-surface-700 rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-surface-50">
                  Edit Rate — {editingRate.prefix}
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Group: {editingRate.group_name}
                </p>
              </div>
              <button
                onClick={() => { setEditingRate(null); setEditForm({}); }}
                disabled={saving}
                className="p-1 rounded text-surface-500 hover:text-surface-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Prefix */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Prefix</label>
                  <input
                    type="text"
                    value={editForm.prefix || ""}
                    onChange={(e) => setEditForm({ ...editForm, prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Area Code</label>
                  <input
                    type="text"
                    value={editForm.areacode || ""}
                    onChange={(e) => setEditForm({ ...editForm, areacode: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Fee & Tax */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Rate ($/min)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editForm.fee ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Tax (0–1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={editForm.tax ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, tax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Billing Cycle & Increment */}
              <div>
                <label className="block text-xs text-surface-400 mb-1.5">Billing Cycle & Increment</label>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {[[1,1,"1/1 - per second"],[6,6,"6/6"],[30,1,"30/1"],[60,1,"60/1"],[60,60,"60/60 - per minute"]].map(([p,i,label]) => (
                    <button key={label} type="button"
                      onClick={() => setEditForm({ ...editForm, period: p as number, fakeminute: i as number })}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        editForm.period === p && editForm.fakeminute === i
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                          : "bg-surface-800 text-surface-500 border border-surface-700 hover:border-surface-600"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-surface-500 mb-0.5">Cycle (s)</label>
                    <input type="number" value={editForm.period ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, period: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-surface-500 mb-0.5">Increment (s)</label>
                    <input type="number" value={editForm.fakeminute ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, fakeminute: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
              </div>

              {/* IVR Fee & IVR Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">IVR Fee ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.ivrfee ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, ivrfee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">IVR Period (s)</label>
                  <input
                    type="number"
                    value={editForm.ivrperiod ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, ivrperiod: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Type & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Rate Type</label>
                  <select
                    value={editForm.type ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, type: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Status</label>
                  <select
                    value={editForm.locktype ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, locktype: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-cyan-500"
                  >
                    <option value={0}>Active</option>
                    <option value={1}>Locked</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => { setEditingRate(null); setEditForm({}); }}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-surface-50 transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) { setEditingGroup(null); setGroupForm({}); } }} />
          <div className="relative bg-surface-900 border border-surface-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-surface-50">
                  Edit Rate Group
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  {editingGroup.name} ({editingGroup.rate_count} prefixes)
                </p>
              </div>
              <button
                onClick={() => { setEditingGroup(null); setGroupForm({}); }}
                disabled={saving}
                className="p-1 rounded text-surface-500 hover:text-surface-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Group Name</label>
                <input
                  type="text"
                  value={groupForm.name || ""}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Increment / Fake Min (s)</label>
                  <input
                    type="number"
                    min={1}
                    value={groupForm.fakeminute ?? ""}
                    onChange={(e) => setGroupForm({ ...groupForm, fakeminute: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Visibility</label>
                  <select
                    value={groupForm.isprivate ?? 0}
                    onChange={(e) => setGroupForm({ ...groupForm, isprivate: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-purple-500"
                  >
                    <option value={0}>Public</option>
                    <option value={1}>Private</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-surface-400 mb-1">Memo / Notes</label>
                <textarea
                  value={groupForm.memo || ""}
                  onChange={(e) => setGroupForm({ ...groupForm, memo: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 placeholder-surface-500 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Optional notes about this rate group..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => { setEditingGroup(null); setGroupForm({}); }}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-surface-50 transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Save Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rate Modal */}
      {showAddModal && expandedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) setShowAddModal(false); }} />
          <div className="relative bg-surface-900 border border-surface-700 rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Add New Rate
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Group: {groups.find((g) => g.id === expandedGroup)?.name || ""}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} disabled={saving} className="p-1 rounded text-surface-500 hover:text-surface-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Prefix *</label>
                  <input type="text" value={addForm.prefix} onChange={(e) => setAddForm({...addForm, prefix: e.target.value})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Area Code</label>
                  <input type="text" value={addForm.areacode} onChange={(e) => setAddForm({...addForm, areacode: e.target.value})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Rate ($/min)</label>
                  <input type="number" step="0.000001" value={addForm.fee||""} onChange={(e) => setAddForm({...addForm, fee: parseFloat(e.target.value)||0})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Tax (0–1)</label>
                  <input type="number" step="0.01" min={0} max={1} value={addForm.tax||""} onChange={(e) => setAddForm({...addForm, tax: parseFloat(e.target.value)||0})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              {/* Billing Cycle & Increment */}
              <div>
                <label className="block text-xs text-surface-400 mb-1.5">Billing Cycle & Increment</label>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {[[1,1,"1/1"],[6,6,"6/6"],[30,1,"30/1"],[60,1,"60/1"],[60,60,"60/60"]].map(([p,i,label]) => (
                    <button key={label} type="button"
                      onClick={() => setAddForm({...addForm, period: p as number, fakeminute: i as number})}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        addForm.period === p && addForm.fakeminute === i
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-surface-800 text-surface-500 border border-surface-700 hover:border-surface-600"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-surface-500 mb-0.5">Cycle (s)</label>
                    <input type="number" value={addForm.period||""} onChange={(e) => setAddForm({...addForm, period: parseInt(e.target.value)||0})}
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-surface-500 mb-0.5">Increment (s)</label>
                    <input type="number" value={addForm.fakeminute||""} onChange={(e) => setAddForm({...addForm, fakeminute: parseInt(e.target.value)||60})}
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">IVR Fee ($)</label>
                  <input type="number" step="0.0001" value={addForm.ivrfee||""} onChange={(e) => setAddForm({...addForm, ivrfee: parseFloat(e.target.value)||0})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">IVR Period (s)</label>
                  <input type="number" value={addForm.ivrperiod||""} onChange={(e) => setAddForm({...addForm, ivrperiod: parseInt(e.target.value)||0})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Rate Type</label>
                  <select value={addForm.type} onChange={(e) => setAddForm({...addForm, type: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500">
                    {Object.entries(TYPE_LABELS).map(([k,v]) => (<option key={k} value={k}>{v}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Status</label>
                  <select value={addForm.locktype} onChange={(e) => setAddForm({...addForm, locktype: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500">
                    <option value={0}>Active</option>
                    <option value={1}>Locked</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setShowAddModal(false)} disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleAddRate} disabled={saving || !addForm.prefix}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-surface-50 transition-colors">
                {saving ? (<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : (<Plus className="w-4 h-4" />)}
                {saving ? "Adding..." : "Add Rate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
