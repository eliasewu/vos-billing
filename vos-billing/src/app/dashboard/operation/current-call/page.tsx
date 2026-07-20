"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  RefreshCw,
  PhoneCall,
  Timer,
  Server,
  Users,
  Search,
  Download,
  X,
  Radio,
  PhoneOff,
  Square,
  CheckSquare,
} from "lucide-react";

interface ActiveCall {
  id: number;
  callId: string;
  caller: string;
  callee: string;
  customerId: number | null;
  customerName: string;
  mappingGwName: string;
  routingGwName: string;
  elapsed: number;
  status: string;
  startTime: number;
  startTimeStr: string;
  codec: string;
  rate: number;
}

interface CallStats {
  totalCalls: number;
  totalDuration: number;
  avgDuration: number;
  uniqueGateways: number;
  uniqueCustomers: number;
}

export default function CurrentCallPage() {
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const isMountedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [killingId, setKillingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkKilling, setBulkKilling] = useState(false);

  // Prevent hydration mismatch — all dynamic time rendering waits for mount
  useEffect(() => { isMountedRef.current = true; setIsMounted(true); }, []);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch("/api/vos/current-call");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setCalls([]);
        setStats(null);
      } else {
        setCalls(data.calls || []);
        setStats(data.stats || null);
        setSource(data.source || "");
        setError("");
        if (isMountedRef.current) setElapsed(Date.now());
      }
    } catch {
      setError("Failed to fetch active calls");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    intervalRef.current = setInterval(fetchCalls, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchCalls]);

  // Elapsed timer tick every second (client only)
  useEffect(() => {
    if (!isMounted) return;
    setElapsed(Date.now());
    const tick = setInterval(() => setElapsed(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [isMounted]);

  const handleKill = async (callId: string) => {
    if (!window.confirm(`Terminate call ${callId}? This will disconnect the call immediately.`)) return;
    setError("");
    setSuccess("");
    setKillingId(callId);
    try {
      const res = await fetch(`/api/vos/current-call?id=${encodeURIComponent(callId)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCalls((prev) => prev.filter((c) => c.callId !== callId));
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(callId); return next; });
        setSuccess(data.message || `Call ${callId} terminated`);
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(data.error || "Failed to terminate call");
      }
    } catch {
      setError("Failed to send termination command");
    } finally {
      setKillingId(null);
    }
  };

  // Toggle selection
  const toggleSelect = (callId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) next.delete(callId);
      else next.add(callId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.callId)));
    }
  };

  // Bulk kill
  const handleBulkKill = async () => {
    if (selectedIds.size === 0) return;
    if (bulkKilling) return;
    if (!window.confirm(`Terminate ${selectedIds.size} selected calls? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    setBulkKilling(true);
    const ids = Array.from(selectedIds);
    let ok = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/vos/current-call?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) ok++;
      } catch { /* continue */ }
    }
    setCalls((prev) => prev.filter((c) => !selectedIds.has(c.callId)));
    setSelectedIds(new Set());
    setBulkKilling(false);
    if (ok === ids.length) {
      setSuccess(`Terminated ${ok} call${ok !== 1 ? "s" : ""}`);
    } else if (ok > 0) {
      setSuccess(`Terminated ${ok} of ${ids.length} call${ok !== 1 ? "s" : ""} (${ids.length - ok} failed)`);
    } else {
      setError(`Failed to terminate any of the ${ids.length} selected calls`);
    }
    setTimeout(() => setSuccess(""), 5000);
  };

  // Search filter
  const filtered = search
    ? calls.filter(
        (c) =>
          c.callId.toLowerCase().includes(search.toLowerCase()) ||
          c.caller.toLowerCase().includes(search.toLowerCase()) ||
          c.callee.toLowerCase().includes(search.toLowerCase()) ||
          c.customerName.toLowerCase().includes(search.toLowerCase()) ||
          c.mappingGwName.toLowerCase().includes(search.toLowerCase()) ||
          c.routingGwName.toLowerCase().includes(search.toLowerCase())
      )
    : calls;

  // Running duration: stored duration + elapsed since last fetch (client only)
  const getRunningDuration = (c: ActiveCall) => {
    if (!isMounted) return c.elapsed || 0;
    const sinceLastFetch = Math.floor((Date.now() - elapsed) / 1000);
    return (c.elapsed || 0) + sinceLastFetch;
  };

  const formatDuration = (s: number) => {
    if (!s || s < 0) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const formatTime = (ts: number) => {
    if (!ts) return "-";
    if (!isMounted) return new Date(ts * 1000).toISOString().slice(11, 19);
    return new Date(ts * 1000).toLocaleTimeString();
  };

  const exportCSV = () => {
    const headers = [
      "Call ID", "Caller", "Callee", "Customer", "Mapping GW",
      "Routing GW", "Duration", "Start Time", "Status", "Codec",
    ];
    const rows = filtered.map((c) => [
      c.callId,
      c.caller,
      c.callee,
      c.customerName || c.customerId || "",
      c.mappingGwName || "",
      c.routingGwName || "",
      formatDuration(getRunningDuration(c)),
      formatTime(c.startTime),
      c.status,
      c.codec,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "current_calls.csv";
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Current Call
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Real-time active calls monitoring
            {source && (
              <span className="ml-2 text-xs text-surface-600">
                (source: {source})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
              LIVE
            </span>
          </div>

          {/* Auto-refresh */}
          <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 rounded-full bg-surface-700 peer-checked:bg-emerald-500/40 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-surface-400 peer-checked:bg-emerald-400 peer-checked:translate-x-4 transition-all" />
            </div>
            Auto (5s)
          </label>

          {/* CSV Export */}
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Refresh */}
          <button
            onClick={fetchCalls}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-400">{error}</p>
        </div>
      )}

      {/* Success Toast */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-sm text-emerald-400">{success}</p>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 rounded-lg">
              <PhoneCall className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">
                Active Calls
              </p>
              <p className="text-2xl font-bold text-surface-50">
                {loading && calls.length === 0 ? (
                  <span className="text-surface-600">—</span>
                ) : (
                  <span>
                    {filtered.length}
                    {search && calls.length !== filtered.length && (
                      <span className="text-sm text-surface-500 ml-1">
                        / {calls.length}
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-lg">
              <Timer className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">
                Total Duration
              </p>
              <p className="text-2xl font-bold text-surface-50">
                {stats
                  ? formatDuration(
                      stats.totalDuration +
                        (isMounted ? Math.floor((Date.now() - elapsed) / 1000) * calls.length : 0)
                    )
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 rounded-lg">
              <Server className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">
                Gateways
              </p>
              <p className="text-2xl font-bold text-surface-50">
                {stats?.uniqueGateways ?? "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">
                Customers
              </p>
              <p className="text-2xl font-bold text-surface-50">
                {stats?.uniqueCustomers ?? "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg">
              <Radio className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">
                Avg Duration
              </p>
              <p className="text-2xl font-bold text-surface-50">
                {isMounted && filtered.length > 0
                  ? formatDuration(
                      Math.round(
                        (filtered.reduce((s, c) => s + getRunningDuration(c), 0)) /
                          filtered.length
                      )
                    )
                  : stats
                  ? formatDuration(stats.avgDuration)
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input
          type="text"
          placeholder="Search by Call ID, caller, callee, customer, or gateway..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-surface-900 border border-surface-700/50 rounded-xl text-sm text-surface-50 placeholder-surface-600 focus:outline-none focus:border-brand-500/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bulk Kill Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-400 font-medium">
              {selectedIds.size} call{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-50 border border-surface-700 hover:border-surface-600 transition-colors"
            >
              Deselect
            </button>
            <button
              onClick={handleBulkKill}
              disabled={bulkKilling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {bulkKilling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Terminating...
                </>
              ) : (
                <>
                  <PhoneOff className="w-3.5 h-3.5" />
                  Terminate Selected
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Call Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-800/50 border-b border-surface-700/50">
                <th className="px-4 py-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-surface-500 hover:text-surface-300">
                    {selectedIds.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-brand-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Call ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Caller
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Callee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Mapping GW
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Routing GW
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Start Time
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-surface-400 tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {loading && calls.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                      <p className="text-surface-500 text-sm">Loading active calls...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-surface-800">
                        <Activity className="w-10 h-10 text-surface-600" />
                      </div>
                      {search ? (
                        <>
                          <p className="text-surface-400 font-medium">
                            No matching calls
                          </p>
                          <p className="text-surface-600 text-sm">
                            Try a different search term
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-surface-400 font-medium">
                            No active calls
                          </p>
                          <p className="text-surface-600 text-sm">
                            New calls will appear here automatically
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => {
                  const runningDuration = getRunningDuration(c);
                  const isLongCall = runningDuration > 3600; // > 1 hour

                  return (
                    <tr
                      key={c.callId || i}
                      className="hover:bg-surface-800/30 transition-colors animate-fadeIn"
                    >
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleSelect(c.callId)} className="text-surface-500 hover:text-surface-300">
                          {selectedIds.has(c.callId) ? (
                            <CheckSquare className="w-4 h-4 text-brand-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-surface-400 max-w-[140px] truncate">
                        {c.callId || c.id}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-surface-50 font-medium max-w-[160px] truncate">
                        {c.caller || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-surface-50 max-w-[160px] truncate">
                        {c.callee || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-400 max-w-[140px] truncate">
                        {c.customerName || c.customerId || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-300 max-w-[120px] truncate">
                        {c.mappingGwName || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-purple-400 max-w-[120px] truncate">
                        {c.routingGwName || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                        <span
                          className={
                            isLongCall
                              ? "text-amber-400 font-semibold"
                              : "text-emerald-400"
                          }
                        >
                          {formatDuration(runningDuration)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-400 whitespace-nowrap">
                        {formatTime(c.startTime)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleKill(c.callId)}
                          disabled={killingId === c.callId}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title={`Terminate call ${c.callId}`}
                        >
                          {killingId === c.callId ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PhoneOff className="w-3.5 h-3.5" />
                          )}
                          {killingId === c.callId ? "Killing..." : "Kill"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-surface-800 bg-surface-800/30 flex items-center justify-between text-xs text-surface-500">
            <span>
              Showing {filtered.length} of {calls.length} active call
              {calls.length !== 1 ? "s" : ""}
              {autoRefresh && " · refreshing every 5s"}
            </span>
            <span>
              Longest:{" "}
              {formatDuration(
                Math.max(...filtered.map((c) => getRunningDuration(c)), 0)
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
