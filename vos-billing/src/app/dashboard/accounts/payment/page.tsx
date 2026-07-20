"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Search, RefreshCw, DollarSign, ArrowUp, ArrowDown, History, Plus, Send, X, Calendar } from "lucide-react";

interface Customer { id: number; account: string; name: string; money: number; limitMoney: number; }
interface PaymentRecord { id: number; customerAccount: string; customerName: string; payMoney: number; customerMoney: number; time: number; memo: string; payType: number; type: number; loginName: string; }

export default function PaymentPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerAccount: "", amount: "", memo: "" });

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [custRes, histRes] = await Promise.all([
        fetch("/api/vos/payment"),
        fetch("/api/vos/payment?mode=history"),
      ]);
      const custData = await custRes.json();
      const histData = await histRes.json();
      setCustomers(custData.customers || []);
      setHistory(histData.history || []);
      if (custData.error || histData.error) setError(custData.error || histData.error);
    } catch { setError("Failed to load payment data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePayment = async () => {
    if (!form.customerAccount || !form.amount) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/vos/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerAccount: form.customerAccount, amount: parseFloat(form.amount), memo: form.memo, payType: 0 }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setShowModal(false); setForm({ customerAccount: "", amount: "", memo: "" }); fetchData(); }
    } catch { setError("Payment failed"); }
    finally { setSaving(false); }
  };

  const formatMoney = (v: number) => {
    const abs = Math.abs(v); const s = abs.toFixed(4);
    return v < 0 ? `-$${s}` : `$${s}`;
  };
  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const parseDate = (d: string) => d ? Math.floor(new Date(d).getTime() / 1000) : 0;
  const from = parseDate(startDate);
  const parsedEnd = parseDate(endDate);
  const to = parsedEnd ? parsedEnd + 86400 : 0; // end of day

  const filteredHistory = history.filter(h => {
    const matchesSearch = h.customerName.toLowerCase().includes(search.toLowerCase()) ||
      h.customerAccount.toLowerCase().includes(search.toLowerCase());
    const matchesDate = (!from || h.time >= from) && (!to || h.time <= to);
    return matchesSearch && matchesDate;
  });

  const totalTopup = filteredHistory.reduce((s, h) => s + (h.payMoney > 0 ? h.payMoney : 0), 0);
  const totalDeduct = filteredHistory.reduce((s, h) => s + (h.payMoney < 0 ? Math.abs(h.payMoney) : 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Payment</h1>
          <p className="text-surface-400 text-sm mt-1">Customer balance top-up & deduction</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setForm({ customerAccount: "", amount: "", memo: "" }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">
            <Plus className="w-4 h-4" />New Payment
          </button>
          <button onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-brand-400" /></div>
            <div><p className="text-2xl font-bold text-surface-50">{filteredHistory.length}<span className="text-sm text-surface-500 ml-1">/ {history.length}</span></p><p className="text-xs text-surface-400">Transactions</p></div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><ArrowUp className="w-5 h-5 text-emerald-400" /></div>
            <div><p className="text-2xl font-bold text-emerald-400">${totalTopup.toFixed(2)}</p><p className="text-xs text-surface-400">Total Top-up</p></div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center"><ArrowDown className="w-5 h-5 text-red-400" /></div>
            <div><p className="text-2xl font-bold text-red-400">${totalDeduct.toFixed(2)}</p><p className="text-xs text-surface-400">Total Deduction</p></div>
          </div>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Search & Date Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input type="text" placeholder="Search by customer name or account..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
        </div>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(""); setEndDate(""); }}
            className="flex items-center gap-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-xs text-surface-400 hover:text-surface-50 transition-colors">
            <X className="w-3 h-3" />Clear dates
          </button>
        )}
      </div>

      {/* History Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Customer</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Amount</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Balance After</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Type</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Time</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Operator</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Memo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-800/50">
                  {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>)}
                </tr>
              )) : filteredHistory.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-surface-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-surface-600" />
                  <p className="text-lg font-medium">No payment records</p>
                </td></tr>
              ) : filteredHistory.map(h => (
                <tr key={h.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                  <td className="px-4 py-3">
                    <div className="text-surface-50 font-medium">{h.customerName}</div>
                    <div className="text-surface-500 text-xs font-mono">{h.customerAccount}</div>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-sm ${h.payMoney >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatMoney(h.payMoney)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-surface-300">{formatMoney(h.customerMoney)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${h.type === 1 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {h.type === 1 ? "Top-up" : "Deduction"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap">{formatTime(h.time)}</td>
                  <td className="px-4 py-3 text-surface-300 text-xs">{h.loginName}</td>
                  <td className="px-4 py-3 text-surface-400 text-xs max-w-[200px] truncate">{h.memo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <h2 className="text-lg font-semibold text-surface-50 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-400" />New Payment</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Customer *</label>
                <select value={form.customerAccount} onChange={e => setForm({ ...form, customerAccount: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50">
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.account}>{c.name} ({c.account}) — Balance: ${c.money.toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Amount * (positive = top-up, negative = deduction)</label>
                <input type="number" step="0.0001" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"
                  placeholder="e.g. 100.00 or -50.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Memo</label>
                <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none"
                  placeholder="Payment note..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handlePayment} disabled={!form.customerAccount || !form.amount || saving}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />{saving ? "Processing..." : "Submit Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
