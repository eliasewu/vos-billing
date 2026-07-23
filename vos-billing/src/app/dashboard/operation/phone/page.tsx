"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Phone, Search, RefreshCw, Server, Plus, Edit2, Trash2, X, ArrowLeft, Upload, DollarSign, CheckCircle, Loader2 } from "lucide-react";
import DataTable from "@/components/DataTable";
import { actionsRender } from "@/components/DataTableHelpers";

interface VoipPhone { id: number; e164: string; capacity: number; callLevel: number; status: number; customerName: string | null; customerId: number; type: number; addtime: number; memo: string; }

export default function PhoneOperationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedCustomerId = parseInt(searchParams.get("customer") || "0");
  const preselectedCustomerName = searchParams.get("name") || "";

  const [phones, setPhones] = useState<VoipPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPhone, setEditingPhone] = useState<VoipPhone | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ e164: "", password: "", capacity: 2, callLevel: 0, customerId: preselectedCustomerId });

  // Bulk add
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({ prefix: "", startNum: 1, count: 10, digitCount: 11, password: "", capacity: 2, callLevel: 0, customerId: preselectedCustomerId });
  const [bulkProgress, setBulkProgress] = useState<{ status: string; total: number; done: number } | null>(null);

  // Bill deduction
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [deductForm, setDeductForm] = useState({ customerId: preselectedCustomerId, amount: 0, memo: "" });
  const [deducting, setDeducting] = useState(false);
  const [deductResult, setDeductResult] = useState<{ previousBalance: number; deduction: number; newBalance: number } | null>(null);

  const fetchPhones = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/phones");
      const data = await res.json();
      if (data.error) setError(data.error); else setPhones(data.phones || []);
    } catch { setError("Failed to load phones"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPhones(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingPhone) {
        const res = await fetch("/api/vos/phones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingPhone.id, ...form }) });
        const data = await res.json();
        if (data.error) setError(data.error);
        else { setShowModal(false); setEditingPhone(null); setSuccess(`Phone ${editingPhone.id} updated`); fetchPhones(); }
      } else {
        const res = await fetch("/api/vos/phones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const data = await res.json();
        if (data.error) setError(data.error);
        else { setShowModal(false); setEditingPhone(null); setSuccess(`Phone ${data.id} created`); fetchPhones(); }
      }
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleBulkAdd = async () => {
    setSaving(true); setError(""); setSuccess("");
    const numbers: string[] = [];
    const padLength = bulkForm.digitCount - bulkForm.prefix.length;
    const actualPad = Math.max(padLength, 1);
    
    for (let i = 0; i < bulkForm.count; i++) {
      const num = (bulkForm.startNum + i).toString().padStart(actualPad, "0");
      numbers.push(bulkForm.prefix + num);
    }

    setBulkProgress({ status: "Creating...", total: numbers.length, done: 0 });
    
    try {
      const res = await fetch("/api/vos/phones", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numbers,
          password: bulkForm.password || "",
          capacity: bulkForm.capacity,
          callLevel: bulkForm.callLevel,
          customerId: bulkForm.customerId,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setBulkProgress(null); }
      else {
        setSuccess(`Created ${data.succeeded} of ${data.total} phones`);
        setBulkProgress(null);
        setShowBulkModal(false);
        fetchPhones();
      }
    } catch { setError("Bulk creation failed"); setBulkProgress(null); }
    finally { setSaving(false); }
  };

  const handleDeduct = async () => {
    setDeducting(true); setError(""); setSuccess(""); setDeductResult(null);
    try {
      const res = await fetch("/api/vos/phones", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deductForm),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setDeductResult(data);
        setSuccess(`$${data.deduction.toFixed(4)} deducted. New balance: $${data.newBalance.toFixed(4)}`);
      }
    } catch { setError("Deduction failed"); }
    finally { setDeducting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this phone?")) return;
    try { await fetch(`/api/vos/phones?id=${id}`, { method: "DELETE" }); fetchPhones(); } catch { setError("Failed to delete"); }
  };

  const openEdit = (p: VoipPhone) => {
    setEditingPhone(p);
    setForm({ e164: p.e164, password: "", capacity: p.capacity, callLevel: p.callLevel, customerId: 0 });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingPhone(null);
    setForm({ e164: "", password: "", capacity: 2, callLevel: 0, customerId: preselectedCustomerId });
    setShowModal(true);
  };

  useEffect(() => {
    if (preselectedCustomerId > 0) {
      setEditingPhone(null);
      setForm({ e164: "", password: "", capacity: 2, callLevel: 0, customerId: preselectedCustomerId });
      setBulkForm({ prefix: "", startNum: 1, count: 10, digitCount: 11, password: "", capacity: 2, callLevel: 0, customerId: preselectedCustomerId });
      setDeductForm({ customerId: preselectedCustomerId, amount: 0, memo: "" });
      setShowModal(true);
      router.replace("/dashboard/operation/phone");
    }
  }, []);

  const filtered = phones.filter(p => p.e164.includes(search) || (p.customerName || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {preselectedCustomerName && (
              <button onClick={() => router.push("/dashboard/accounts/general")} className="p-1.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50" title="Back to accounts">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-surface-50">Phone Operation</h1>
          </div>
          <p className="text-surface-400 text-sm mt-1">
            {preselectedCustomerName ? (
              <>Account: <span className="text-surface-50 font-medium">{preselectedCustomerName}</span> (ID: {preselectedCustomerId}) — {phones.length} phone numbers registered</>
            ) : (
              `${phones.length} phone numbers registered — PC2Phone & Mobile Dial management`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add Phone</button>
          <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium"><Upload className="w-4 h-4" />Bulk Add</button>
          <button onClick={() => { setDeductResult(null); setShowDeductModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium"><DollarSign className="w-4 h-4" />Bill Deduct</button>
          <button onClick={fetchPhones} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Phone className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{phones.length}</p><p className="text-xs text-surface-400">Total Phones</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{phones.filter(p => p.status === 0).length}</p><p className="text-xs text-surface-400">Active</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Phone className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{phones.filter(p => p.customerName).length}</p><p className="text-xs text-surface-400">Assigned</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-400" /></div><div><p className="text-2xl font-bold text-surface-50">{new Set(phones.map(p => p.customerName).filter(Boolean)).size}</p><p className="text-xs text-surface-400">Accounts</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by number or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-emerald-400">{success}</p>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      <DataTable
        columns={[
          { key: "id", label: "#", render: (p: VoipPhone) => <span className="text-surface-500 text-xs">{p.id}</span> },
          { key: "e164", label: "E164 Number", render: (p: VoipPhone) => <span className="text-surface-50 font-mono font-medium">{p.e164}</span> },
          { key: "customerName", label: "Customer", render: (p: VoipPhone) => <span className="text-surface-300 text-xs">{p.customerName || "—"}</span> },
          { key: "capacity", label: "Capacity", textAlign: "right" as const, render: (p: VoipPhone) => <span className="text-surface-300">{p.capacity}</span> },
          { key: "callLevel", label: "Call Level", textAlign: "right" as const, render: (p: VoipPhone) => <span className="text-surface-300">{p.callLevel}</span> },
          { key: "type", label: "Type", textAlign: "center" as const, render: (p: VoipPhone) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 0 ? "bg-blue-500/10 text-blue-400" : "bg-violet-500/10 text-violet-400"}`}>
              {p.type === 0 ? "Phone" : p.type === 1 ? "SIP" : p.type}
            </span>
          )},
          { key: "addtime", label: "Created", render: (p: VoipPhone) => (
            <span className="text-surface-400 text-xs">{p.addtime ? new Date(p.addtime * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</span>
          )},
          { key: "memo", label: "Memo", render: (p: VoipPhone) => <span className="text-surface-500 text-xs truncate max-w-[120px] block">{p.memo || "—"}</span> },
          { key: "status", label: "Status", textAlign: "center" as const, render: (p: VoipPhone) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {p.status === 0 ? "Active" : "Inactive"}
            </span>
          )},
          { key: "actions", label: "Actions", textAlign: "center" as const, width: "6rem", render: actionsRender(openEdit, (p) => handleDelete(p.id)) },
        ]}
        data={phones}
        loading={loading}
        emptyIcon={<Phone className="w-10 h-10 text-surface-600" />}
        emptyMessage="No phones found"
        emptySubtitle="Use the search bar to find phones by number or customer"
        pageSize={20}
      />

      {/* Single Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50">{editingPhone ? "Edit Phone" : "Add Phone"}</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="block text-xs font-medium text-surface-400 mb-1">E164 Number *</label><input value={form.e164} onChange={e => setForm({ ...form, e164: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              {!editingPhone && <div><label className="block text-xs font-medium text-surface-400 mb-1">Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Call Level</label><input type="number" value={form.callLevel} onChange={e => setForm({ ...form, callLevel: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID</label><input type="number" value={form.customerId} onChange={e => setForm({ ...form, customerId: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.e164 || saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : editingPhone ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <h2 className="text-lg font-semibold text-surface-50 flex items-center gap-2"><Upload className="w-5 h-5 text-violet-400" />Bulk Add Phones</h2>
              <button onClick={() => setShowBulkModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-xs text-surface-500">Generate phone numbers using a prefix and sequential numbering.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-surface-400 mb-1">Country Prefix</label><input value={bulkForm.prefix} onChange={e => setBulkForm({ ...bulkForm, prefix: e.target.value })} placeholder="e.g. 8613" className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Start Number</label><input type="number" value={bulkForm.startNum} onChange={e => setBulkForm({ ...bulkForm, startNum: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Count</label><input type="number" min={1} max={1000} value={bulkForm.count} onChange={e => setBulkForm({ ...bulkForm, count: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Total Digits</label><input type="number" value={bulkForm.digitCount} onChange={e => setBulkForm({ ...bulkForm, digitCount: parseInt(e.target.value) || 11 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Password</label><input type="password" value={bulkForm.password} onChange={e => setBulkForm({ ...bulkForm, password: e.target.value })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Capacity per Phone</label><input type="number" value={bulkForm.capacity} onChange={e => setBulkForm({ ...bulkForm, capacity: parseInt(e.target.value) || 2 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID</label><input type="number" value={bulkForm.customerId} onChange={e => setBulkForm({ ...bulkForm, customerId: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              </div>
              {bulkForm.prefix && (
                <div className="p-3 rounded-lg bg-surface-800 text-xs text-surface-400 font-mono">
                  Preview: <span className="text-surface-50">{bulkForm.prefix}{String(bulkForm.startNum).padStart(Math.max(bulkForm.digitCount - bulkForm.prefix.length, 1), "0")}</span> → <span className="text-surface-50">{bulkForm.prefix}{String(bulkForm.startNum + bulkForm.count - 1).padStart(Math.max(bulkForm.digitCount - bulkForm.prefix.length, 1), "0")}</span> ({bulkForm.count} numbers)
                </div>
              )}
              {bulkProgress && (
                <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {bulkProgress.status} ({bulkProgress.done}/{bulkProgress.total})
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowBulkModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleBulkAdd} disabled={!bulkForm.prefix || saving || bulkForm.count < 1} className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Creating..." : `Create ${bulkForm.count} Phones`}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Deduction Modal */}
      {showDeductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <h2 className="text-lg font-semibold text-surface-50 flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-400" />Bill Deduction</h2>
              <button onClick={() => { setShowDeductModal(false); setDeductResult(null); }} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-xs text-surface-500">Deduct from customer account balance based on phone usage.</p>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Customer ID *</label><input type="number" value={deductForm.customerId} onChange={e => setDeductForm({ ...deductForm, customerId: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Deduction Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">$</span>
                  <input type="number" step="0.0001" min={0} value={deductForm.amount} onChange={e => setDeductForm({ ...deductForm, amount: parseFloat(e.target.value) || 0 })} className="w-full pl-8 pr-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
                </div>
              </div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><input value={deductForm.memo} onChange={e => setDeductForm({ ...deductForm, memo: e.target.value })} placeholder="Reason for deduction..." className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              {deductResult && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-surface-400">Previous Balance:</span><span className="text-surface-50 font-mono">${deductResult.previousBalance.toFixed(4)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-surface-400">Deduction:</span><span className="text-red-400 font-mono">-${deductResult.deduction.toFixed(4)}</span></div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-amber-500/20"><span className="text-surface-400">New Balance:</span><span className="text-emerald-400 font-mono">${deductResult.newBalance.toFixed(4)}</span></div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => { setShowDeductModal(false); setDeductResult(null); }} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleDeduct} disabled={!deductForm.customerId || deductForm.amount <= 0 || deducting} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{deducting ? "Processing..." : `Deduct $${deductForm.amount.toFixed(4)}`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
