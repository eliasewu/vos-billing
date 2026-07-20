"use client";

import { useState, useEffect } from "react";
import { BarChart3, PhoneCall, Clock, TrendingUp, DollarSign, RefreshCw, GitBranch, Server , Download} from "lucide-react";

interface GatewayPerf {
  id: number; name: string; capacity: number; remoteIps: string; lockType: number;
  priority: number; customerName: string | null; totalCalls: number;
  totalDuration: number; asr: number; acd: number;
}

interface Summary { totalCalls: number; totalDuration: number; avgAsr: number; avgAcd: number; totalRevenue: number; }

export default function MappingPerformancePage() {
  const [gateways, setGateways] = useState<GatewayPerf[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalCalls: 0, totalDuration: 0, avgAsr: 0, avgAcd: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/vos/cdr-analysis/mapping-performance");
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setGateways(d.gateways || []); setSummary(d.summary || {}); }
    } catch { setError("Failed to load performance data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const formatDuration = (s: number) => {
    if (!s) return "0s";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const formatPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const formatMoney = (v: number) => `$${v.toFixed(4)}`;

  const activeGateways = gateways.filter(g => g.lockType === 0).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Mapping Gateway Performance</h1>
          <p className="text-surface-400 text-sm mt-1">{gateways.length} gateways | {activeGateways} active</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><PhoneCall className="w-5 h-5 text-brand-400" /></div>
          </div>
          <p className="text-2xl font-bold text-surface-50">{summary.totalCalls.toLocaleString()}</p>
          <p className="text-xs text-surface-400 mt-1">Total Calls</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-400" /></div>
          </div>
          <p className="text-2xl font-bold text-surface-50">{formatPct(summary.avgAsr)}</p>
          <p className="text-xs text-surface-400 mt-1">Avg ASR</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-400" /></div>
          </div>
          <p className="text-2xl font-bold text-surface-50">{summary.avgAcd > 0 ? `${summary.avgAcd.toFixed(0)}s` : "—"}</p>
          <p className="text-xs text-surface-400 mt-1">Avg ACD</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Clock className="w-5 h-5 text-violet-400" /></div>
          </div>
          <p className="text-2xl font-bold text-surface-50">{formatDuration(summary.totalDuration)}</p>
          <p className="text-xs text-surface-400 mt-1">Total Duration</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-rose-400" /></div>
          </div>
          <p className="text-2xl font-bold text-surface-50">{summary.totalRevenue > 0 ? formatMoney(summary.totalRevenue) : "—"}</p>
          <p className="text-xs text-surface-400 mt-1">Total Revenue</p>
        </div>
      </div>

      {/* Gateway Performance Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-800 flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-surface-50">Gateway Performance</h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-12 bg-surface-800 rounded animate-pulse" />)}</div>
        ) : gateways.length === 0 ? (
          <div className="p-12 text-center text-surface-500"><Server className="w-12 h-12 mx-auto mb-3 text-surface-600" /><p>No mapping gateways found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Gateway</th>
                  <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Customer</th>
                  <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Capacity</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Calls</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Duration</th>
                  <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase">ASR</th>
                  <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase">ACD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {gateways.map(g => (
                  <tr key={g.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GitBranch className={`w-4 h-4 ${g.lockType === 0 ? "text-emerald-400" : "text-red-400"}`} />
                        <div>
                          <p className="text-surface-50 font-medium">{g.name}</p>
                          <p className="text-xs text-surface-500 font-mono">{g.remoteIps}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-surface-300 text-xs">{g.customerName || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${g.lockType === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${g.lockType === 0 ? "bg-emerald-400" : "bg-red-400"}`} />
                        {g.lockType === 0 ? "Active" : "Locked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-surface-300 font-mono">{g.capacity}</td>
                    <td className="px-4 py-3 text-right text-surface-50 font-mono font-medium">{g.totalCalls.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-surface-300 font-mono text-xs">{formatDuration(g.totalDuration)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono ${g.asr > 0.5 ? "bg-emerald-500/10 text-emerald-400" : g.asr > 0 ? "bg-amber-500/10 text-amber-400" : "bg-surface-800 text-surface-500"}`}>
                        {g.asr > 0 ? formatPct(g.asr) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-surface-300 font-mono text-xs">{g.acd > 0 ? `${g.acd.toFixed(1)}s` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && gateways.length > 0 && summary.totalCalls === 0 && (
          <div className="px-5 py-6 text-center text-surface-500 border-t border-surface-800">
            <p className="text-sm">No call data available yet — stats will populate when CDR records flow in</p>
          </div>
        )}
      </div>
    </div>
  );
}
