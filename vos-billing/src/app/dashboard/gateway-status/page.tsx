"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Wifi, WifiOff, RefreshCw, AlertTriangle, Clock, Server } from "lucide-react";

interface GatewayStatus {
  id: number;
  name: string;
  type: string;
  ips: string;
  port: number;
  capacity: number;
  prefix: string;
  locktype: number;
  online: boolean;
  responseTime: number | null;
  error: string | null;
  checkedAt: string;
}

interface PingSummary {
  total: number;
  online: number;
  offline: number;
  locked: number;
}

export default function GatewayStatusPage() {
  const [gateways, setGateways] = useState<GatewayStatus[]>([]);
  const [summary, setSummary] = useState<PingSummary>({ total: 0, online: 0, offline: 0, locked: 0 });
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>("");
  const [error, setError] = useState("");

  const checkGateways = useCallback(async () => {
    try {
      const res = await fetch("/api/vos/gateway-ping");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setGateways(data.gateways || []);
        setSummary(data.summary || { total: 0, online: 0, offline: 0, locked: 0 });
        setLastCheck(new Date().toLocaleTimeString());
        setError("");
      }
    } catch {
      setError("Failed to check gateway status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkGateways();
    const interval = setInterval(checkGateways, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [checkGateways]);

  const timeAgo = (iso: string) => {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 5) return "just now";
    return `${secs}s ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Gateway Status
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Real-time connectivity checks for all gateways
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastCheck && (
            <span className="text-xs text-surface-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last check: {lastCheck}
            </span>
          )}
          <button
            onClick={checkGateways}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-50 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-4 h-4 text-surface-500" />
            <span className="text-xs text-surface-500">Total</span>
          </div>
          <div className="text-2xl font-bold text-surface-50">{summary.total}</div>
        </div>
        <div className="bg-surface-900 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">Online</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{summary.online}</div>
        </div>
        <div className="bg-surface-900 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400">Offline</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{summary.offline}</div>
        </div>
        <div className="bg-surface-900 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400">Locked</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{summary.locked}</div>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : gateways.length === 0 ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-500">No gateways found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gateways.map((gw) => (
            <div
              key={`${gw.type}-${gw.id}`}
              className={`bg-surface-900 border rounded-xl p-4 transition-all ${
                gw.online
                  ? "border-emerald-500/20 hover:border-emerald-500/40"
                  : "border-red-500/20 hover:border-red-500/40"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {gw.online ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                  ) : (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                  <span className="text-surface-50 font-medium text-sm truncate max-w-[140px]">
                    {gw.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                    gw.type === "mapping"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-purple-500/10 text-purple-400"
                  }`}
                >
                  {gw.type === "mapping" ? "MAPPING" : "ROUTING"}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">IP</span>
                  <span className="text-surface-300 font-mono">{gw.ips || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Port</span>
                  <span className="text-surface-300">{gw.port}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Capacity</span>
                  <span className="text-surface-300">{gw.capacity}</span>
                </div>
                {gw.prefix && (
                  <div className="flex items-center justify-between">
                    <span className="text-surface-500">Prefix</span>
                    <span className="text-surface-300 font-mono text-[10px] truncate max-w-[140px]">
                      {gw.prefix}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Response</span>
                  {gw.online ? (
                    <span className="text-emerald-400 font-mono">{gw.responseTime}ms</span>
                  ) : (
                    <span className="text-red-400">Unreachable</span>
                  )}
                </div>
                {gw.locktype !== 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-surface-500">Locked</span>
                    <span className="text-amber-400">Yes</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-surface-800 flex items-center justify-between">
                <span className="text-[10px] text-surface-600">
                  {gw.online ? (
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-emerald-500" />
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <WifiOff className="w-3 h-3 text-red-500" />
                      Offline
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-surface-600">
                  {timeAgo(gw.checkedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
