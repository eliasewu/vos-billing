"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Layers, Search, RefreshCw, Download, X } from "lucide-react";

interface CDR {
  id: number;
  call_id: string;
  caller: string;
  callee: string;
  customer_id: number;
  mapping_gw_id: number;
  routing_gw_id: number;
  start_time: string;
  connect_time: string;
  end_time: string;
  duration: number;
  bill_duration: number;
  hangup_cause: number;
  rate: number;
  cost: number;
  sell_rate: number;
  sell_cost: number;
}

interface Summary {
  total_calls: number;
  total_duration: number;
  total_cost: number;
  total_sell: number;
}

export default function CDRsPage() {
  const searchParams = useSearchParams();
  const urlCaller = searchParams.get("caller") || "";

  const [cdrs, setCdrs] = useState<CDR[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_calls: 0,
    total_duration: 0,
    total_cost: 0,
    total_sell: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(100);
  const [customerId, setCustomerId] = useState("");
  const [caller, setCaller] = useState(urlCaller);

  const fetchCDRs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (customerId) params.set("customer_id", customerId);
      if (caller) params.set("caller", caller);

      const res = await fetch(`/api/cdrs?${params.toString()}`);
      const data = await res.json();
      setCdrs(data.cdrs || []);
      if (data.summary) setSummary(data.summary);
      if (data.error) setError(data.error);
    } catch {
      setError("Failed to fetch CDRs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCDRs();
  }, []);

  // Re-fetch when caller URL param changes
  useEffect(() => {
    setCaller(urlCaller);
  }, [urlCaller]);

  useEffect(() => {
    if (caller || customerId) fetchCDRs();
  }, [caller]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getHangupLabel = (cause: number) => {
    const causes: Record<number, string> = {
      16: "Normal",
      17: "Busy",
      18: "No Answer",
      21: "Rejected",
      31: "Normal",
      34: "No Route",
      38: "Network Error",
      503: "Service Unavailable",
    };
    return causes[cause] || `Code ${cause}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-400" />
            CDR Records
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Call Detail Records — Revenue & Cost Analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCDRs}
            className="flex items-center gap-2 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-300 hover:text-surface-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase">Total Calls</p>
          <p className="text-xl font-bold text-surface-50">
            {summary.total_calls.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase">Total Duration</p>
          <p className="text-xl font-bold text-surface-50">
            {formatDuration(summary.total_duration)}
          </p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-400">
            ${Number(summary.total_sell).toFixed(2)}
          </p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase">Total Cost</p>
          <p className="text-xl font-bold text-red-400">
            ${Number(summary.total_cost).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-surface-400">Caller:</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={caller}
              onChange={(e) => setCaller(e.target.value)}
              placeholder="Filter by caller..."
              className="w-40 px-3 py-1.5 bg-surface-900 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
            />
            {caller && (
              <button
                onClick={() => setCaller("")}
                className="p-1 rounded text-surface-500 hover:text-surface-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-surface-400">Customer ID:</label>
          <input
            type="number"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="All"
            className="w-24 px-3 py-1.5 bg-surface-900 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-surface-400">Limit:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-surface-900 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>
        <button
          onClick={fetchCDRs}
          className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium"
        >
          Apply Filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-800/50 border-b border-surface-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Caller
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Called
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Sell Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Revenue
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Margin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : cdrs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-surface-500">
                    No CDR records found
                  </td>
                </tr>
              ) : (
                cdrs.map((c) => {
                  const margin =
                    Number(c.sell_cost || 0) - Number(c.cost || 0);
                  return (
                    <tr key={c.id} className="hover:bg-surface-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-surface-400">
                        {c.id}
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-300">
                        {formatTime(c.start_time)}
                      </td>
                      <td className="px-4 py-3 font-mono text-surface-50">
                        {c.caller}
                      </td>
                      <td className="px-4 py-3 font-mono text-surface-50">
                        {c.callee}
                      </td>
                      <td className="px-4 py-3 font-mono text-surface-300">
                        {formatDuration(c.duration || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            c.hangup_cause === 16 || c.hangup_cause === 31
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {getHangupLabel(c.hangup_cause)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-surface-300">
                        ${Number(c.sell_rate || 0).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-400">
                        ${Number(c.sell_cost || 0).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 font-mono text-red-400">
                        ${Number(c.cost || 0).toFixed(4)}
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-medium ${
                          margin >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        ${(Number(margin)||0).toFixed(4)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
