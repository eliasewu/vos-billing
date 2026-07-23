"use client";

import { useState, useEffect } from "react";
import { LogIn, RefreshCw, Clock, Monitor, Download } from "lucide-react";
import DataTable, { type Column } from "@/components/DataTable";

interface LoginLog { id: number; username: string; loginTime: number; logoutTime: number; ip: string; status: number; memo: string; }

export default function LoginQueryPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/login-log");
      const data = await res.json();
      if (data.error) setError(data.error); else setLogs(data.logs || []);
    } catch { setError("Failed to load login logs"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  const successLogins = logs.filter(l => l.status === 1 || l.status === 0).length;

  const exportCSV = () => {
    const h = ["ID","Username","Login Time","Logout Time","IP","Status","Memo"];
    const csv = [h.join(","), ...logs.map(l => [l.id,l.username,formatTime(l.loginTime),formatTime(l.logoutTime),l.ip,l.status===1?"Success":"Failed",`"${(l.memo||"").replace(/"/g,'""')}"`].join(","))].join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="login_logs.csv"; a.click();
  };

  const columns: Column<LoginLog>[] = [
    { key: "username", label: "Username", cellClassName: "text-surface-50 font-medium" },
    { key: "loginTime", label: "Login Time", render: (l) => <span className="text-xs whitespace-nowrap">{formatTime(l.loginTime)}</span> },
    { key: "logoutTime", label: "Logout Time", render: (l) => <span className="text-xs whitespace-nowrap text-surface-400">{l.logoutTime ? formatTime(l.logoutTime) : "Active"}</span> },
    { key: "ip", label: "IP Address", cellClassName: "font-mono text-xs" },
    { key: "status", label: "Status", textAlign: "center", render: (l) => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${l.status===1||l.status===0?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>{l.status===1||l.status===0?"Success":"Failed"}</span>
    )},
    { key: "memo", label: "Memo", render: (l) => <span className="max-w-[200px] truncate block text-surface-400">{l.memo||"—"}</span> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Login Query</h1><p className="text-surface-400 text-sm mt-1">{logs.length} login records</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4"/></button>
          <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><LogIn className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{logs.length}</p><p className="text-xs text-surface-400">Total Logins</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Monitor className="w-5 h-5 text-emerald-400"/></div><div><p className="text-2xl font-bold text-surface-50">{successLogins}</p><p className="text-xs text-surface-400">Successful</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Clock className="w-5 h-5 text-violet-400"/></div><div><p className="text-2xl font-bold text-surface-50">{new Set(logs.map(l=>l.ip)).size}</p><p className="text-xs text-surface-400">Unique IPs</p></div></div></div>
      </div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <DataTable
        columns={columns}
        data={logs}
        searchKey="username"
        loading={loading}
        emptyMessage="No login records"
        emptySubtitle="Login records appear when users sign in to the system"
        emptyIcon={<LogIn className="w-10 h-10 text-surface-600" />}
        pageSize={20}
      />
    </div>
  );
}
