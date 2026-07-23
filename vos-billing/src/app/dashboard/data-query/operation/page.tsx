"use client";

import { useState, useEffect } from "react";
import { ClipboardList, RefreshCw, Clock, User, Download } from "lucide-react";
import DataTable, { type Column } from "@/components/DataTable";

interface OpLog { id: number; username: string; operation: string; target: string; detail: string; opTime: number; ip: string; }

export default function OperationQueryPage() {
  const [logs, setLogs] = useState<OpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/operation-log");
      const data = await res.json();
      if (data.error) setError(data.error); else setLogs(data.logs || []);
    } catch { setError("Failed to load operation logs"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  const exportCSV = () => {
    const h = ["ID","Username","Operation","Target","Detail","Time","IP"];
    const csv = [h.join(","), ...logs.map(l => [l.id,l.username,l.operation,l.target,`"${(l.detail||"").replace(/"/g,'""')}"`,formatTime(l.opTime),l.ip].join(","))].join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="operation_logs.csv"; a.click();
  };

  const columns: Column<OpLog>[] = [
    { key: "username", label: "User", cellClassName: "text-surface-50 font-medium" },
    { key: "operation", label: "Operation", cellClassName: "text-xs" },
    { key: "target", label: "Target", render: (l) => <span className="text-xs max-w-[150px] truncate block">{l.target||"—"}</span> },
    { key: "detail", label: "Detail", render: (l) => <span className="text-xs max-w-[250px] truncate block text-surface-400">{l.detail||"—"}</span> },
    { key: "opTime", label: "Time", render: (l) => <span className="text-xs whitespace-nowrap text-surface-400">{formatTime(l.opTime)}</span> },
    { key: "ip", label: "IP", cellClassName: "font-mono text-xs" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Operation Query</h1><p className="text-surface-400 text-sm mt-1">{logs.length} operation records</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4"/></button>
          <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{logs.length}</p><p className="text-xs text-surface-400">Total Operations</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><User className="w-5 h-5 text-emerald-400"/></div><div><p className="text-2xl font-bold text-surface-50">{new Set(logs.map(l=>l.username)).size}</p><p className="text-xs text-surface-400">Operators</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-400"/></div><div><p className="text-2xl font-bold text-surface-50">{new Set(logs.map(l=>l.operation)).size}</p><p className="text-xs text-surface-400">Action Types</p></div></div></div>
      </div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <DataTable
        columns={columns}
        data={logs}
        searchKey="username"
        loading={loading}
        emptyMessage="No operation records"
        emptySubtitle="Operation logs are generated for admin actions like add, edit, and delete"
        emptyIcon={<ClipboardList className="w-10 h-10 text-surface-600" />}
        pageSize={20}
      />
    </div>
  );
}
