"use client";

import { useState, useEffect } from "react";
import { Building2, MapPin, Search, RefreshCw, Download, Calendar, X } from "lucide-react";

interface AccountArea { customerName: string; areaCode: string; totalCalls: number; totalFee: number; totalDuration: number; }

export default function AccountAreaPage() {
  const [data, setData] = useState<AccountArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      params.set("limit", "10000");
      const res = await fetch(`/api/vos/cdr?${params}`);
      const d = await res.json();
      if (d.error) { setError(d.error); setData([]); }
      else {
        const cdrs: any[] = d.cdrs || [];
        const crossMap = new Map<string, { calls: number; fee: number; duration: number }>();
        for (const cdr of cdrs) {
          const customer = cdr.customerName || cdr.customerAccount || "Unknown";
          const area = cdr.calleeAreaCode || cdr.callerAreaCode || "Unknown";
          const key = `${customer}|||${area}`;
          const existing = crossMap.get(key) || { calls: 0, fee: 0, duration: 0 };
          existing.calls++;
          existing.fee += (cdr.fee || 0);
          existing.duration += (cdr.feeTime || 0);
          crossMap.set(key, existing);
        }
        setData(Array.from(crossMap.entries()).map(([key, v]) => {
          const [cust, area] = key.split("|||");
          return { customerName: cust, areaCode: area, totalCalls: v.calls, totalFee: v.fee, totalDuration: v.duration };
        }).sort((a, b) => b.totalCalls - a.totalCalls).slice(0, 300));
      }
    } catch { setError("Failed to load account area data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const formatMoney = (v: number) => `$${Number(v || 0).toFixed(4)}`;
  const formatDuration = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`; };

  const filtered = data.filter(d => d.customerName.toLowerCase().includes(search.toLowerCase()) || d.areaCode.includes(search));
  const totalFee = data.reduce((s, d) => s + d.totalFee, 0);
  const uniqueCustomers = new Set(data.map(d => d.customerName)).size;
  const uniqueAreas = new Set(data.map(d => d.areaCode)).size;

  const exportCSV = () => {
    const csv = ["Customer,AreaCode,Calls,Duration,Revenue", ...filtered.map(d => [d.customerName, d.areaCode, d.totalCalls, d.totalDuration, Number(d.totalFee).toFixed(4)].join(","))].join("\n");
    const b = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "account_area.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Account Area</h1><p className="text-surface-400 text-sm mt-1">Customer × Area Code cross-analysis</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4" /></button>
          <button onClick={fetchData} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50" /></div>
        <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" /><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50" /></div>
        {(startDate || endDate) && <button onClick={() => { setStartDate(""); setEndDate(""); }} className="flex items-center gap-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-xs text-surface-400 hover:text-surface-50"><X className="w-3 h-3" />Clear</button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Cross Pairs</p><p className="text-2xl font-bold text-surface-50">{data.length}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Customers</p><p className="text-2xl font-bold text-brand-400">{uniqueCustomers}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Areas</p><p className="text-2xl font-bold text-violet-400">{uniqueAreas}</p></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><p className="text-xs text-surface-500 mb-1">Total Revenue</p><p className="text-2xl font-bold text-emerald-400">{formatMoney(totalFee)}</p></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by customer or area..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Customer</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Area Code</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Calls</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Duration</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Revenue</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={5} className="p-6 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-surface-500" /></td></tr> :
            filtered.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-surface-500"><Building2 className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No account-area data — adjust date range</p></td></tr> :
            filtered.map((d, i) => (
              <tr key={d.customerName + d.areaCode + i} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                <td className="px-4 py-3 text-surface-50 text-xs font-medium">{d.customerName}</td>
                <td className="px-4 py-3 text-surface-300 font-mono text-xs flex items-center gap-1"><MapPin className="w-3 h-3 text-surface-500" />{d.areaCode}</td>
                <td className="px-4 py-3 text-right text-surface-300 text-xs">{d.totalCalls.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-surface-300 text-xs font-mono">{formatDuration(d.totalDuration)}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-mono text-xs">{formatMoney(d.totalFee)}</td>
              </tr>
            ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
