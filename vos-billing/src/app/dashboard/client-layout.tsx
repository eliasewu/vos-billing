"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Breadcrumb from "@/components/Breadcrumb";
import { Database, X } from "lucide-react";

interface AuthUser {
  id: number;
  username: string;
  userType: number;
}

export default function DashboardClientLayout({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [dbHealthy, setDbHealthy] = useState(true);
  const [dbError, setDbError] = useState("");
  const [showDbBanner, setShowDbBanner] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }
    return () => { document.body.classList.remove("sidebar-open"); };
  }, [sidebarOpen]);

  // DB health check — poll every 30 seconds
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      const healthy = data.status === "healthy";
      setDbHealthy(healthy);
      if (!data.database?.connected) {
        setDbError(data.database?.error || "VOS3000 database is unreachable");
        setShowDbBanner(true);
      }
    } catch {
      setDbHealthy(false);
      setDbError("Health check failed — server may be down");
      setShowDbBanner(true);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Suspense fallback={<div className="w-[250px] bg-surface-900 border-r border-surface-800 min-h-screen" />}>
          <Sidebar />
        </Suspense>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] shadow-xl">
            <Suspense fallback={<div className="w-[260px] bg-surface-900 min-h-screen" />}>
              <Sidebar />
            </Suspense>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-x-hidden min-w-0">
        {/* DB Down Warning Banner */}
        {!dbHealthy && showDbBanner && (
          <div className="bg-red-600/90 border-b border-red-500 px-3 lg:px-4 py-2 lg:py-2.5 flex items-center justify-between gap-2 lg:gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-white text-xs lg:text-sm font-medium truncate">
                VOS3000 Database Disconnected
              </span>
              {dbError && (
                <span className="text-white/70 text-xs truncate hidden sm:inline">{dbError}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
              <button
                onClick={checkHealth}
                className="px-2 lg:px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setShowDbBanner(false)}
                className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
            </div>
          </div>
        )}
        <Header user={user} onMobileMenuToggle={() => setSidebarOpen(true)} />
        <Breadcrumb />
        <main className="flex-1 p-4 lg:p-6 xl:p-8 max-w-[1600px] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
