"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, Wifi, WifiOff, RefreshCw } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface HeaderProps {
  user: {
    id: number;
    username: string;
    userType: number;
  };
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [dbVersion, setDbVersion] = useState("");

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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <header className="h-14 border-b border-surface-800 bg-surface-950 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <button
          onClick={checkConnection}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900 border border-surface-700/50 text-sm hover:border-surface-600 transition-colors"
        >
          {connectionStatus === "checking" ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-surface-400 animate-spin" />
              <span className="text-surface-400">Checking...</span>
            </>
          ) : connectionStatus === "connected" ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Database Connected</span>
              {dbVersion && (
                <span className="text-surface-500 text-xs">
                  MySQL {dbVersion.split("-")[0]}
                </span>
              )}
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400">Disconnected</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Info */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900 border border-surface-700/50">
          <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center">
            <User className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-sm">
            <span className="text-surface-50 font-medium">{user.username}</span>
            <span className="text-surface-500 ml-1.5">
              {user.userType === 0 ? "Admin" : "Operator"}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
