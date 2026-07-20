"use client";

import { useState, useEffect } from "react";
import { Search, RefreshCw, FileText, PhoneCall, PhoneOff, ChevronLeft, ChevronRight, Download, Filter, X, Calendar } from "lucide-react";

interface CdrRecord {
  flowNo: number; callerE164: string; calleeE164: string; callerIp: string; calleeIp: string;
  callerCodec: string; calleeCodec: string; startTime: number; stopTime: number; feeTime: number;
  fee: number; tax: number; customerAccount: string; customerName: string;
  endReason: number; endDirection: number; billingType: number;
  callerGatewayId: string; calleeGatewayId: string; callerAreaCode: string; calleeAreaCode: string;
}

export default function CdrQueryPage() {
  const [cdrs, setCdrs] = useState<CdrRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalFee, setTotalFee] = useState(0); const [avgFee, setAvgFee] = useState(0); const [partitions, setPartitions] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Date range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Filters
  const [endReason, setEndReason] = useState("");
  const [gateway, setGateway] = useState("");
  
  const limit = 50;

  useEffect(() => { const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400); return () => clearTimeout(t); }, [search]);

  const fetchCdrs = async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      if (endReason) params.set("endReason", endReason);
      if (gateway) params.set("gateway", gateway);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/vos/cdr?${params}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setCdrs(data.cdrs || []); setTotal(data.total || 0); setPartitions(data.partitions || 0); setTotalFee(data.totalFee || 0); setAvgFee(data.avgFee || 0); }
    } catch { setError("Failed to load CDRs"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCdrs(); }, [debouncedSearch, page, startDate, endDate, endReason, gateway]);

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (endReason) params.set("endReason", endReason);
    if (gateway) params.set("gateway", gateway);
    params.set("format", "csv");
    window.open(`/api/vos/cdr?${params}`, "_blank");
  };

  const clearFilters = () => { setStartDate(""); setEndDate(""); setEndReason(""); setGateway(""); setSearch(""); setPage(1); };

  const totalPages = Math.ceil(total / limit);
  const hasFilters = startDate || endDate || endReason || gateway;
  const formatTime = (ts: number) => ts ? new Date(Number(ts)).toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" }) : "—";
  const formatDuration = (s: number) => s ? `${Math.floor(s/60)}m ${s%60}s` : "0s";
  const formatMoney = (v: number) => `$${v.toFixed(4)}`;

  const getPageNumbers = () => {
    const pages: number[] = [];
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);
    return pages;
  };

  const endReasonLabel = (r: number) => {
    const map: Record<number,string> = { 0:"OK", 1:"Busy", 2:"No Answer", 3:"Cancel", 4:"Forbidden", 5:"Timeout", 6:"No Route", 7:"Congestion" };
    return map[r] || `R:${r}`;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">CDR Query</h1>
          <p className="text-surface-400 text-sm mt-1">
            {total.toLocaleString()} call records{partitions > 0 ? ` across ${partitions} partitions` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400" title="Export CSV"><Download className="w-4 h-4"/></button>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg border text-surface-400 hover:text-surface-50 ${hasFilters ? "bg-brand-600/20 border-brand-500/30 text-brand-400" : "bg-surface-800 border-surface-700"}`}><Filter className="w-4 h-4"/></button>
          <button onClick={fetchCdrs} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}/></button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-900 border border-surface-700/50 rounded-lg p-3"><p className="text-xs text-surface-500">Total Records</p><p className="text-lg font-bold text-surface-50">{total.toLocaleString()}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-lg p-3"><p className="text-xs text-surface-500">Partitions</p><p className="text-lg font-bold text-cyan-400">{partitions}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-lg p-3"><p className="text-xs text-surface-500">Total Fees</p><p className="text-lg font-bold text-emerald-400">${totalFee.toFixed(4)}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-lg p-3"><p className="text-xs text-surface-500">Avg Fee/Call</p><p className="text-lg font-bold text-amber-400">${avgFee.toFixed(4)}</p></div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2"><Filter className="w-4 h-4"/>Filters</h3>
            <button onClick={clearFilters} className="text-xs text-surface-500 hover:text-surface-300 flex items-center gap-1"><X className="w-3 h-3"/>Clear All</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className="block text-xs text-surface-400 mb-1">Start Date</label>
              <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500"/>
              <input type="date" value={startDate} onChange={e=>{setStartDate(e.target.value);setPage(1);}} className="w-full pl-9 pr-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50"/></div>
            </div>
            <div><label className="block text-xs text-surface-400 mb-1">End Date</label>
              <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500"/>
              <input type="date" value={endDate} onChange={e=>{setEndDate(e.target.value);setPage(1);}} className="w-full pl-9 pr-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50"/></div>
            </div>
            <div><label className="block text-xs text-surface-400 mb-1">End Reason</label>
              <select value={endReason} onChange={e=>{setEndReason(e.target.value);setPage(1);}} className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50">
                <option value="">All</option><option value="0">OK / Success</option><option value="1">Busy</option><option value="2">No Answer</option><option value="3">Cancel</option><option value="4">Forbidden</option><option value="5">Timeout</option><option value="6">No Route</option>
              </select>
            </div>
            <div><label className="block text-xs text-surface-400 mb-1">Gateway</label>
              <input type="text" placeholder="Gateway name..." value={gateway} onChange={e=>{setGateway(e.target.value);setPage(1);}} className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50"/>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input type="text" placeholder="Search by caller, callee, or customer..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-3 py-3 text-surface-400 font-medium text-xs uppercase">Caller</th>
                <th className="text-left px-3 py-3 text-surface-400 font-medium text-xs uppercase">Callee</th>
                <th className="text-left px-3 py-3 text-surface-400 font-medium text-xs uppercase">Start Time</th>
                <th className="text-right px-3 py-3 text-surface-400 font-medium text-xs uppercase">Duration</th>
                <th className="text-right px-3 py-3 text-surface-400 font-medium text-xs uppercase">Fee</th>
                <th className="text-left px-3 py-3 text-surface-400 font-medium text-xs uppercase">Customer</th>
                <th className="text-left px-3 py-3 text-surface-400 font-medium text-xs uppercase">Gateway</th>
                <th className="text-center px-3 py-3 text-surface-400 font-medium text-xs uppercase">End</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-800/50">
                  {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-3 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>)}
                </tr>
              )) : cdrs.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-surface-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-surface-600" />
                  <p className="text-lg font-medium">No CDR records found</p>
                  <p className="text-sm mt-1">{hasFilters ? "Try adjusting filters or date range" : "Call records will appear when calls flow through the system"}</p>
                </td></tr>
              ) : cdrs.map(c => (
                <tr key={`${c.flowNo}-${c.startTime}`} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-surface-50 font-mono text-xs">{c.callerE164 || "—"}</span>
                    </div>
                    {c.callerAreaCode && <p className="text-surface-500 text-[10px] mt-0.5 ml-5">Area: {c.callerAreaCode}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <PhoneOff className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                      <span className="text-surface-50 font-mono text-xs">{c.calleeE164 || "—"}</span>
                    </div>
                    {c.calleeAreaCode && <p className="text-surface-500 text-[10px] mt-0.5 ml-5">Area: {c.calleeAreaCode}</p>}
                  </td>
                  <td className="px-3 py-3 text-surface-300 text-xs whitespace-nowrap">{formatTime(c.startTime)}</td>
                  <td className="px-3 py-3 text-right text-surface-300 font-mono text-xs">{formatDuration(c.feeTime)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-emerald-400">{formatMoney(c.fee)}</td>
                  <td className="px-3 py-3 text-surface-50 text-xs">{c.customerName || c.customerAccount || "—"}</td>
                  <td className="px-3 py-3 text-surface-400 text-xs font-mono">{c.callerGatewayId || "—"}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                      c.endReason === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>{endReasonLabel(c.endReason)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800">
            <span className="text-xs text-surface-500">Page {page} of {totalPages} ({total.toLocaleString()} records)</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                className="p-1.5 rounded text-surface-400 hover:text-surface-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              {getPageNumbers().map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded text-xs font-medium ${n===page ? "bg-brand-600 text-white" : "text-surface-400 hover:bg-surface-800"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                className="p-1.5 rounded text-surface-400 hover:text-surface-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
