"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Server,
  Phone,
  DollarSign,
  TrendingUp,
  Activity,
  PhoneCall,
  Percent,
  Timer,
  AlertTriangle,
  Wallet,
  Wifi,
  GitBranch,
  FileText,
  Clock,
  Building2,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import SkeletonCard from "@/components/SkeletonCard";

interface Stats {
  clientCount: number;
  supplierCount: number;
  totalCalls: number;
  answeredCalls: number;
  totalDuration: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  asr: number;
  acd: number;
  activeGateways: number;
  unacknowledgedAlerts: number;
  totalClientBalance: number;
  topDestinations: Array<{
    destination: string;
    calls: number;
    totalDuration: number;
    revenue: number;
    cost: number;
  }>;
  cdrByStatus: Array<{ status: string; count: number }>;
  hourlyTraffic: Array<{ hour: string; calls: number; answered: number }>;
  billingSummary: {
    totalBilled: number;
    pendingBills: number;
    pendingAmount: number;
    topCustomers: Array<{
      customerId: number;
      customerName: string;
      total: number;
      billCount: number;
      pending: number;
    }>;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStats(data);
        setError("");
        setLastUpdated(new Date());
      }
    } catch {
      // Keep existing stats on refresh failure, only show error on initial load
      setError("Failed to refresh stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatCurrency = (val: number) =>
    `$${Number(val || 0).toFixed(2)}`;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const timeAgo = (date: Date) => {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 10) return "just now";
    return `${secs}s ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-40 bg-surface-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-surface-800 rounded animate-pulse" />
        </div>
        {/* Skeleton grid - row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`sk1-${i}`} />
          ))}
        </div>
        {/* Skeleton grid - row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`sk2-${i}`} />
          ))}
        </div>
        {/* Skeleton grid - row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 animate-pulse">
            <div className="h-4 w-40 bg-surface-700 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`gw-${i}`} className="h-5 bg-surface-700 rounded" />
              ))}
            </div>
          </div>
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 animate-pulse">
            <div className="h-4 w-32 bg-surface-700 rounded mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`qa-${i}`} className="h-14 bg-surface-700 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with live indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">
            Real-time system overview &amp; billing metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-400 tracking-wide">
              LIVE
            </span>
          </div>
          {/* Last updated */}
          {lastUpdated && (
            <span className="text-xs text-surface-500">
              Updated {timeAgo(lastUpdated)}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Row 1 — Operational Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Calls"
          value={stats?.answeredCalls ?? 0}
          icon={PhoneCall}
          color="green"
          subtitle={`of ${stats?.totalCalls ?? 0} total`}
        />
        <StatCard
          title="ASR"
          value={`${stats?.asr ?? 0}%`}
          icon={Percent}
          color="blue"
          subtitle="Answer success rate"
        />
        <StatCard
          title="ACD"
          value={`${stats?.acd ?? 0} min`}
          icon={Timer}
          color="purple"
          subtitle="Avg call duration"
        />
        <StatCard
          title="Active Gateways"
          value={stats?.activeGateways ?? 0}
          icon={Wifi}
          color="yellow"
          subtitle="Online & enabled"
        />
      </div>

      {/* Row 2 — Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(stats?.totalCost ?? 0)}
          icon={TrendingUp}
          color="red"
        />
        <StatCard
          title="Net Margin"
          value={formatCurrency(stats?.totalMargin ?? 0)}
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Client Balance"
          value={formatCurrency(stats?.totalClientBalance ?? 0)}
          icon={Wallet}
          color="purple"
          subtitle="Total held"
        />
      </div>

      {/* Row 2.5 — Billing Summary */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-surface-50">Billing Summary</h3>
        </div>

        {/* Billing stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <StatCard
            title="Total Billed (Invoices)"
            value={formatCurrency(stats?.billingSummary?.totalBilled ?? 0)}
            icon={DollarSign}
            color="green"
            subtitle="All time"
          />
          <StatCard
            title="Pending Bills"
            value={stats?.billingSummary?.pendingBills ?? 0}
            icon={Clock}
            color="yellow"
            subtitle={stats?.billingSummary?.pendingBills ? formatCurrency(stats?.billingSummary?.pendingAmount ?? 0) + " outstanding" : "All settled"}
          />
          <StatCard
            title="Pending Amount"
            value={formatCurrency(stats?.billingSummary?.pendingAmount ?? 0)}
            icon={Wallet}
            color={stats?.billingSummary?.pendingAmount ? "red" : "green"}
            subtitle="Awaiting payment"
          />
        </div>

        {/* Top billing customers */}
        <div>
          <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">
            Top Customers by Billing
          </h4>
          {stats?.billingSummary?.topCustomers?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700/50">
                    <th className="text-left py-2 px-3 text-xs font-medium text-surface-500">#</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-surface-500">Customer</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-surface-500">Bills</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-surface-500">Total</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-surface-500">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.billingSummary.topCustomers.map((cust, i) => (
                    <tr
                      key={cust.customerId}
                      className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-surface-500">{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-brand-400" />
                          </div>
                          <span className="text-surface-200 font-medium truncate max-w-[140px]">
                            {cust.customerName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-surface-400">
                        {cust.billCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-surface-100">
                        {formatCurrency(cust.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={
                            cust.pending > 0
                              ? "text-amber-400 font-medium"
                              : "text-emerald-400"
                          }
                        >
                          {cust.pending > 0 ? formatCurrency(cust.pending) : "Settled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-surface-500 py-4 text-center">
              No billing data available yet. Generate bills from the Billing page.
            </p>
          )}
        </div>
      </div>

      {/* Row 3 — Accounts & Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Clients"
          value={stats?.clientCount ?? 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Suppliers"
          value={stats?.supplierCount ?? 0}
          icon={Server}
          color="purple"
        />
        <StatCard
          title="Total Duration"
          value={formatDuration(stats?.totalDuration ?? 0)}
          icon={Timer}
          color="yellow"
          subtitle="All time"
        />
        <StatCard
          title="Alerts"
          value={stats?.unacknowledgedAlerts ?? 0}
          icon={AlertTriangle}
          color={stats?.unacknowledgedAlerts ? "red" : "green"}
          subtitle={stats?.unacknowledgedAlerts ? "Needs attention" : "All clear"}
        />
      </div>

      {/* Row 4 — Gateway Distribution & Top Destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gateway Distribution */}
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-surface-50 mb-4">
            Call Status Breakdown
          </h3>
          <div className="space-y-3">
            {(stats?.cdrByStatus ?? []).map((item) => {
              const total = stats?.totalCalls ?? 1;
              const pct = Number(((item.count / total) * 100)).toFixed(1);
              const colors: Record<string, string> = {
                answered: "bg-emerald-500",
                failed: "bg-red-500",
                busy: "bg-amber-500",
                no_answer: "bg-orange-500",
                cancelled: "bg-gray-500",
              };
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          colors[item.status] || "bg-surface-500"
                        }`}
                      />
                      <span className="text-sm text-surface-300 capitalize">
                        {item.status.replace("_", " ")}
                      </span>
                    </div>
                    <span className="text-sm text-surface-400">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        colors[item.status] || "bg-surface-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Destinations */}
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-surface-50 mb-4">
            Top Destinations
          </h3>
          <div className="space-y-3">
            {(stats?.topDestinations ?? []).slice(0, 5).map((dest, i) => (
              <div
                key={dest.destination || i}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-medium text-surface-500 w-5">
                    #{i + 1}
                  </span>
                  <span className="text-sm text-surface-200 truncate">
                    {dest.destination || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-surface-400">
                    {dest.calls} calls
                  </span>
                  <span className="text-xs font-medium text-emerald-400">
                    {formatCurrency(dest.revenue)}
                  </span>
                </div>
              </div>
            ))}
            {(!stats?.topDestinations || stats.topDestinations.length === 0) && (
              <p className="text-sm text-surface-500 py-4 text-center">
                No destination data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Row 5 — Quick Actions */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-surface-50 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/customers", icon: Users, label: "Customers", color: "text-brand-400" },
            { href: "/dashboard/gateways", icon: Server, label: "Gateways", color: "text-purple-400" },
            { href: "/dashboard/active-calls", icon: Phone, label: "Active Calls", color: "text-emerald-400" },
            { href: "/dashboard/cdrs", icon: Activity, label: "CDR Records", color: "text-amber-400" },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="flex items-center gap-2.5 p-3.5 bg-surface-800/50 border border-surface-700/50 rounded-xl hover:border-brand-500/30 hover:bg-surface-800 transition-all duration-200 touch-manipulation"
            >
              <action.icon className={`w-5 h-5 ${action.color} flex-shrink-0`} />
              <span className="text-sm text-surface-200 font-medium">
                {action.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
