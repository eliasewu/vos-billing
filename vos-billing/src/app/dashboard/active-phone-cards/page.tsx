"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Phone, Users, DollarSign, Activity, RefreshCw, Clock, Wifi, WifiOff, ExternalLink, Ban, AlertTriangle, Settings, ChevronDown, Bell } from "lucide-react";

interface ActivePhoneCard {
  id: number;
  pin: string;
  password: string;
  displaye164: string;
  activetime: string;
  bindlimit: number;
  memo: string;
  customer_id: number;
  money: number;
  limitmoney: number;
  usedaccount: string;
  usedaccountname: string;
  sold: number;
  locktype: number;
}

interface Summary {
  total: number;
  totalMoney: number;
  uniqueCustomers: number;
}

export default function ActivePhoneCardsPage() {
  const [cards, setCards] = useState<ActivePhoneCard[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, totalMoney: 0, uniqueCustomers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);
  const [confirmKick, setConfirmKick] = useState<{ id: number; pin: string } | null>(null);

  // Alert thresholds (persisted in localStorage)
  const [balanceWarn, setBalanceWarn] = useState(() => {
    if (typeof window === "undefined") return 5;
    return Number(localStorage.getItem("apc_balanceWarn")) || 5;
  });
  const [balanceCritical, setBalanceCritical] = useState(() => {
    if (typeof window === "undefined") return 1;
    return Number(localStorage.getItem("apc_balanceCritical")) || 1;
  });
  const [creditWarnPct, setCreditWarnPct] = useState(() => {
    if (typeof window === "undefined") return 80;
    return Number(localStorage.getItem("apc_creditWarnPct")) || 80;
  });
  const [showSettings, setShowSettings] = useState(false);

  // Persist thresholds when changed
  const updateBalanceWarn = (v: number) => { setBalanceWarn(v); localStorage.setItem("apc_balanceWarn", String(v)); };
  const updateBalanceCritical = (v: number) => { setBalanceCritical(v); localStorage.setItem("apc_balanceCritical", String(v)); };
  const updateCreditWarnPct = (v: number) => { setCreditWarnPct(v); localStorage.setItem("apc_creditWarnPct", String(v)); };

  const fetchActiveCards = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/vos/active-phone-cards");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCards(data.cards || []);
        setSummary(data.summary || { total: 0, totalMoney: 0, uniqueCustomers: 0 });
      }
    } catch {
      setError("Failed to fetch active phone cards");
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchActiveCards();
  }, [fetchActiveCards]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchActiveCards, 15000);
    return () => clearInterval(interval);
  }, [fetchActiveCards]);

  const handleDisconnect = async (id: number) => {
    setDisconnectingId(id);
    try {
      const res = await fetch(`/api/vos/active-phone-cards?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setConfirmKick(null);
        fetchActiveCards();
      }
    } catch {
      setError("Failed to disconnect session");
    } finally {
      setDisconnectingId(null);
    }
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatMoney = (val: number) => `$${Number(val).toFixed(2)}`;

  // Compute alert states for each card
  const getAlertLevel = (c: ActivePhoneCard): "none" | "warn" | "critical" => {
    if (c.money <= balanceCritical) return "critical";
    if (c.money <= balanceWarn) return "warn";
    if (c.limitmoney > 0) {
      const usagePct = ((c.limitmoney - c.money) / c.limitmoney) * 100;
      if (usagePct >= creditWarnPct) return "warn";
    }
    return "none";
  };

  const alertCards = cards.filter((c) => getAlertLevel(c) !== "none");
  const criticalCount = alertCards.filter((c) => getAlertLevel(c) === "critical").length;
  const warnCount = alertCards.length - criticalCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Phone className="w-6 h-6 text-cyan-400" />
            Active Phone Cards
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Real-time monitoring of phone cards currently in use
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-surface-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Refreshed {timeAgo(lastRefresh.toISOString())}
          </span>
          <button
            onClick={fetchActiveCards}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 transition-colors"
            title="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alert Settings Panel */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-surface-400" />
            <span className="text-sm font-medium text-surface-300">Alert Thresholds</span>
            {alertCards.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                {alertCards.length} alert{alertCards.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform ${showSettings ? "rotate-180" : ""}`} />
        </button>
        {showSettings && (
          <div className="px-4 pb-4 border-t border-surface-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1">
                  Balance Warning ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={balanceWarn}
                  onChange={(e) => updateBalanceWarn(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-surface-500 mt-0.5">Flag when balance &le; this amount</p>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">
                  Balance Critical ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={balanceCritical}
                  onChange={(e) => updateBalanceCritical(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-surface-500 mt-0.5">Red alert when balance &le; this amount</p>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">
                  Credit Usage Alert (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={creditWarnPct}
                  onChange={(e) => updateCreditWarnPct(Math.min(100, Math.max(1, parseInt(e.target.value) || 80)))}
                  className="w-full px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-surface-500 mt-0.5">Warn when usage exceeds this % of credit limit</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Active Sessions</p>
              <p className="text-2xl font-bold text-surface-50">{summary.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Total Balance</p>
              <p className={`text-2xl font-bold ${summary.totalMoney >= 0 ? "text-surface-50" : "text-red-400"}`}>
                {formatMoney(summary.totalMoney)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Unique Accounts</p>
              <p className="text-2xl font-bold text-surface-50">{summary.uniqueCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${alertCards.length > 0 ? "bg-amber-500/10" : "bg-surface-800"} flex items-center justify-center`}>
              <Bell className={`w-5 h-5 ${alertCards.length > 0 ? "text-amber-400" : "text-surface-500"}`} />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Alerts</p>
              <p className={`text-2xl font-bold ${alertCards.length > 0 ? "text-amber-400" : "text-surface-50"}`}>
                {alertCards.length}
              </p>
              {alertCards.length > 0 && (
                <p className="text-[10px] text-surface-500">
                  {criticalCount} critical, {warnCount} warning
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && cards.length === 0 && !error && (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
            <WifiOff className="w-7 h-7 text-surface-500" />
          </div>
          <h3 className="text-lg font-semibold text-surface-50 mb-1">No Active Cards</h3>
          <p className="text-sm text-surface-500 max-w-md mx-auto">
            There are currently no phone cards in active use. Cards appear here in real-time when customers start using them.
          </p>
        </div>
      )}

      {/* Active Cards Table */}
      {cards.length > 0 && (
        <div className="bg-surface-900 border border-cyan-500/10 rounded-xl overflow-hidden">
          <div className="p-4 bg-cyan-500/5 border-b border-cyan-500/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Live Active Sessions
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                {cards.length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">PIN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Password</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Caller ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Active Since</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-surface-400">CDR</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-surface-400" title="Actions">Kick</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {cards.map((c, i) => (
                  <tr key={c.id} className={`hover:bg-surface-800/30 transition-colors ${
                    getAlertLevel(c) === "critical"
                      ? "bg-red-500/5 border-l-2 border-l-red-500"
                      : getAlertLevel(c) === "warn"
                      ? "bg-amber-500/5 border-l-2 border-l-amber-500"
                      : ""
                  }`}>
                    <td className="px-4 py-3 text-surface-500 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-cyan-400 text-xs font-medium">{c.pin}</td>
                    <td className="px-4 py-3 font-mono text-surface-300 text-xs">{c.password}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-surface-50 text-xs font-medium">{c.usedaccount || "—"}</p>
                        {c.usedaccountname && (
                          <p className="text-surface-500 text-[10px]">{c.usedaccountname}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className={`text-xs font-medium ${c.money >= 0 ? "text-surface-50" : "text-red-400"}`}>
                          {formatMoney(c.money)}
                        </p>
                        <p className="text-surface-500 text-[10px]">Limit: {formatMoney(c.limitmoney)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-300 text-xs">
                      {c.displaye164 || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-surface-300 text-xs">
                          {c.activetime ? new Date(c.activetime).toLocaleTimeString() : "—"}
                        </p>
                        <p className="text-surface-500 text-[10px]">
                          {c.activetime ? new Date(c.activetime).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-surface-300 text-xs">{timeAgo(c.activetime)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getAlertLevel(c) !== "none" ? (
                          <>
                            <span className={`relative flex h-2 w-2 ${
                              getAlertLevel(c) === "critical" ? "" : ""
                            }`}>
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                getAlertLevel(c) === "critical" ? "bg-red-400" : "bg-amber-400"
                              }`} />
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                getAlertLevel(c) === "critical" ? "bg-red-500" : "bg-amber-500"
                              }`} />
                            </span>
                            <span className={`text-xs font-medium ${
                              getAlertLevel(c) === "critical" ? "text-red-400" : "text-amber-400"
                            }`}>
                              {getAlertLevel(c) === "critical" ? "Critical" : "Warning"}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                            </span>
                            <span className="text-xs text-cyan-400 font-medium">Active</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.displaye164 ? (
                        <Link
                          href={`/dashboard/cdrs?caller=${encodeURIComponent(c.displaye164)}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
                          title="View CDR records for this session"
                        >
                          <ExternalLink className="w-3 h-3" />
                          CDR
                        </Link>
                      ) : (
                        <span className="text-surface-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setConfirmKick({ id: c.id, pin: c.pin })}
                        disabled={disconnectingId === c.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50 transition-colors"
                        title={`Disconnect session for PIN ${c.pin}`}
                      >
                        {disconnectingId === c.id ? (
                          <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <Ban className="w-3 h-3" />
                        )}
                        Kick
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kick Confirmation Modal */}
      {confirmKick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmKick(null)} />
          <div className="relative bg-surface-900 border border-surface-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-50 mb-2">Disconnect Session?</h3>
                <p className="text-xs text-surface-400">
                  This will forcefully disconnect phone card <span className="font-mono text-red-400">{confirmKick.pin}</span>.
                  The card may lose any remaining balance for this session.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setConfirmKick(null)}
                disabled={disconnectingId !== null}
                className="px-4 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisconnect(confirmKick.id)}
                disabled={disconnectingId !== null}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-surface-50 transition-colors"
              >
                {disconnectingId !== null ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
