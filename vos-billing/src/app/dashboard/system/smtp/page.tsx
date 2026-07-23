"use client";

import { useState, useEffect } from "react";
import { Mail, Save, RefreshCw, CheckCircle, AlertTriangle, X, Eye, EyeOff } from "lucide-react";

interface SmtpConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_secure: string;
}

const DEFAULTS: SmtpConfig = {
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "",
  smtp_secure: "true",
};

export default function SmtpConfigPage() {
  const [config, setConfig] = useState<SmtpConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vos/smtp-config");
      const data = await res.json();
      if (!data.error && data.config) setConfig({ ...DEFAULTS, ...data.config });
    } catch { setError("Failed to load SMTP config"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/smtp-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setSuccess("SMTP configuration saved successfully");
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!config.smtp_from && !config.smtp_user) {
      setError("Please enter a From Address or Username before testing");
      return;
    }
    setTesting(true); setTestResult(null); setError("");
    try {
      const res = await fetch("/api/vos/smtp-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: config.smtp_from || config.smtp_user }),
      });
      const data = await res.json();
      setTestResult({ ok: data.success, message: data.message || data.error || "Unknown result" });
    } catch { setTestResult({ ok: false, message: "Test request failed" }); }
    finally { setTesting(false); }
  };

  const update = (key: keyof SmtpConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Mail className="w-6 h-6 text-brand-400" />SMTP Configuration
          </h1>
          <p className="text-surface-400 text-sm mt-1">Configure outgoing email server for rate notifications and alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchConfig} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto p-0.5 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
          <button onClick={() => setSuccess("")} className="ml-auto p-0.5 hover:text-emerald-300"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {loading ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-8 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-800 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 space-y-5 max-w-2xl">
          {/* SMTP Host */}
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">SMTP Host *</label>
            <input
              type="text"
              value={config.smtp_host}
              onChange={e => update("smtp_host", e.target.value)}
              placeholder="smtp.gmail.com"
              className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 placeholder:text-surface-600"
            />
          </div>

          {/* Port + Secure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Port</label>
              <input
                type="number"
                value={config.smtp_port}
                onChange={e => update("smtp_port", e.target.value)}
                placeholder="587"
                className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">TLS/SSL</label>
              <select
                value={config.smtp_secure}
                onChange={e => update("smtp_secure", e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"
              >
                <option value="true">TLS (STARTTLS)</option>
                <option value="ssl">SSL</option>
                <option value="false">None</option>
              </select>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Username / Email</label>
            <input
              type="text"
              value={config.smtp_user}
              onChange={e => update("smtp_user", e.target.value)}
              placeholder="noreply@example.com"
              className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 placeholder:text-surface-600"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Password / App Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={config.smtp_pass}
                onChange={e => update("smtp_pass", e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 placeholder:text-surface-600"
              />
              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* From Address */}
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">From Address</label>
            <input
              type="email"
              value={config.smtp_from}
              onChange={e => update("smtp_from", e.target.value)}
              placeholder="Net2App Billing <noreply@example.com>"
              className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 placeholder:text-surface-600"
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
              testResult.ok ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-surface-800">
            <button
              onClick={handleSave}
              disabled={saving || !config.smtp_host}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Configuration"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !config.smtp_host}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 hover:bg-surface-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {testing ? "Testing..." : "Send Test Email"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
