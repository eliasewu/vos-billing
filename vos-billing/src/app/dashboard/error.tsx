"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AlertTriangle, RefreshCw, HardDrive, Loader2 } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const retriesRef = useRef(0);
  const maxRetries = 3;
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    console.error("[Dashboard] Render error:", error.message || error);
  }, [error]);

  // Auto-retry with max attempts (stops after 3 failures to avoid infinite loop)
  useEffect(() => {
    if (retriesRef.current >= maxRetries) return;
    if (countdown <= 0) {
      retriesRef.current += 1;
      reset();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, reset]);

  const handleRetry = useCallback(() => {
    retriesRef.current = 0; // Reset retry count on manual retry
    setCountdown(5);
    reset();
  }, [reset]);

  const handleHardReload = useCallback(() => {
    // Force full page reload, bypassing Next.js client-side cache
    window.location.href = "/dashboard";
  }, []);

  const isRetrying = countdown === 0 || retriesRef.current > 0;
  const gaveUp = retriesRef.current >= maxRetries;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        {isRetrying && !gaveUp ? (
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        ) : gaveUp ? (
          <AlertTriangle className="w-10 h-10 text-red-400" />
        ) : (
          <AlertTriangle className="w-10 h-10 text-amber-400" />
        )}
      </div>

      <div className="text-center max-w-md space-y-3">
        <h2 className="text-xl font-semibold text-surface-50">
          {gaveUp ? "Unable to Recover" : isRetrying ? "Retrying..." : "Dashboard Error"}
        </h2>
        <p className="text-sm text-surface-400 leading-relaxed">
          {gaveUp
            ? "Automatic recovery failed after 3 attempts. A hard reload usually fixes this."
            : isRetrying
            ? "Attempting to recover the dashboard..."
            : "The dashboard encountered a problem while loading."}
        </p>

        {!isRetrying && !gaveUp && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
                <span className="text-white/60 text-xs ml-1">(auto in {countdown}s)</span>
              </button>
              <button
                onClick={handleHardReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 hover:bg-surface-700 text-surface-300 text-sm font-medium transition-colors"
              >
                <HardDrive className="w-4 h-4" />
                Hard Reload
              </button>
            </div>
            <p className="text-xs text-surface-600">
              If the error persists, try a hard reload or open in an incognito window.
            </p>
          </div>
        )}

        {gaveUp && (
          <div className="space-y-3 pt-2">
            <button
              onClick={handleHardReload}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
            >
              <HardDrive className="w-4 h-4" />
              Hard Reload (Clear Cache)
            </button>
            <p className="text-xs text-surface-600">
              A hard reload clears the browser cache and loads a fresh version of the page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
