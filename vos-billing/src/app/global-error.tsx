"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError] Uncaught error:", error?.message, error?.digest);
  }, [error]);

  return (
    <html>
      <body className="bg-surface-950 min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-surface-50 mb-2">Something went wrong</h1>
          <p className="text-surface-400 text-sm mb-6">
            {error?.message || "The application encountered an unexpected error."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => { window.location.href = "/"; }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-50 text-sm font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          </div>
          {error?.digest && (
            <p className="text-surface-600 text-xs mt-6 font-mono">Digest: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
