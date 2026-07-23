"use client";

import { useState, useEffect } from "react";
import { Settings, RefreshCw, Edit2, X, Check, Loader2, Download, Mail, Send } from "lucide-react";
import DataTable from "@/components/DataTable";

interface SysParam { id: number; name: string; value: string; type: string; memo: string; }

export default function SystemParametersPage() {
  const [params, setParams] = useState<SysParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchParams = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/vos/sysparam");
      const d = await r.json();
      if (d.error) setError(d.error); else setParams(d.params || []);
    } catch { setError("Failed to load parameters"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParams(); }, []);

  const saveEdit = async (id: number) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/sysparam", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, value: editValue }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setParams(prev => prev.map(p => p.id === id ? { ...p, value: editValue } : p));
      setEditingId(null); setSuccess("Parameter updated");
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleApply = async () => {
    setSuccess("Parameters refreshed — reloaded from database");
    fetchParams();
  };

  const exportCSV = () => {
    const rows = ["Name,Value,Type,Memo"];
    params.forEach(p => rows.push(`"${p.name}","${p.value}","${p.type}","${p.memo || ""}"`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "system_params.csv"; a.click();
  };

  const startEdit = (p: SysParam) => { setEditingId(p.id); setEditValue(p.value); };
  const cancelEdit = () => { setEditingId(null); setEditValue(""); };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) return;
    setSending(true); setTestResult(null);
    try {
      const res = await fetch("/api/vos/email/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Network error — failed to send test email" });
    } finally { setSending(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-400" />System Parameters
          </h1>
          <p className="text-surface-400 text-sm mt-1">{params.length} configurable parameters</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 text-sm transition-colors">
            <Download className="w-4 h-4" />Export
          </button>
          <button onClick={handleApply} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
            <Check className="w-4 h-4" />Apply
          </button>
          <button onClick={fetchParams} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><button onClick={() => setError("")} className="p-0.5 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2"><button onClick={() => setSuccess("")} className="p-0.5 hover:text-emerald-300"><X className="w-3.5 h-3.5" /></button>{success}</div>}

      {/* ── Test Email Card ── */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-bold text-surface-50">Test Email Delivery</h2>
          <span className="text-surface-500 text-xs ml-2">Verify SMTP is working</span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={e => { setTestEmail(e.target.value); setTestResult(null); }}
            onKeyDown={e => e.key === "Enter" && sendTestEmail()}
            placeholder="admin@example.com"
            className="flex-1 px-4 py-2.5 bg-surface-800 border border-surface-600 rounded-lg text-surface-50 text-sm placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            onClick={sendTestEmail}
            disabled={sending || !testEmail.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-4 h-4" />Send Test Email</>
            )}
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${
            testResult.success
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}>
            <button onClick={() => setTestResult(null)} className="p-0.5 hover:opacity-70 flex-shrink-0 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      <DataTable
        columns={[
          { key: "id", label: "#", render: (p: SysParam) => <span className="text-surface-500 text-xs font-mono">{p.id}</span> },
          { key: "name", label: "Name", render: (p: SysParam) => <span className="text-surface-50 font-medium font-mono text-xs">{p.name}</span> },
          { key: "value", label: "Value", render: (p: SysParam) => (
            editingId === p.id ? (
              <div className="flex items-center gap-2">
                <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-surface-800 border border-brand-500/50 rounded-lg text-surface-50 text-sm font-mono focus:outline-none" autoFocus />
                <button onClick={() => saveEdit(p.id)} disabled={saving}
                  className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-surface-700 text-surface-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : <span className="text-surface-200 font-mono text-xs">{p.value}</span>
          )},
          { key: "type", label: "Type", render: (p: SysParam) => <span className="text-surface-400 text-xs">{p.type || "—"}</span> },
          { key: "memo", label: "Description", render: (p: SysParam) => (
            <span className="text-surface-500 text-xs max-w-[250px] truncate block" title={p.memo}>{p.memo || "—"}</span>
          )},
          { key: "actions", label: "Edit", textAlign: "center" as const, width: "5rem", render: (p: SysParam) => (
            editingId !== p.id ? (
              <button onClick={() => startEdit(p)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            ) : null
          )},
        ]}
        data={params}
        searchKey="name"
        loading={loading}
        emptyIcon={<Settings className="w-10 h-10 text-surface-600" />}
        emptyMessage="No parameters found"
        pageSize={20}
      />
    </div>
  );
}
