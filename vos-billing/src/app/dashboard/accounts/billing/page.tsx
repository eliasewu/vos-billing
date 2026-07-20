"use client";

import { useState, useEffect } from "react";
import { FileText, RefreshCw, DollarSign, PhoneCall, Timer, Plus, Edit2, Trash2, X, Zap, Loader2 } from "lucide-react";

interface Bill { id: number; customerId: number; customerName: string; billDate: string; totalCalls: number; totalDuration: number; totalFee: number; status: number; memo: string; }

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: 0, billDate: new Date().toISOString().slice(0, 10), totalCalls: 0, totalDuration: 0, totalFee: 0, memo: "" });
  const [generating, setGenerating] = useState(false);
  const [genDate, setGenDate] = useState(new Date().toISOString().slice(0, 10));
  const [success, setSuccess] = useState("");

  const fetchBills = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/billing");
      const data = await res.json();
      if (data.error) setError(data.error); else setBills(data.bills || []);
    } catch { setError("Failed to load billing records"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBills(); }, []);

  const handleGenerate = async () => {
    setGenerating(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/billing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: genDate }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setSuccess(data.message || `Generated ${data.billsCreated} bills from ${data.cdrsProcessed} CDR records`);
        setTimeout(() => setSuccess(""), 6000);
        fetchBills();
      }
    } catch { setError("Failed to generate bills"); }
    finally { setGenerating(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Note: API supports POST/DELETE only; for edits, delete+recreate
      if (editingBill) { await fetch(`/api/vos/billing?id=${editingBill.id}`, { method: "DELETE" }); }
      await fetch("/api/vos/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowModal(false); setEditingBill(null); fetchBills();
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this billing record?")) return;
    try { await fetch(`/api/vos/billing?id=${id}`, { method: "DELETE" }); fetchBills(); } catch { setError("Failed to delete"); }
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
  };

  const totalFee = bills.reduce((s, b) => s + b.totalFee, 0);
  const totalCalls = bills.reduce((s, b) => s + b.totalCalls, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Billing</h1><p className="text-surface-400 text-sm mt-1">Customer billing records</p></div>
        <div className="flex items-center gap-2">
          {/* Generate Bills */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={genDate}
              onChange={(e) => setGenDate(e.target.value)}
              className="px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              title="Auto-generate bills from CDR records"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {generating ? "Generating..." : "Generate Bills"}
            </button>
          </div>
          <button onClick={() => { setEditingBill(null); setForm({ customerId: 0, billDate: new Date().toISOString().slice(0, 10), totalCalls: 0, totalDuration: 0, totalFee: 0, memo: "" }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Bill</button>
          <button onClick={fetchBills} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><FileText className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{bills.length}</p><p className="text-xs text-surface-400">Bills</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-emerald-400">${totalFee.toFixed(2)}</p><p className="text-xs text-surface-400">Total Fees</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><PhoneCall className="w-5 h-5 text-amber-400" /></div><div><p className="text-2xl font-bold text-surface-50">{totalCalls.toLocaleString()}</p><p className="text-xs text-surface-400">Total Calls</p></div></div></div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-sm text-emerald-400">{success}</p>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-surface-800">
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">#</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Customer</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Bill Date</th>
              <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Calls</th>
              <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Duration</th>
              <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Fee</th>
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase">Status</th>
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase w-24">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i} className="border-b border-surface-800/50">{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>)}</tr>))
                : bills.length === 0 ? (<tr><td colSpan={8} className="px-4 py-12 text-center text-surface-500"><FileText className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No billing records</p></td></tr>)
                  : bills.map(b => (
                    <tr key={b.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                      <td className="px-4 py-3 text-surface-500 text-xs">{b.id}</td>
                      <td className="px-4 py-3 text-surface-50 font-medium">{b.customerName || `Customer #${b.customerId}`}</td>
                      <td className="px-4 py-3 text-surface-300 text-xs">{b.billDate}</td>
                      <td className="px-4 py-3 text-right text-surface-300">{b.totalCalls?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-surface-300 font-mono text-xs">{formatDuration(b.totalDuration || 0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-emerald-400">${Number(b.totalFee || 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${b.status === 1 ? "bg-emerald-500/10 text-emerald-400" : b.status === 0 ? "bg-amber-500/10 text-amber-400" : "bg-surface-800 text-surface-500"}`}>{b.status === 1 ? "Paid" : b.status === 0 ? "Pending" : "Draft"}</span></td>
                      <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => { setEditingBill(b); setForm({ customerId: b.customerId, billDate: b.billDate, totalCalls: b.totalCalls, totalDuration: b.totalDuration || 0, totalFee: b.totalFee || 0, memo: b.memo || "" }); setShowModal(true); }} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete(b.id)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingBill ? "Edit Bill" : "Add Bill"}</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID</label><input type="number" value={form.customerId} onChange={e => setForm({ ...form, customerId: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Bill Date</label><input type="date" value={form.billDate} onChange={e => setForm({ ...form, billDate: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Total Calls</label><input type="number" value={form.totalCalls} onChange={e => setForm({ ...form, totalCalls: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Duration (s)</label><input type="number" value={form.totalDuration} onChange={e => setForm({ ...form, totalDuration: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Total Fee</label><input type="number" step="0.0001" value={form.totalFee} onChange={e => setForm({ ...form, totalFee: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingBill ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
