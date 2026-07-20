"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard, Plus, Download, RefreshCw, Key, Copy, Check, X, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface PhoneCard {
  id: number;
  serialno: number;
  pin: string;
  password: string;
  money: number;
  usedaccount: string;
  expiretime: string;
  sold: number;
  locktype: number;
  producetime: string;
  suitename: string;
}

interface GeneratedCard {
  serialno: number;
  pin: string;
  password: string;
  amount: number;
  customerAccount: string;
  expireTime: string;
}

interface VOSCustomer {
  id: number;
  account: string;
  customer_name: string;
}

export default function PhoneCardPage() {
  const [cards, setCards] = useState<PhoneCard[]>([]);
  const [customers, setCustomers] = useState<VOSCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<Set<string>>(new Set());

  // Search & pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const pageSize = 50;

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [amount, setAmount] = useState(5);
  const [pinLength, setPinLength] = useState(12);
  const [prefix, setPrefix] = useState("");

  const fetchCards = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCustomer) params.set("customer_id", selectedCustomer);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      const res = await fetch(`/api/vos/phone-cards?${params.toString()}`);
      const data = await res.json();
      setCards(data.cards || []);
      setTotalCards(data.total || 0);
    } catch {
      setError("Failed to fetch cards");
    }
  }, [selectedCustomer, search, page]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/vos/customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {}
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchCards().finally(() => setLoading(false));
  }, [fetchCards]);

  // Reset page when search or customer changes
  useEffect(() => {
    setPage(1);
  }, [selectedCustomer, search]);

  const handleGenerate = async () => {
    if (!selectedCustomer) {
      setError("Please select a customer account");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const cust = customers.find((c) => c.account === selectedCustomer);
      const res = await fetch("/api/vos/phone-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerAccount: selectedCustomer,
          customerName: cust?.customer_name || selectedCustomer,
          quantity,
          amount,
          pinLength,
          prefix,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setGeneratedCards(data.cards || []);
        fetchCards();
      }
    } catch {
      setError("Failed to generate cards");
    } finally {
      setGenerating(false);
    }
  };

  const exportCSV = () => {
    const cardsToExport = generatedCards.length > 0 ? generatedCards : cards.map((c) => ({
      serialno: c.serialno,
      pin: c.pin,
      password: c.password,
      amount: c.money,
      customerAccount: c.usedaccount,
      expireTime: c.expiretime,
    }));

    if (cardsToExport.length === 0) return;

    const header = "Serial,PIN,Password,Amount,Account,Expiry\n";
    const rows = cardsToExport
      .map(
        (c) => `${c.serialno},${c.pin},${c.password},${c.amount},${c.customerAccount},${c.expireTime || ""}`
      )
      .join("\n");
    const csv = header + rows;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phone-cards-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied((prev) => new Set(prev).add(text));
    setTimeout(() => setCopied((prev) => {
      const next = new Set(prev);
      next.delete(text);
      return next;
    }), 2000);
  };

  const totalPages = Math.ceil(totalCards / pageSize) || 1;

  const getPageNumber = (i: number) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-400" />
            Phone Card
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Bulk phone card creation with PIN generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCards}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            disabled={cards.length === 0 && generatedCards.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-surface-50 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Generation Form */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-surface-50 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-purple-400" />
          Generate New Cards
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Customer *</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-purple-500"
            >
              <option value="">Select...</option>
              {customers.map((c) => (
                <option key={c.account} value={c.account}>
                  {c.account} - {c.customer_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min={0.01}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">PIN Length</label>
            <input
              type="number"
              min={6}
              max={20}
              value={pinLength}
              onChange={(e) => setPinLength(parseInt(e.target.value) || 12)}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Prefix</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. 123"
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedCustomer}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-surface-50 rounded-lg text-sm font-medium transition-colors"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Cards (latest batch) */}
      {generatedCards.length > 0 && (
        <div className="bg-surface-900 border border-emerald-500/20 rounded-xl overflow-hidden">
          <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/20 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Generated {generatedCards.length} Cards
            </h2>
            <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/30">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">PIN</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Password</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Expiry</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {generatedCards.map((c, i) => (
                  <tr key={c.serialno} className="hover:bg-surface-800/30">
                    <td className="px-4 py-2 text-surface-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-2 font-mono text-emerald-400 text-xs">{c.pin}</td>
                    <td className="px-4 py-2 font-mono text-surface-300 text-xs">{c.password}</td>
                    <td className="px-4 py-2 text-surface-50">${c.amount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-surface-400 text-xs">{new Date(c.expireTime).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => copyToClipboard(`${c.pin} / ${c.password}`)}
                        className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"
                      >
                        {copied.has(c.pin) ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Existing Cards */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-50 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-surface-400" />
              Existing Cards
            </h2>
            <span className="text-xs text-surface-500">{totalCards} cards</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PIN or account..."
              className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 placeholder-surface-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <div className="p-8 text-center text-surface-500">
            {search ? "No cards match your search." : "No phone cards found. Select a customer to view their cards."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/30">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Serial</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">PIN</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Password</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Account</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-surface-400">Expiry</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-surface-400">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {cards.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-800/30">
                    <td className="px-4 py-2 font-mono text-surface-400 text-xs">{c.serialno}</td>
                    <td className="px-4 py-2 font-mono text-surface-300 text-xs">{c.pin}</td>
                    <td className="px-4 py-2 font-mono text-surface-300 text-xs">{c.password}</td>
                    <td className="px-4 py-2 text-surface-50">${Number(c.money).toFixed(2)}</td>
                    <td className="px-4 py-2 text-surface-300">{c.usedaccount}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.sold === 1 ? "bg-amber-500/10 text-amber-400" :
                        c.locktype !== 0 ? "bg-red-500/10 text-red-400" :
                        "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {c.sold === 1 ? "Sold" : c.locktype !== 0 ? "Locked" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-surface-400 text-xs">
                      {c.expiretime ? new Date(c.expiretime).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => copyToClipboard(`${c.pin} / ${c.password}`)}
                        className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50 transition-colors"
                      >
                        {copied.has(c.pin) ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCards > pageSize && (
          <div className="px-4 py-3 border-t border-surface-700/50 flex items-center justify-between">
            <span className="text-xs text-surface-500">
              Showing {Math.min((page - 1) * pageSize + 1, totalCards)}–{Math.min(page * pageSize, totalCards)} of {totalCards}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-surface-800 disabled:opacity-30 text-surface-400 hover:text-surface-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = getPageNumber(i);
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? "bg-purple-600 text-surface-50"
                        : "text-surface-400 hover:bg-surface-800 hover:text-surface-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-surface-800 disabled:opacity-30 text-surface-400 hover:text-surface-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
