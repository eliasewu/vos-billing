"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, LogOut, Wifi, WifiOff, RefreshCw, Bell, DollarSign, TrendingDown, Server, ShieldAlert, Activity, X, Menu } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface HeaderProps {
  user: {
    id: number;
    username: string;
    userType: number;
  };
  onMobileMenuToggle?: () => void;
}

interface Notification {
  id: string;
  type: "low_balance" | "low_asr" | "route_offline" | "gateway_offline" | "system_alarm" | "high_fail_rate";
  level: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  link?: string;
}

const NOTIF_ICONS: Record<Notification["type"], React.ComponentType<{ className?: string }>> = {
  low_balance: DollarSign,
  low_asr: TrendingDown,
  route_offline: Server,
  gateway_offline: Server,
  system_alarm: ShieldAlert,
  high_fail_rate: Activity,
};

const LEVEL_COLORS = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500" },
  info: { bg: "bg-brand-500/10", text: "text-brand-400", border: "border-brand-500/20", dot: "bg-brand-500" },
};

export default function Header({ user, onMobileMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [dbVersion, setDbVersion] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const checkConnection = async () => {
    setConnectionStatus("checking");
    try {
      const res = await fetch("/api/vos/connection");
      const data = await res.json();
      if (data.connected) {
        setConnectionStatus("connected");
        setDbVersion(data.version || "");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/vos/notifications");
      const data = await res.json();
      if (!data.error) {
        setNotifications(data.notifications || []);
        setNotifCount(data.count || 0);
        setCriticalCount(data.criticalCount || 0);
      }
    } catch { /* silent */ }
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check connection + fetch notifications on mount, then poll
  useEffect(() => {
    checkConnection();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <header className="h-12 sm:h-14 border-b border-brand-500 bg-gradient-to-b from-blue-600 to-blue-900 px-2 sm:px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {/* Mobile hamburger */}
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors touch-manipulation flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Connection Status */}
        <button
          onClick={checkConnection}
          className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-brand-700 border border-brand-500/50 text-xs sm:text-sm hover:border-brand-500 transition-colors flex-shrink-0"
          title={connectionStatus === "connected" ? `MySQL ${dbVersion}` : connectionStatus === "disconnected" ? "Disconnected" : "Checking..."}
        >
          {connectionStatus === "checking" ? (
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/60 animate-spin" />
          ) : connectionStatus === "connected" ? (
            <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300" />
          ) : (
            <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
          )}
          <span className="hidden sm:inline text-white/60 text-xs">{connectionStatus === "connected" ? "DB Connected" : connectionStatus === "checking" ? "Checking" : "Disconnected"}</span>
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifDropdown(!showNotifDropdown); if (!showNotifDropdown) fetchNotifications(); }}
            className={`relative p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation ${
              showNotifDropdown ? "bg-brand-700" : "hover:bg-white/10"
            }`}
          >
            <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${criticalCount > 0 ? "text-red-300" : notifCount > 0 ? "text-amber-300" : "text-white/70"}`} />
            {notifCount > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white ${
                criticalCount > 0 ? "bg-red-500" : "bg-amber-500"
              }`}>
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-96 max-h-[70vh] overflow-y-auto bg-surface-900 border border-surface-700 rounded-xl shadow-2xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
                <h3 className="text-sm font-bold text-surface-50 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                  {notifCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      criticalCount > 0 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {criticalCount > 0 && `${criticalCount} critical`}
                      {criticalCount > 0 && notifCount > criticalCount && " · "}
                      {notifCount > criticalCount && `${notifCount - criticalCount} warnings`}
                    </span>
                  )}
                </h3>
                <button onClick={() => setShowNotifDropdown(false)} className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-50">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-10 h-10 text-surface-600 mx-auto mb-2" />
                  <p className="text-surface-500 text-sm">No alerts — all systems normal</p>
                  <button
                    onClick={fetchNotifications}
                    className="mt-2 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 mx-auto"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
              ) : (
                <div className="py-2">
                  {notifications.map((n) => {
                    const Icon = NOTIF_ICONS[n.type];
                    const colors = LEVEL_COLORS[n.level];
                    const Content = (
                      <div className="flex gap-3 px-4 py-3 hover:bg-surface-800/50 transition-colors">
                        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
                            <p className="text-sm font-bold text-surface-50 truncate">{n.title}</p>
                          </div>
                          <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-surface-600 mt-1">{formatTime(n.timestamp)}</p>
                        </div>
                      </div>
                    );
                    return n.link ? (
                      <Link key={n.id} href={n.link} onClick={() => setShowNotifDropdown(false)} className="block">
                        {Content}
                      </Link>
                    ) : (
                      <div key={n.id}>{Content}</div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Info */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-700 border border-brand-500/50">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="text-white font-bold text-sm">{user.username}</span>
            <span className="text-white/60 ml-1.5 text-xs">
              {user.userType === 0 ? "Admin" : "Operator"}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-xs sm:text-sm font-bold touch-manipulation"
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
