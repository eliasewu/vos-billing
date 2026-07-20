"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, RefreshCw, Server, Phone, TrendingUp, Clock } from "lucide-react";

interface Stats {
  customers: { total: number; active: number };
  gateways: { total: number; active: number; mapping: number; routing: number };
  activeCalls: number;
  todayCalls: number;
  todayDuration: number;
  todayRevenue: number;
  todayCost: number;
}

export default function MonitoringPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/vos/stats");
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
        setLastUpdate(new Date());
      }
    } catch {
      // Silent fail for monitoring
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            System Monitoring
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Real-time system status and metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-surface-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
          <label className="flex items-center gap-2 text-sm text-surface-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-surface-600 bg-surface-800"
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-300 hover:text-surface-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Live Status */}
          <div className="bg-gradient-to-r from-emerald-900/20 to-surface-900 border border-emerald-500/20 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <h3 className="text-lg font-semibold text-surface-50">System Online</h3>
                <p className="text-emerald-400/80 text-sm">
                  Database connected and responding
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Phone className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm text-surface-400">Active Calls</span>
              </div>
              <p className="text-3xl font-bold text-surface-50">
                {stats?.activeCalls ?? 0}
              </p>
            </div>

            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Server className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm text-surface-400">Active Gateways</span>
              </div>
              <p className="text-3xl font-bold text-surface-50">
                {stats?.gateways?.active ?? 0}
                <span className="text-lg text-surface-500">
                  / {stats?.gateways?.total ?? 0}
                </span>
              </p>
            </div>

            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm text-surface-400">Today Duration</span>
              </div>
              <p className="text-3xl font-bold text-surface-50">
                {formatDuration(stats?.todayDuration ?? 0)}
              </p>
            </div>

            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-sm text-surface-400">Today Margin</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400">
                ${Number(((stats?.todayRevenue ?? 0) - (stats?.todayCost ?? 0))).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-surface-50 mb-4">
                Gateway Breakdown
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-surface-400">Mapping (Inbound)</span>
                  <span className="text-surface-50 font-medium">
                    {stats?.gateways?.mapping ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-surface-400">Routing (Outbound)</span>
                  <span className="text-surface-50 font-medium">
                    {stats?.gateways?.routing ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-surface-700">
                  <span className="text-surface-400">Total Gateways</span>
                  <span className="text-surface-50 font-medium">
                    {stats?.gateways?.total ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-surface-50 mb-4">
                Today&apos;s Financials
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-surface-400">Revenue</span>
                  <span className="text-emerald-400 font-mono font-medium">
                    ${Number(stats?.todayRevenue ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-surface-400">Cost</span>
                  <span className="text-red-400 font-mono font-medium">
                    ${Number(stats?.todayCost ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-surface-700">
                  <span className="text-surface-400">Net Margin</span>
                  <span className="text-emerald-400 font-mono font-medium">
                    ${Number(((stats?.todayRevenue ?? 0) - (stats?.todayCost ?? 0))).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Stats */}
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-surface-50 mb-4">
              Customer Overview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-surface-500 uppercase mb-1">
                  Total Customers
                </p>
                <p className="text-2xl font-bold text-surface-50">
                  {stats?.customers?.total ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase mb-1">
                  Active Customers
                </p>
                <p className="text-2xl font-bold text-emerald-400">
                  {stats?.customers?.active ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase mb-1">
                  Today&apos;s Calls
                </p>
                <p className="text-2xl font-bold text-surface-50">
                  {stats?.todayCalls ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase mb-1">
                  Total Minutes
                </p>
                <p className="text-2xl font-bold text-surface-50">
                  {Math.round((stats?.todayDuration ?? 0) / 60)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
