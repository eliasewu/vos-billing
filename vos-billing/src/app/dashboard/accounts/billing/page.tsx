"use client";

import { useState, useEffect } from "react";
import { FileText, DollarSign, PhoneCall, Plus, Edit2, Trash2, X, Zap, Loader2, RefreshCw } from "lucide-react";
import DataTable from "@/components/DataTable";
import { moneyRender, actionsRender } from "@/components/DataTableHelpers";
import { safeErrorString } from "@/lib/utils";

interface Bill { id: number; customerId: number; customerName: string; billDate: string; periodStart: string | null; periodEnd: string | null; totalCalls: number; totalDuration: number; totalFee: number; status: number; memo: string; addtime: number; }

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: 0, billDate: new Date().toISOString().slice(0, 10), periodStart: "", periodEnd: "", totalCalls: 0, totalDuration: 0, totalFee: 0, memo: "" });
  const [generating, setGenerating] = useState(false);
  const [genDate, setGenDate] = useState(new Date().toISOString().slice(0, 10));
  const [success, setSuccess] = useState("");

  const fetchBills = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/billing");
      const data = await res.json();
      if (data.error) setError(safeErrorString(data.error)); else setBills(data.bills || []);
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
      if (data.error) setError(safeErrorString(data.error));
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
      if (editingBill) {
        const res = await fetch("/api/vos/billing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingBill.id, ...form }) });
        const data = await res.json();
        if (data.error) setError(safeErrorString(data.error));
        else { setShowModal(false); setEditingBill(null); fetchBills(); }
      } else {
        await fetch("/api/vos/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        setShowModal(false); setEditingBill(null); fetchBills();
      }
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
          <button onClick={() => { setEditingBill(null); setForm({ customerId: 0, billDate: new Date().toISOString().slice(0, 10), periodStart: "", periodEnd: "", totalCalls: 0, totalDuration: 0, totalFee: 0, memo: "" }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Bill</button>
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

      <DataTable
        columns={[
          { key: "id", label: "#", render: (b: Bill) => <span className="text-surface-500 text-xs">{b.id}</span> },
          { key: "customerName", label: "Customer", render: (b: Bill) => (
            <span className="text-surface-50 font-medium">{b.customerName || `Customer #${b.customerId}`}</span>
          )},
          { key: "billDate", label: "Bill Date", render: (b: Bill) => <span className="text-surface-300 text-xs">{b.billDate}</span> },
          { key: "periodStart", label: "Period", render: (b: Bill) => (
            <span className="text-surface-400 text-xs">{b.periodStart ? `${b.periodStart} → ${b.periodEnd||"..."}` : "—"}</span>
          )},
          { key: "totalCalls", label: "Calls", textAlign: "right" as const, render: (b: Bill) => (
            <span className="text-surface-300">{b.totalCalls?.toLocaleString()}</span>
          )},
          { key: "totalDuration", label: "Duration", textAlign: "right" as const, render: (b: Bill) => (
            <span className="text-surface-300 font-mono text-xs">{formatDuration(b.totalDuration || 0)}</span>
          )},
          { key: "totalFee", label: "Fee", textAlign: "right" as const, render: moneyRender((b: Bill) => Number(b.totalFee || 0), 4) },
          { key: "addtime", label: "Created", render: (b: Bill) => (
            <span className="text-surface-400 text-xs">{b.addtime ? new Date(b.addtime * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</span>
          )},
          { key: "status", label: "Status", textAlign: "center" as const, render: (b: Bill) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              b.status === 1 ? "bg-emerald-500/10 text-emerald-400" : b.status === 0 ? "bg-amber-500/10 text-amber-400" : "bg-surface-800 text-surface-500"
            }`}>
              {b.status === 1 ? "Paid" : b.status === 0 ? "Pending" : "Draft"}
            </span>
          )},
          { key: "actions", label: "Actions", textAlign: "center" as const, render: actionsRender(
            (b) => { setEditingBill(b); setForm({ customerId: b.customerId, billDate: b.billDate, periodStart: b.periodStart || "", periodEnd: b.periodEnd || "", totalCalls: b.totalCalls, totalDuration: b.totalDuration || 0, totalFee: b.totalFee || 0, memo: b.memo || "" }); setShowModal(true); },
            (b) => handleDelete(b.id)
          ) },
        ]}
        data={bills}
        searchKey="customerName"
        loading={loading}
        emptyIcon={<FileText className="w-10 h-10 text-surface-600" />}
        emptyMessage="No billing records"
        pageSize={15}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingBill ? "Edit Bill" : "Add Bill"}</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID</label><input type="number" value={form.customerId} onChange={e => setForm({ ...form, customerId: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Bill Date</label><input type="date" value={form.billDate} onChange={e => setForm({ ...form, billDate: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Period Start</label><input type="date" value={form.periodStart} onChange={e => setForm({ ...form, periodStart: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Period End</label><input type="date" value={form.periodEnd} onChange={e => setForm({ ...form, periodEnd: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
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
