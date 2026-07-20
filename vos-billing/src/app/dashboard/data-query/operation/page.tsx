"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Search, RefreshCw, Clock, User, Download } from "lucide-react";

interface OpLog { id: number; username: string; operation: string; target: string; detail: string; opTime: number; ip: string; }

export default function OperationQueryPage() {
  const [logs, setLogs] = useState<OpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  const filtered = logs.filter(l =>
    l.username.toLowerCase().includes(search.toLowerCase()) ||
    l.operation.toLowerCase().includes(search.toLowerCase()) ||
    l.target.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const h = ["ID","Username","Operation","Target","Detail","Time","IP"];
    const csv = [h.join(","), ...filtered.map(l => [l.id,l.username,l.operation,l.target,`"${(l.detail||"").replace(/"/g,'""')}"`,formatTime(l.opTime),l.ip].join(","))].join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="operation_logs.csv"; a.click();
  };

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

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input type="text" placeholder="Search by user, operation, or target..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"/></div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">User</th>
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Operation</th>
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Target</th>
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Detail</th>
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Time</th>
            <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">IP</th>
          </tr></thead>
          <tbody>{loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:6}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):filtered.length===0?<tr><td colSpan={6} className="px-4 py-12 text-center text-surface-500"><ClipboardList className="w-10 h-10 mx-auto mb-2 text-surface-600"/><p>No operation records</p></td></tr>:filtered.map(l=><tr key={l.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
            <td className="px-4 py-3 text-surface-50 font-medium">{l.username}</td>
            <td className="px-4 py-3 text-surface-300 text-xs">{l.operation}</td>
            <td className="px-4 py-3 text-surface-300 text-xs max-w-[150px] truncate">{l.target||"—"}</td>
            <td className="px-4 py-3 text-surface-400 text-xs max-w-[250px] truncate">{l.detail||"—"}</td>
            <td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap">{formatTime(l.opTime)}</td>
            <td className="px-4 py-3 text-surface-300 font-mono text-xs">{l.ip}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}
