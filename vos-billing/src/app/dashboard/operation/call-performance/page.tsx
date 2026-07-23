"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  RefreshCw,
  PhoneCall,
  Timer,
  Activity,
  TrendingUp,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
} from "lucide-react";

interface CallSummary {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  totalDuration: number;
  avgDuration: number;
  asr: number;
  cps: number;
  concurrent: number;
  periodDays: number;
}

interface DailyPoint {
  date: string;
  calls: number;
  success: number;
  duration: number;
  asr: number;
}

interface HourlyPoint {
  hour: number;
  calls: number;
  success: number;
  asr: number;
}

interface PeakHour {
  hour: number;
  calls: number;
  success: number;
  asr: number;
}

interface FailReason {
  reason: string;
  count: number;
}

interface SCDBucket {
  label: string;
  count: number;
  percentage: number;
}

interface CallPerfData {
  summary: CallSummary;
  daily: DailyPoint[];
  hourly: HourlyPoint[];
  peakHour: PeakHour | null;
  scd: SCDBucket[];
  failReasons: FailReason[];
  tables: number;
  totalMinutes: number;
}

export default function CallPerformancePage() {
  const [data, setData] = useState<CallPerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/vos/call-performance");
      const d = await res.json();
      if (d.error) {
        setError(d.error);
        setData(null);
      } else {
        setData(d);
        setError("");
      }
    } catch {
      setError("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatDuration = (s: number) => {
    if (!s) return "0s";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}${ampm}`;
  };

  // Bar chart helpers
  const maxDailyCalls = data ? Math.max(...data.daily.map((d) => d.calls), 1) : 1;
  const maxHourlyCalls = data ? Math.max(...data.hourly.map((h) => h.calls), 1) : 1;
  const maxFailCount = data?.failReasons.length
    ? Math.max(...data.failReasons.map((f) => f.count), 1)
    : 1;
  const maxScdCount = data?.scd.length
    ? Math.max(...data.scd.map((b) => b.count), 1)
    : 1;

  const exportCSV = () => {
    if (!data) return;
    const h = ["Date", "Total Calls", "Success", "Failed", "ASR%", "Duration (s)"];
    const rows = data.daily.map((d) => [
      d.date,
      d.calls,
      d.success,
      d.calls - d.success,
      d.asr,
      d.duration,
    ]);
    const csv = [h.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "call_performance.csv";
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-400" />
            Call Performance
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            CPS, concurrent calls & success rates
            {data && (
              <span className="ml-2 text-xs text-surface-600">
                ({data.tables} CDR partition{data.tables !== 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={!data || data.daily.length === 0}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"
            >
              <div className="h-4 bg-surface-800 rounded w-20 mb-2 animate-pulse" />
              <div className="h-8 bg-surface-800 rounded w-24 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/10 rounded-lg">
                  <PhoneCall className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">
                    Total Calls
                  </p>
                  <p className="text-2xl font-bold text-surface-50">
                    {data.summary.totalCalls.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-lg ${
                    data.summary.asr >= 80
                      ? "bg-emerald-500/10"
                      : data.summary.asr >= 60
                      ? "bg-amber-500/10"
                      : "bg-red-500/10"
                  }`}
                >
                  <TrendingUp
                    className={`w-5 h-5 ${
                      data.summary.asr >= 80
                        ? "text-emerald-400"
                        : data.summary.asr >= 60
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">
                    ASR
                  </p>
                  <p className="text-2xl font-bold text-surface-50">
                    {data.summary.asr}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 rounded-lg">
                  <Zap className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">
                    CPS
                  </p>
                  <p className="text-2xl font-bold text-surface-50">
                    {data.summary.cps}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 rounded-lg">
                  <Activity className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">
                    Concurrent
                  </p>
                  <p className="text-2xl font-bold text-surface-50">
                    {data.summary.concurrent}
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
                    Avg Duration
                  </p>
                  <p className="text-2xl font-bold text-surface-50">
                    {data.summary.avgDuration}s
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">
                    Success
                  </p>
                  <p className="text-2xl font-bold text-surface-50">
                    {data.summary.successCalls.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Call Volume */}
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                Daily Call Volume
                <span className="text-xs text-surface-500 font-normal ml-auto">
                  {data.daily.length}d
                </span>
              </h3>
              {data.daily.length === 0 ? (
                <p className="text-surface-600 text-sm text-center py-8">
                  No data available
                </p>
              ) : (
                <div className="space-y-1.5">
                  {data.daily.map((d) => (
                    <div key={d.date} className="flex items-center gap-2">
                      <span className="text-xs text-surface-500 w-12 text-right tabular-nums">
                        {d.date.slice(5)}
                      </span>
                      <div className="flex-1 relative h-6">
                        <div
                          className="absolute inset-y-1 rounded-sm bg-brand-500/30 hover:bg-brand-500/50 transition-colors"
                          style={{
                            width: `${Math.max((d.calls / maxDailyCalls) * 100, 0.5)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-surface-400 w-14 text-right tabular-nums">
                        {d.calls.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily ASR */}
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Daily ASR %
                <span className="text-xs text-surface-500 font-normal ml-auto">
                  avg: {data.summary.asr}%
                </span>
              </h3>
              {data.daily.length === 0 ? (
                <p className="text-surface-600 text-sm text-center py-8">
                  No data available
                </p>
              ) : (
                <div className="space-y-1.5">
                  {data.daily.map((d) => (
                    <div key={d.date} className="flex items-center gap-2">
                      <span className="text-xs text-surface-500 w-12 text-right tabular-nums">
                        {d.date.slice(5)}
                      </span>
                      <div className="flex-1 relative h-6">
                        <div className="absolute inset-y-1 w-full rounded-sm bg-surface-800" />
                        <div
                          className={`absolute inset-y-1 rounded-sm transition-colors ${
                            d.asr >= 80
                              ? "bg-emerald-500/40"
                              : d.asr >= 60
                              ? "bg-amber-500/40"
                              : "bg-red-500/40"
                          }`}
                          style={{ width: `${Math.max(d.asr, 0.5)}%` }}
                        />
                        {/* 80% reference line */}
                        <div
                          className="absolute inset-y-0 border-r border-dashed border-surface-700"
                          style={{ left: "80%" }}
                        />
                      </div>
                      <span
                        className={`text-xs w-12 text-right tabular-nums font-medium ${
                          d.asr >= 80
                            ? "text-emerald-400"
                            : d.asr >= 60
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {d.asr}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hourly Distribution */}
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-amber-400" />
                Hourly Distribution (24h)
                {data.peakHour && (
                  <span className="text-xs text-amber-400 font-normal ml-auto">
                    Peak: {formatHour(data.peakHour.hour)} ({data.peakHour.calls} calls)
                  </span>
                )}
              </h3>
              {data.hourly.every((h) => h.calls === 0) ? (
                <p className="text-surface-600 text-sm text-center py-8">
                  No hourly data available
                </p>
              ) : (
                <div className="flex gap-px items-end" style={{ height: "120px" }}>
                  {data.hourly.map((h) => {
                    const height = maxHourlyCalls > 0 ? (h.calls / maxHourlyCalls) * 100 : 0;
                    const isPeak = data.peakHour && h.hour === data.peakHour.hour;
                    return (
                      <div key={h.hour} className="flex flex-col items-center gap-0.5 flex-1">
                        <span className="text-[10px] text-surface-600">
                          {h.calls > 0 ? h.calls : ""}
                        </span>
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className={`w-full rounded-t-sm transition-colors ${
                              isPeak
                                ? "bg-amber-500/60 hover:bg-amber-500/80"
                                : h.asr >= 80
                                ? "bg-emerald-500/20 hover:bg-emerald-500/40"
                                : h.asr >= 60
                                ? "bg-amber-500/20 hover:bg-amber-500/40"
                                : "bg-red-500/20 hover:bg-red-500/40"
                            }`}
                            style={{ height: `${Math.max(height, 1)}%` }}
                            title={`${formatHour(h.hour)}: ${h.calls} calls, ${h.asr}% ASR`}
                          />
                        </div>
                        <span
                          className={`text-[10px] ${
                            isPeak ? "text-amber-400 font-semibold" : "text-surface-600"
                          }`}
                        >
                          {h.hour % 6 === 0 ? formatHour(h.hour) : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SCD: Success Call Distribution */}
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-4">
                <Timer className="w-4 h-4 text-cyan-400" />
                SCD — Success Call Distribution
                <span className="text-xs text-surface-500 font-normal ml-auto">
                  {data.summary.successCalls.toLocaleString()} successful calls
                </span>
              </h3>
              {data.scd.length === 0 || data.scd.every(b => b.count === 0) ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-10 h-10 text-surface-600 mx-auto mb-2" />
                  <p className="text-surface-500 text-sm">No SCD data available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.scd.map((b) => (
                    <div key={b.label} className="flex items-center gap-2">
                      <span className="text-xs text-surface-400 w-16 text-right tabular-nums">
                        {b.label}
                      </span>
                      <div className="flex-1 relative h-6">
                        <div className="absolute inset-y-1 w-full rounded-sm bg-surface-800" />
                        <div
                          className="absolute inset-y-1 rounded-sm bg-cyan-500/40 hover:bg-cyan-500/60 transition-colors"
                          style={{
                            width: `${Math.max((b.count / maxScdCount) * 100, 0.5)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-surface-400 w-14 text-right tabular-nums">
                        {b.count.toLocaleString()}
                      </span>
                      <span className="text-xs text-cyan-400 w-12 text-right tabular-nums font-medium">
                        {b.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fail Reasons */}
            <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-4">
                <XCircle className="w-4 h-4 text-red-400" />
                Fail Reasons
                <span className="text-xs text-surface-500 font-normal ml-auto">
                  {data.summary.failedCalls.toLocaleString()} failed
                </span>
              </h3>
              {data.failReasons.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <p className="text-surface-500 text-sm">No failed calls</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.failReasons.map((f) => (
                    <div key={f.reason} className="flex items-center gap-2">
                      <span className="text-xs text-surface-400 w-20 truncate">
                        {f.reason}
                      </span>
                      <div className="flex-1 relative h-5">
                        <div className="absolute inset-y-1 w-full rounded-sm bg-surface-800" />
                        <div
                          className="absolute inset-y-1 rounded-sm bg-red-500/30 hover:bg-red-500/50 transition-colors"
                          style={{
                            width: `${Math.max((f.count / maxFailCount) * 100, 1)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-red-400 w-10 text-right tabular-nums font-medium">
                        {f.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary Footer */}
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-surface-500">
            <div className="flex items-center gap-4 flex-wrap">
              <span>
                Period: {data.summary.periodDays} days
              </span>
              <span>·</span>
              <span>
                Total Duration: {formatDuration(data.summary.totalDuration)}
              </span>
              <span>·</span>
              <span>
                Success Rate: {data.summary.asr}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>≥80% ASR</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-2" />
              <span>60-80%</span>
              <span className="w-2 h-2 rounded-full bg-red-400 ml-2" />
              <span>&lt;60%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
