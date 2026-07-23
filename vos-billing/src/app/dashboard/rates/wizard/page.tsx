"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign, Users, Globe, Radio, Send, Loader2, Mail, Search,
  Square, CheckSquare, Table2, Hash, MapPin, Clock, Percent,
  Filter, ChevronDown, ArrowLeft, Check, RefreshCw
} from "lucide-react";

interface Customer { id: number; name: string; email: string; feerateGroupId: number; feerateGroupPrivateId: number; customerType: number; }
interface MccMnc { id: number; country: string; operator: string; mcc: string; mnc: string; }
interface RateGroup { id: number; name: string; }

interface OperatorRow {
  op: MccMnc;
  prefix: string;
  areacode: string;
  areaName: string;
  fee: number;
  tax: number;
  period: number;
  selected: boolean;
}

const PERIOD_OPTIONS = [1, 6, 30, 60] as const;
const PERIOD_LABELS: Record<number, string> = { 1: "1s", 6: "6s", 30: "30s", 60: "60s" };

export default function RateWizardPage() {
  const router = useRouter();

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mccmnc, setMccmnc] = useState<MccMnc[]>([]);
  const [rateGroups, setRateGroups] = useState<RateGroup[]>([]);
  const [areacodes, setAreacodes] = useState<{ areacode: string; location: string }[]>([]);
  const [prefixMap, setPrefixMap] = useState<Map<number, string>>(new Map());

  // Selections
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedRateGroup, setSelectedRateGroup] = useState<number>(0);
  const [countryFilter, setCountryFilter] = useState("");

  // Table state
  const [operatorRows, setOperatorRows] = useState<Map<number, OperatorRow>>(new Map());
  const [defaultFee, setDefaultFee] = useState(0.01);
  const [defaultTax, setDefaultTax] = useState(0);
  const [defaultPeriod, setDefaultPeriod] = useState(60);
  const [fakeminute, setFakeminute] = useState(60);
  const [sendEmail, setSendEmail] = useState(true);
  const [applyTick, setApplyTick] = useState(0);

  // UI state
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ rates: number; email: boolean } | null>(null);

  // Countries list
  const countries = useMemo(() => {
    const set = new Set<string>();
    mccmnc.forEach(e => set.add(e.country));
    return [...set].sort();
  }, [mccmnc]);

  // Customers list
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const filteredCustomers = useMemo(() =>
    customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())),
    [customers, customerSearch]
  );

  // Load all data
  useEffect(() => {
    Promise.all([
      fetch("/api/vos/customers").then(r => r.json()),
      fetch("/api/vos/rates").then(r => r.json()),
      fetch("/api/vos/mccmnc").then(r => r.json()),
      fetch("/api/vos/areacodes").then(r => r.json()).catch(() => ({ areacodes: [] })),
      fetch("/api/vos/prefixes").then(r => r.json()).catch(() => ({ prefixes: [] })),
    ]).then(([custData, rateData, mccData, areaData, prefixData]) => {
      setCustomers((custData.customers || []).map((c: any) => ({
        id: c.id, name: c.customer_name, email: c.contact_email,
        feerateGroupId: c.feerategroup_id || 0,
        feerateGroupPrivateId: c.feerategroupprivate_id || 0,
        customerType: c.customer_type || 0,
      })));
      const groups = (rateData.rateGroups || []).filter((g: any) => g.id > 0).map((g: any) => ({ id: g.id, name: g.name }));
      setRateGroups(groups);
      setMccmnc(mccData.entries || []);
      setAreacodes(areaData.areacodes || []);
      const pmap = new Map<number, string>();
      (prefixData.prefixes || []).forEach((p: any) => pmap.set(p.mccmnc_id, p.prefix));
      setPrefixMap(pmap);
    }).finally(() => {
      setLoadingCustomers(false);
      setLoadingData(false);
    });
  }, []);

  // Rebuild operator rows when country filter changes
  const filteredOperators = useMemo(() => {
    if (!countryFilter) return [] as MccMnc[];
    return mccmnc.filter(e => e.country === countryFilter);
  }, [mccmnc, countryFilter]);

  // Click outside to close customer dropdown
  useEffect(() => {
    if (!showCustomerDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-customer-dropdown]")) setShowCustomerDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCustomerDropdown]);

  // Initialize/reset rows when filtered operators change (use functional updater to avoid stale closure)
  useEffect(() => {
    if (filteredOperators.length === 0) {
      setOperatorRows(new Map());
      return;
    }
    setOperatorRows((prev: Map<number, OperatorRow>) => {
      const newRows = new Map<number, OperatorRow>();
      for (const op of filteredOperators) {
        const existing = prev.get(op.id);
        const pfx = prefixMap.get(op.id) || "";
        const ac = getOperatorAreacode(op, pfx);
        if (existing) {
          // Always recompute prefix & area code (they may have been empty during initial load)
          newRows.set(op.id, {
            ...existing,
            prefix: existing.prefix || pfx,
            areacode: existing.areacode || ac,
            areaName: existing.areaName || areacodeToName.get(existing.areacode || ac) || "",
          });
        } else {
          newRows.set(op.id, {
            op,
            prefix: pfx,
            areacode: ac,
            areaName: areacodeToName.get(ac) || "",
            fee: defaultFee,
            tax: defaultTax,
            period: defaultPeriod,
            selected: false,
          });
        }
      }
      return newRows;
    });
  }, [filteredOperators, prefixMap, areacodes, defaultFee, defaultTax, defaultPeriod]);

  // Combined areacode lookup: Set for existence checks + Map for name tooltips
  const { areacodeSet, areacodeToName } = useMemo(() => {
    const set = new Set<string>();
    const map = new Map<string, string>();
    for (const a of areacodes) {
      if (a.areacode) {
        set.add(a.areacode);
        if (a.location) map.set(a.areacode, a.location);
      }
    }
    return { areacodeSet: set, areacodeToName: map };
  }, [areacodes]);

  // Look up areacode + areaName from a prefix string
  const lookupPrefix = (prefix: string): { areacode: string; areaName: string } => {
    const p = prefix.trim();
    const name = areacodeToName.get(p);
    return name ? { areacode: p, areaName: name } : { areacode: "", areaName: "" };
  };

  // Area code lookup — uses new "CountryName - AreaName" format from e_areacode
  const getOperatorAreacode = (op: { country: string; operator: string }, prefix?: string) => {
    const countryLow = op.country.trim().toLowerCase();
    const opLow = op.operator.trim().toLowerCase();
    if (!countryLow) return "";

    // Word-boundary matcher
    const wordMatch = (text: string, word: string) => {
      const idx = text.indexOf(word);
      if (idx === -1) return false;
      const isB = (i: number) => i < 0 || i >= text.length || /[^a-z0-9]/i.test(text[i]);
      return isB(idx - 1) && isB(idx + word.length);
    };

    // Step 1: Name-based match — find location containing both country AND operator as whole words
    // Works with "CountryName - AreaName" format (e.g., "Afghanistan - Afghanistan Cellular-MTN")
    if (opLow) {
      const exact = areacodes.find(a => {
        const loc = a.location.trim().toLowerCase();
        return wordMatch(loc, countryLow) && wordMatch(loc, opLow);
      });
      if (exact) return exact.areacode;
    }

    // Step 2: Prefix-based fallback — look up the operator's prefix directly in e_areacode
    if (prefix && areacodeSet.has(prefix)) {
      return prefix;
    }

    // Step 3: Country-level fallback — word-boundary match on country name within full location
    // Catches "Afghanistan" in "Afghanistan - Afghanistan Cellular-MTN"
    const loose = areacodes.find(a => wordMatch(a.location.trim().toLowerCase(), countryLow));
    return loose ? loose.areacode : "";
  };

  // Row actions
  const updateRow = (id: number, updates: Partial<OperatorRow>) => {
    setOperatorRows(prev => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) next.set(id, { ...existing, ...updates });
      return next;
    });
  };

  const toggleRow = (id: number) => {
    setOperatorRows(prev => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) next.set(id, { ...existing, selected: !existing.selected });
      return next;
    });
  };

  const selectedCount = useMemo(() =>
    [...operatorRows.values()].filter(r => r.selected).length,
    [operatorRows]
  );

  const allSelected = selectedCount === filteredOperators.length && filteredOperators.length > 0;

  const toggleAll = () => {
    setOperatorRows(prev => {
      const next = new Map(prev);
      const newVal = !allSelected;
      next.forEach((row, id) => next.set(id, { ...row, selected: newVal }));
      return next;
    });
  };

  // Bulk set rate/tax/period for selected rows
  const applyBulkRate = () => {
    setOperatorRows(prev => {
      const next = new Map(prev);
      let changed = 0;
      next.forEach((row, id) => {
        if (row.selected) {
          next.set(id, { ...row, fee: defaultFee, tax: defaultTax, period: defaultPeriod });
          changed++;
        }
      });
      if (changed === 0) return prev;
      return next;
    });
    setApplyTick(t => t + 1);
  };

  // Submit
  const handleSubmit = async () => {
    const selected = [...operatorRows.values()].filter(r => r.selected);
    if (selected.length === 0) { setError("Select at least one operator"); return; }
    if (!selectedRateGroup) { setError("Select a rate group"); return; }

    setSubmitting(true); setError("");

    const rates = selected.map(r => ({
      prefix: r.prefix,
      areacode: r.areacode,
      fee: r.fee,
      tax: r.tax,
      period: r.period,
      ivrfee: 0,
      ivrperiod: 0,
      type: 0,
      locktype: 0,
    }));

    try {
      // Update fakeminute on the group
      fetch("/api/vos/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: selectedRateGroup, fakeminute }),
      }).catch(() => {});

      const res = await fetch("/api/vos/rates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feerategroup_id: selectedRateGroup, rates }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      let emailResult = false;
      if (sendEmail && selectedCustomer?.email) {
        try {
          await fetch("/api/vos/rates/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: selectedCustomer.id,
              type: selectedCustomer.customerType === 1 ? "supplier" : "client",
              rates: selected.map(r => ({
                prefix: r.prefix, country: r.op.country, operator: r.op.operator, rate: r.fee,
              })),
            }),
          });
          emailResult = true;
        } catch { /* ok */ }
      }

      setResult({ rates: data.succeeded || selected.length, email: emailResult });
    } catch {
      setError("Failed to create rates");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSelectedCustomer(null); setCountryFilter(""); setSelectedRateGroup(0);
    setOperatorRows(new Map()); setResult(null); setError("");
    setApplyTick(0);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/dashboard/rates")} className="p-1.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" /> Rate Wizard
          </h1>
          <p className="text-surface-400 text-sm mt-1">Table view — batch add rates by destination</p>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Result screen */}
      {result ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-surface-50">Rates Created!</h3>
          <p className="text-surface-400">{result.rates} rates added to group</p>
          {result.email ? (
            <p className="text-emerald-400 text-sm flex items-center justify-center gap-1"><Mail className="w-4 h-4" />Email sent</p>
          ) : sendEmail ? (
            <p className="text-amber-400 text-sm">Rates saved but email failed</p>
          ) : null}
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={reset} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">New Batch</button>
            <button onClick={() => router.push("/dashboard/rates")} className="px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">View Rates</button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Row 1: Customer + Rate Group + Country ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Selector */}
            <div className="relative">
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Customer</label>
              <button
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 hover:border-surface-600 transition-colors"
                data-customer-dropdown
              >
                <span className={selectedCustomer ? "text-surface-50" : "text-surface-500 truncate"}>
                  {selectedCustomer ? selectedCustomer.name : "Select customer..."}
                </span>
                <ChevronDown className={`w-4 h-4 text-surface-500 flex-shrink-0 transition-transform ${showCustomerDropdown ? "rotate-180" : ""}`} />
              </button>
              {showCustomerDropdown && (
                <div data-customer-dropdown className="absolute z-50 mt-1 w-full bg-surface-900 border border-surface-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  <div className="sticky top-0 p-2 bg-surface-900 border-b border-surface-800">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                      <input
                        type="text" placeholder="Search..." value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-surface-800 border border-surface-700 rounded text-xs text-surface-50 focus:outline-none"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {loadingCustomers ? (
                    <p className="text-surface-500 text-xs text-center py-4">Loading...</p>
                  ) : filteredCustomers.length === 0 ? (
                    <p className="text-surface-500 text-xs text-center py-4">No customers found</p>
                  ) : (
                    filteredCustomers.slice(0, 30).map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerDropdown(false);
                          const cg = c.customerType === 1 ? c.feerateGroupPrivateId : c.feerateGroupId;
                          if (cg > 0 && rateGroups.some(g => g.id === cg)) setSelectedRateGroup(cg);
                          else if (rateGroups.length > 0) setSelectedRateGroup(rateGroups[0].id);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-800 transition-colors ${
                          selectedCustomer?.id === c.id ? "bg-brand-500/10 text-brand-400" : "text-surface-300"
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ml-2 ${c.customerType === 1 ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>
                          {c.customerType === 1 ? "Supplier" : "Client"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Rate Group */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Rate Group</label>
              <select
                value={selectedRateGroup}
                onChange={e => setSelectedRateGroup(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500/50"
              >
                <option value={0} disabled>Select rate group...</option>
                {rateGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Country Filter */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">
                <Filter className="w-3 h-3 inline mr-1" />Country Filter
              </label>
              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">All countries</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* ── Row 2: Default Rate + Bulk Apply ── */}
          {countryFilter && (
            <div className="flex flex-wrap items-end gap-3 p-4 bg-surface-900 border border-surface-700/50 rounded-xl">
              <div>
                <label className="block text-[10px] text-surface-500 mb-1">Default Rate ($/min)</label>
                <input type="number" step="0.000001" value={defaultFee} onChange={e => setDefaultFee(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2.5 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-amber-500/50" />
              </div>
              <div>
                <label className="block text-[10px] text-surface-500 mb-1">Tax</label>
                <input type="number" step="0.01" min={0} max={1} value={defaultTax} onChange={e => setDefaultTax(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2.5 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-surface-500 mb-1">Period (s)</label>
                <select value={defaultPeriod} onChange={e => setDefaultPeriod(parseInt(e.target.value))}
                  className="w-20 px-2 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none">
                  {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-surface-500 mb-1">Increment (s)</label>
                <select value={fakeminute} onChange={e => setFakeminute(parseInt(e.target.value))}
                  className="w-20 px-2 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none">
                  {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
                </select>
              </div>
              <button
                onClick={applyBulkRate}
                disabled={selectedCount === 0}
                className={`px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white text-sm font-medium transition-all ${applyTick > 0 ? 'ring-2 ring-amber-400/50' : ''}`}
              >
                Apply to {selectedCount} Selected
              </button>

              {/* Email toggle */}
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700/50 cursor-pointer select-none">
                <button type="button" onClick={() => setSendEmail(!sendEmail)} className="p-0.5">
                  {sendEmail ? <CheckSquare className="w-4 h-4 text-brand-400" /> : <Square className="w-4 h-4 text-surface-500" />}
                </button>
                <span className="text-xs text-surface-400">Email</span>
              </label>
            </div>
          )}

          {/* ── Operators Table ── */}
          {countryFilter && (
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-surface-800">
                <h2 className="text-sm font-semibold text-surface-50 flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-brand-400" />
                  Operators — {countryFilter}
                  <span className="text-surface-500 font-normal text-xs">({filteredOperators.length} total)</span>
                </h2>
                <button onClick={toggleAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={{
                    borderColor: allSelected ? "rgb(167 139 250 / 0.5)" : "rgb(51 65 85 / 0.5)",
                    background: allSelected ? "rgb(167 139 250 / 0.1)" : "",
                  }}>
                  {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-violet-400" /> : <Square className="w-3.5 h-3.5 text-surface-500" />}
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-800 bg-surface-800/30">
                      <th className="text-left py-2.5 px-3 text-[10px] font-medium text-surface-500 uppercase tracking-wider w-10">#</th>
                      <th className="text-left py-2.5 px-2 text-[10px] font-medium text-surface-500 uppercase tracking-wider">Operator</th>
                      <th className="text-left py-2.5 px-2 text-[10px] font-medium text-surface-500 uppercase tracking-wider">MCC/MNC</th>
                      <th className="text-left py-2.5 px-2 text-[10px] font-medium text-surface-500 uppercase tracking-wider w-20">Prefix</th>
                      <th className="text-left py-2.5 px-2 text-[10px] font-medium text-surface-500 uppercase tracking-wider w-20">Area Code</th>
                      <th className="text-right py-2.5 px-2 text-[10px] font-medium text-surface-500 uppercase tracking-wider w-24">Rate ($)</th>
                      <th className="text-right py-2.5 px-2 text-[10px] font-medium text-surface-500 uppercase tracking-wider w-16">Tax</th>
                      <th className="text-right py-2.5 px-2 text-[10px] font-medium text-surface-500 uppercase tracking-wider w-16">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOperators.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-surface-500">
                          <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No operators found for this country
                        </td>
                      </tr>
                    ) : (
                      filteredOperators.map((op, i) => {
                        const row = operatorRows.get(op.id);
                        if (!row) return null;
                        return (
                          <tr
                            key={op.id}
                            className={`border-b border-surface-800/50 hover:bg-surface-800/20 transition-colors ${
                              row.selected ? "bg-violet-500/5" : i % 2 === 0 ? "bg-surface-800/5" : ""
                            }`}
                          >
                            {/* Checkbox + # */}
                            <td className="py-2 px-3">
                              <button onClick={() => toggleRow(op.id)} className="flex items-center gap-2">
                                {row.selected
                                  ? <CheckSquare className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                  : <Square className="w-4 h-4 text-surface-600 flex-shrink-0" />
                                }
                                <span className="text-[10px] text-surface-600">{i + 1}</span>
                              </button>
                            </td>
                            {/* Operator Name */}
                            <td className="py-2 px-2">
                              <span className="text-surface-200 font-medium text-xs">{op.operator}</span>
                            </td>
                            {/* MCC/MNC */}
                            <td className="py-2 px-2">
                              <span className="text-[10px] text-surface-500 font-mono">{op.mcc}/{op.mnc}</span>
                            </td>
                            {/* Prefix */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.prefix}
                                onChange={e => {
                                  const val = e.target.value;
                                  const looked = lookupPrefix(val);
                                  updateRow(op.id, {
                                    prefix: val,
                                    areacode: looked.areacode || row.areacode,
                                    areaName: looked.areacode ? looked.areaName : row.areaName,
                                  });
                                }}
                                className="w-full px-2 py-1.5 bg-surface-800 border border-surface-700/50 rounded text-xs text-surface-50 focus:outline-none focus:border-violet-500/50 font-mono"
                                placeholder="—"
                              />
                            </td>
                            {/* Area Code */}
                            <td className="py-2 px-2">
                              <span
                                className={`text-xs font-mono ${row.areacode ? "text-emerald-400" : "text-surface-600"}`}
                                title={row.areaName || ""}
                              >
                                {row.areacode || "—"}
                              </span>
                            </td>
                            {/* Rate */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.000001"
                                value={row.fee}
                                onChange={e => updateRow(op.id, { fee: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1.5 bg-surface-800 border border-surface-700/50 rounded text-xs text-amber-400 text-right focus:outline-none focus:border-amber-500/50 font-mono"
                              />
                            </td>
                            {/* Tax */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.01" min={0} max={1}
                                value={row.tax}
                                onChange={e => updateRow(op.id, { tax: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1.5 bg-surface-800 border border-surface-700/50 rounded text-xs text-surface-300 text-right focus:outline-none font-mono"
                              />
                            </td>
                            {/* Period */}
                            <td className="py-2 px-2">
                              <select
                                value={row.period}
                                onChange={e => updateRow(op.id, { period: parseInt(e.target.value) })}
                                className="w-full px-1.5 py-1.5 bg-surface-800 border border-surface-700/50 rounded text-xs text-surface-300 focus:outline-none"
                              >
                                {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-surface-800/20 border-t border-surface-800 flex items-center justify-between text-xs">
                <span className="text-surface-500">
                  {selectedCount} of {filteredOperators.length} operators selected
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          {countryFilter && selectedCount > 0 && (
            <div className="flex items-center justify-end gap-3">
              <button onClick={reset} className="px-4 py-2.5 rounded-lg bg-surface-800 text-surface-400 hover:text-surface-50 text-sm font-medium transition-colors">
                Reset
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedRateGroup || selectedCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? "Creating..." : `Create ${selectedCount} Rates`}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!countryFilter && (
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center">
              <Globe className="w-12 h-12 text-surface-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-surface-50 mb-2">Select a Country</h3>
              <p className="text-surface-500 text-sm max-w-md mx-auto">
                Choose a customer above, then select a country to see all operators in a table.
                Set default rate/tax/period values and apply them to selected rows — or edit each row individually.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
