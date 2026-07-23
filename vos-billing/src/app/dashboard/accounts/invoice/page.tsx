"use client";

import { useState, useEffect } from "react";
import {
  FileText, Download, Loader2, X, RefreshCw, Search, Building2, Wallet,
  DollarSign, PhoneCall, Timer, Calendar, ChevronDown, Receipt, FileDown, Mail,
} from "lucide-react";

interface Customer {
  id: number;
  name: string;
  account: string;
  balance: number;
  creditLimit: number;
}

interface InvoiceItem {
  callee: string;
  startTime: string;
  duration: number;
  rateUsed: number;
  charge: number;
  endReason: number;
}

interface InvoiceResult {
  customer: {
    id: number;
    account: string;
    name: string;
    balance: number;
    creditLimit: number;
    rateGroupId: number;
    email: string;
  };
  invoice: {
    startDate: string;
    endDate: string;
    calls: number;
    totalDuration: number;
    totalCost: number;
    increment: number;
    items: InvoiceItem[];
    areaSummary: Array<{ prefix: string; areacode: string; areaName: string; calls: number; totalDuration: number; totalCost: number }>;
    partitions: number;
    hasMore: boolean;
  };
  message?: string;
}

export default function InvoiceGeneratorPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  // supplier = clearing type customers; client = general type
  const [customerType, setCustomerType] = useState<"client" | "supplier">("client");
  const [selectedCustomer, setSelectedCustomer] = useState<number>(0);
  const [customerSearch, setCustomerSearch] = useState("");

  // Date range
  const [periodMode, setPeriodMode] = useState<"daily" | "weekly" | "monthly" | "custom">("daily");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Results
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchCustomers = async (type?: string) => {
    setLoadingCustomers(true);
    try {
      const url = type ? `/api/vos/customers?type=${type}` : "/api/vos/customers";
      const res = await fetch(url);
      const data = await res.json();
      const list: Customer[] = (data.customers || []).map((c: { id: number; customer_name?: string; name?: string; account?: string; balance?: number; creditLimit?: number }) => ({
        id: c.id,
        name: c.customer_name || c.name || "",
        account: c.account || c.customer_name || "",
        balance: c.balance || 0,
        creditLimit: c.creditLimit || 0,
      }));
      setCustomers(list);
      if (list.length > 0 && selectedCustomer === 0) setSelectedCustomer(list[0].id);
      else if (list.length > 0 && !list.find(c => c.id === selectedCustomer)) setSelectedCustomer(list[0].id);
    } catch {
      setError("Failed to load customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  // Re-fetch when type changes
  const handleTypeChange = (type: "client" | "supplier") => {
    setCustomerType(type);
    setSelectedCustomer(0);
    setResult(null);
    fetchCustomers(type === "client" ? "0" : "1");
  };

  const switchToClient = () => handleTypeChange("client");
  const switchToSupplier = () => handleTypeChange("supplier");

  // Apply period presets
  const applyPeriod = (mode: string) => {
    setPeriodMode(mode as any);
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    switch (mode) {
      case "daily":
        setStartDate(fmt(today));
        setEndDate(fmt(today));
        break;
      case "weekly": {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(fmt(weekAgo));
        setEndDate(fmt(today));
        break;
      }
      case "monthly": {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        setStartDate(fmt(monthAgo));
        setEndDate(fmt(today));
        break;
      }
    }
  };

  const handleGenerate = async () => {
    if (!selectedCustomer) { setError("Please select a customer"); return; }
    setGenerating(true); setError(""); setSuccess(""); setResult(null);

    try {
      const res = await fetch("/api/vos/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selectedCustomer, startDate, endDate }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResult(data);
      if (data.message) setSuccess(data.message);
    } catch {
      setError("Failed to generate invoice");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedCustomer) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/vos/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selectedCustomer, startDate, endDate, pdf: true }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${selectedCustomer}_${startDate}_${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("Invoice PDF downloaded");
    } catch {
      setError("PDF download failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleEmail = async () => {
    if (!selectedCustomer) return;
    setGenerating(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selectedCustomer, startDate, endDate, email: true }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      if (data.emailSent) {
        setSuccess(data.emailMessage || "Invoice emailed successfully");
        setResult(data);
      } else if (data.emailError) {
        setError(`Email failed: ${data.emailError}`);
        setResult(data);
      }
    } catch {
      setError("Failed to send email");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedCustomer) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/vos/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selectedCustomer, startDate, endDate, download: true }),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${selectedCustomer}_${startDate}_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("Invoice downloaded");
    } catch {
      setError("Download failed");
    } finally {
      setGenerating(false);
    }
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m ${s % 60}s` : `${m}m ${s % 60}s`;
  };

  const formatMoney = (v: number) => `$${v.toFixed(4)}`;

  const selectedCust = customers.find(c => c.id === selectedCustomer);
  const filtered = customers.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.account.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-400" />Invoice Generator
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Generate invoices for clients & suppliers from CDR data
          </p>
        </div>
        <button onClick={() => fetchCustomers()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">
          <RefreshCw className={`w-4 h-4 ${loadingCustomers ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><button onClick={() => setError("")} className="p-0.5 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2"><button onClick={() => setSuccess("")} className="p-0.5 hover:text-emerald-300"><X className="w-3.5 h-3.5" /></button>{success}</div>}

      {/* Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Selection */}
        <div className="lg:col-span-1 bg-surface-900 border border-surface-700/50 rounded-xl p-5 space-y-4">
          <h3 className="text-surface-50 font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-400" />Customer
          </h3>

          {/* Type Toggle */}
          <div className="flex rounded-lg bg-surface-800 p-1">
            <button
              onClick={switchToClient}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                customerType === "client" ? "bg-brand-600 text-white" : "text-surface-400 hover:text-surface-200"
              }`}
            >
              Client
            </button>
            <button
              onClick={switchToSupplier}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                customerType === "supplier" ? "bg-brand-600 text-white" : "text-surface-400 hover:text-surface-200"
              }`}
            >
              Supplier
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text" placeholder="Search customers..." value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          {/* Customer List */}
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {loadingCustomers ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-800 rounded-lg animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <p className="text-surface-500 text-sm text-center py-4">No customers found</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCustomer === c.id
                      ? "bg-brand-600/20 border border-brand-500/30 text-surface-50"
                      : "bg-surface-800/50 border border-transparent text-surface-300 hover:bg-surface-800"
                  }`}
                >
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-surface-500 flex justify-between mt-0.5">
                    <span>{c.account}</span>
                    <span className={c.balance >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {formatMoney(c.balance)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Selected Customer Info */}
          {selectedCust && (
            <div className="border-t border-surface-800 pt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-surface-500">Account</span>
                <span className="text-surface-300 font-mono">{selectedCust.account}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-surface-500">Balance</span>
                <span className={`font-mono ${selectedCust.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatMoney(selectedCust.balance)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-surface-500">Credit Limit</span>
                <span className="text-surface-300 font-mono">${selectedCust.creditLimit.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Date Range & Generation */}
        <div className="lg:col-span-2 bg-surface-900 border border-surface-700/50 rounded-xl p-5 space-y-4">
          <h3 className="text-surface-50 font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />Invoice Period
          </h3>

          {/* Period Mode Buttons */}
          <div className="flex flex-wrap gap-2">
            {([
              { key: "daily", label: "Daily", icon: Calendar },
              { key: "weekly", label: "Weekly", icon: Calendar },
              { key: "monthly", label: "Monthly", icon: Calendar },
              { key: "custom", label: "Custom Range", icon: Calendar },
            ] as const).map(p => (
              <button
                key={p.key}
                onClick={() => applyPeriod(p.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodMode === p.key
                    ? "bg-amber-600/20 border border-amber-500/30 text-amber-300"
                    : "bg-surface-800 border border-surface-700/50 text-surface-400 hover:text-surface-200"
                }`}
              >
                <p.icon className="w-4 h-4" />{p.label}
              </button>
            ))}
          </div>

          {/* Date Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Start Date</label>
              <input
                type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPeriodMode("custom"); }}
                className="w-full px-3 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">End Date</label>
              <input
                type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPeriodMode("custom"); }}
                className="w-full px-3 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedCustomer}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              {generating ? "Generating..." : "Generate Invoice"}
            </button>
            {result && (
              <>
                <button
                  onClick={handleEmail}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Email Invoice
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Download PDF
                </button>
                <button
                  onClick={handleDownload}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 hover:bg-surface-700 text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />Download CSV
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Result */}
      {result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-surface-50">{result.invoice.calls.toLocaleString()}</p>
                  <p className="text-xs text-surface-400">Total Calls</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-surface-50 font-mono">{formatDuration(result.invoice.totalDuration)}</p>
                  <p className="text-xs text-surface-400">Total Duration</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{formatMoney(result.invoice.totalCost)}</p>
                  <p className="text-xs text-surface-400">Total Cost</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-surface-50 truncate">{result.customer.name}</p>
                  <p className="text-xs text-surface-400">{result.customer.account}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className={`text-lg font-bold font-mono ${result.customer.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatMoney(result.customer.balance)}
                  </p>
                  <p className="text-xs text-surface-400">Balance After</p>
                </div>
              </div>
            </div>
          </div>

          {/* Area / Prefix Summary Table */}
          {result.invoice.areaSummary && result.invoice.areaSummary.length > 0 && (
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-800">
                <h3 className="text-surface-50 font-semibold text-sm flex items-center gap-2">
                  <Timer className="w-4 h-4 text-cyan-400" />Summary by Area Code / Prefix
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-800">
                      <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs uppercase">Prefix</th>
                      <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs uppercase">Area Code</th>
                      <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs uppercase">Area Name</th>
                      <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs uppercase">Calls</th>
                      <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs uppercase">Minutes</th>
                      <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.invoice.areaSummary.map((s, i) => (
                      <tr key={i} className={`border-b border-surface-800/50 ${i % 2 === 0 ? "bg-surface-800/20" : ""}`}>
                        <td className="px-4 py-2 text-surface-50 font-mono text-xs">{s.prefix || "—"}</td>
                        <td className="px-4 py-2 text-surface-300 font-mono text-xs">{s.areacode || "—"}</td>
                        <td className="px-4 py-2 text-surface-300 text-xs">{s.areaName || "—"}</td>
                        <td className="px-4 py-2 text-right text-surface-300 text-xs">{s.calls}</td>
                        <td className="px-4 py-2 text-right text-surface-300 font-mono text-xs">{formatDuration(s.totalDuration)}</td>
                        <td className="px-4 py-2 text-right text-emerald-400 font-mono text-xs font-medium">{formatMoney(s.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoice Table */}
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-800 flex items-center justify-between">
              <h3 className="text-surface-50 font-semibold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />Invoice Items
              </h3>
              <span className="text-xs text-surface-500">
                {result.invoice.startDate} → {result.invoice.endDate} · {result.invoice.partitions} CDR partition{result.invoice.partitions !== 1 ? "s" : ""}
                {result.invoice.hasMore ? ` · Showing first 100 of ${result.invoice.calls}` : ""}
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-900">
                  <tr className="border-b border-surface-800">
                    <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Called Number</th>
                    <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Start Time</th>
                    <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Duration</th>
                    <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Rate/Min</th>
                    <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {result.invoice.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-surface-500">
                        <Receipt className="w-10 h-10 mx-auto mb-2 text-surface-600" />
                        <p>No call data found for this period</p>
                      </td>
                    </tr>
                  ) : (
                    result.invoice.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                        <td className="px-4 py-2.5 text-surface-500 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-surface-50 font-mono text-xs">{item.callee || "—"}</td>
                        <td className="px-4 py-2.5 text-surface-400 text-xs">
                          {item.startTime ? new Date(item.startTime).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-surface-300 font-mono text-xs">{formatDuration(item.duration)}</td>
                        <td className="px-4 py-2.5 text-right text-surface-400 font-mono text-xs">${item.rateUsed.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-400 font-mono text-xs font-medium">${item.charge.toFixed(6)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {result.invoice.items.length > 0 && (
              <div className="px-4 py-2.5 border-t border-surface-800 flex justify-between text-xs">
                <span className="text-surface-500">Total</span>
                <span className="text-emerald-400 font-mono font-bold">{formatMoney(result.invoice.totalCost)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
