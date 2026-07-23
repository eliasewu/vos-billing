"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, LogIn, AlertCircle, Eye, EyeOff, Shield, Server, Fingerprint, UserCog, Users } from "lucide-react";
import TawkToChat from "@/components/TawkToChat";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loginType, setLoginType] = useState<"admin" | "customer">("admin");

  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  // Background check: if already logged in, redirect to dashboard
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) router.replace("/dashboard");
      })
      .catch(() => {});
  }, [router]);

  const isCustomer = loginType === "customer";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe, loginType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect to server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface-950">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-surface-900">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Gradient orbs */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Logo area */}
          <div>
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                <Zap className="w-6 h-6 text-surface-50" />
              </div>
              <div className="text-surface-50">
                <div className="font-bold text-lg leading-tight">Net2App</div>
                <div className="text-xs text-surface-50/60">Enterprise</div>
              </div>
            </div>

            <h2 className="text-3xl xl:text-4xl font-bold text-surface-50 leading-tight">
              VOS Billing
              <br />
              <span className="text-brand-300">Management Platform</span>
            </h2>

            <p className="mt-4 text-surface-50/60 text-sm leading-relaxed max-w-sm">
              Complete VoIP softswitch billing solution. Manage customers,
              routes, CDRs, and real-time call monitoring all in one place.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mt-0.5">
                <Server className="w-4 h-4 text-brand-300" />
              </div>
              <div>
                <div className="text-sm font-medium text-surface-50/80">
                  Real-time Monitoring
                </div>
                <div className="text-xs text-surface-50/50">
                  Live call tracking and CDR analysis
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mt-0.5">
                <Shield className="w-4 h-4 text-brand-300" />
              </div>
              <div>
                <div className="text-sm font-medium text-surface-50/80">
                  Secure Access
                </div>
                <div className="text-xs text-surface-50/50">
                  SSL encrypted connection to VOS3000 database
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-surface-50/40">
            &copy; {new Date().getFullYear()} Net2App Enterprise. All rights
            reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo (visible on small screens only) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 mb-3 shadow-lg shadow-brand-500/25">
              <Zap className="w-7 h-7 text-surface-50" />
            </div>
            <h1 className="text-xl font-bold text-surface-50">Net2App</h1>
            <p className="text-surface-400 text-xs mt-0.5">VOS Billing Platform</p>
          </div>

          {/* Form Card */}
          <div className="bg-surface-900/80 border border-surface-700/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/20">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-surface-50">
                Sign in to your account
              </h2>
              <p className="text-surface-400 text-xs sm:text-sm mt-1">
                {isCustomer
                  ? "Enter your customer account credentials"
                  : "Enter your VOS3000 administrator credentials"}
              </p>
            </div>

            {/* Login Type Toggle */}
            <div className="flex p-1 bg-surface-800 rounded-xl mb-2">
              <button
                type="button"
                onClick={() => setLoginType("admin")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  !isCustomer
                    ? "bg-brand-600 text-surface-50 shadow-sm"
                    : "text-surface-400 hover:text-surface-200"
                }`}
              >
                <UserCog className="w-4 h-4" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginType("customer")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isCustomer
                    ? "bg-emerald-600 text-surface-50 shadow-sm"
                    : "text-surface-400 hover:text-surface-200"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Customer CDR</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs sm:text-sm font-medium text-surface-300 mb-1.5 sm:mb-2"
                >
                  {isCustomer ? "Account Number" : "Username"}
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-surface-800/80 border border-surface-700 rounded-xl sm:rounded-2xl text-surface-50 text-sm sm:text-base placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200"
                    placeholder={isCustomer ? "Account number" : "admin"}
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm font-medium text-surface-300 mb-1.5 sm:mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 pr-12 bg-surface-800/80 border border-surface-700 rounded-xl sm:rounded-2xl text-surface-50 text-sm sm:text-base placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors touch-manipulation"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 sm:p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              {/* Remember Me + Submit */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="remember"
                  className="flex items-center gap-2 cursor-pointer group touch-manipulation select-none"
                >
                  <div className="relative">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 sm:w-[18px] sm:h-[18px] rounded border-2 border-surface-600 bg-surface-800 peer-checked:bg-brand-600 peer-checked:border-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/50 transition-all duration-200 flex items-center justify-center">
                      <svg
                        className="w-2.5 h-2.5 text-surface-50 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-surface-400 group-hover:text-surface-300 transition-colors">
                    Remember me
                  </span>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-surface-50 rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base transition-all duration-200 shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 touch-manipulation min-h-[48px]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-700/50" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-surface-900 text-xs text-surface-500">
                  Secure database connection
                </span>
              </div>
            </div>

            {/* DB info + Session UUID */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-2 text-xs text-surface-500">
                <Server className="w-3.5 h-3.5" />
                <span>Direct MySQL &middot; VOS3000 v5.0</span>
              </div>
              {sessionId && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-800/50 border border-surface-700/50 rounded-lg">
                  <Fingerprint className="w-3 h-3 text-brand-400" />
                  <span className="text-[10px] text-surface-500 font-mono tracking-tight">
                    {sessionId.slice(0, 18)}&hellip;
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Help text */}
          <p className="mt-5 text-center text-xs text-surface-600">
            Need help? Chat with our support team
          </p>
        </div>
      </div>

      {/* Tawk.to Live Chat */}
      <TawkToChat />
    </div>
  );
}
