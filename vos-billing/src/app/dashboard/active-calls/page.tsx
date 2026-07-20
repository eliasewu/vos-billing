"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, RefreshCw, PhoneCall, Clock, PhoneOff } from "lucide-react";

interface ActiveCall {
  id: number;
  call_id: string;
  caller: string;
  callee: string;
  customer_id: number;
  customer_name: string;
  mapping_gw_id: number;
  mapping_gw_name: string;
  routing_gw_id: number;
  routing_gw_name: string;
  start_time: string;
  connect_time: string;
  duration: number;
  status: number;
}

export default function ActiveCallsPage() {
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [killingId, setKillingId] = useState<string | null>(null);

  const handleKill = async (callId: string) => {
    if (!window.confirm(`Terminate call ${callId}? This will disconnect the call immediately.`)) return;
    setError("");
    setSuccess("");
    setKillingId(callId);
    try {
      const res = await fetch(`/api/vos/current-call?id=${encodeURIComponent(callId)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCalls((prev) => prev.filter((c) => (c.call_id || String(c.id)) !== callId));
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

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch("/api/vos/active-calls");
      const data = await res.json();
      setCalls(data.activeCalls || []);
      if (data.error) setError(data.note ? `${data.error}. ${data.note}` : data.error);
      else if (data.note) setError(data.note);
    } catch {
      setError("Failed to fetch active calls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchCalls, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchCalls]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Phone className="w-6 h-6 text-emerald-400" />
            Active Calls
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Real-time view of active call sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-surface-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-surface-600 bg-surface-800"
            />
            Auto-refresh (3s)
          </label>
          <button
            onClick={fetchCalls}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-300 hover:text-surface-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-sm text-amber-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-sm text-emerald-400">{success}</p>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-300">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg">
              <PhoneCall className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-surface-400 uppercase">Active Calls</p>
              <p className="text-2xl font-bold text-surface-50">{calls.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-surface-400 uppercase">Avg Duration</p>
              <p className="text-2xl font-bold text-surface-50">
                {calls.length > 0
                  ? formatDuration(
                      Math.round(
                        calls.reduce((a, c) => a + (c.duration || 0), 0) /
                          calls.length
                      )
                    )
                  : "0:00"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Live Monitoring</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-800/50 border-b border-surface-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Call ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Caller
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Called
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Mapping GW
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Routing GW
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Start Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Actions
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
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <Phone className="w-12 h-12 text-surface-700 mx-auto mb-3" />
                    <p className="text-surface-500">No active calls</p>
                  </td>
                </tr>
              ) : (
                calls.map((c, i) => (
                  <tr key={c.call_id || i} className="hover:bg-surface-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-surface-400">
                      {c.call_id || c.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-50">
                      {c.caller}
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-50">
                      {c.callee}
                    </td>
                    <td className="px-4 py-3 text-blue-400">
                      {c.customer_name || c.customer_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-surface-300">
                      {c.mapping_gw_name || c.mapping_gw_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-purple-400">
                      {c.routing_gw_name || c.routing_gw_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-surface-300">
                      {formatTime(c.start_time)}
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-300">
                      {formatDuration(c.duration || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400">
                        Connected
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleKill(c.call_id || String(c.id))}
                        disabled={killingId === (c.call_id || String(c.id))}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={`Terminate call ${c.call_id || c.id}`}
                      >
                        {killingId === (c.call_id || String(c.id)) ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PhoneOff className="w-3.5 h-3.5" />
                        )}
                        {killingId === (c.call_id || String(c.id)) ? "Killing..." : "Kill"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
