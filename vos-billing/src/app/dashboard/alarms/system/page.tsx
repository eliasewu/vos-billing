"use client";

import { useState, useEffect } from "react";
import { Bell, Search, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface Alarm { id: number; name: string; value: string; level: number; type: number; time: number; status: number; }

export default function SystemAlarmPage() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAlarms = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/alarms");
      const data = await res.json();
      if (data.error) setError(data.error); else setAlarms(data.alarms || []);
    } catch { setError("Failed to load alarms"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAlarms();
    const interval = setInterval(fetchAlarms, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  const critical = alarms.filter(a => a.level >= 2).length;
  const activeAlarms = alarms.filter(a => a.status === 1 || a.status === 0);
  const typeLabels: Record<number,string> = {0:"Info",1:"Warning",2:"Error",3:"Critical"};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">System Alarm</h1><p className="text-surface-400 text-sm mt-1">{alarms.length} alarms — {critical} critical</p></div>
        <button onClick={fetchAlarms} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Bell className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{alarms.length}</p><p className="text-xs text-surface-400">Total Alarms</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400"/></div><div><p className="text-2xl font-bold text-red-400">{critical}</p><p className="text-xs text-surface-400">Critical/Warning</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-400"/></div><div><p className="text-2xl font-bold text-surface-50">{alarms.filter(a=>a.status===2).length}</p><p className="text-xs text-surface-400">Acknowledged</p></div></div></div>
      </div>

      {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {loading && alarms.length === 0 ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-8 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-surface-500"/></div>
      ) : alarms.length === 0 ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center text-surface-500"><Bell className="w-12 h-12 mx-auto mb-3 text-surface-600"/><p className="text-lg font-medium">No alarms</p><p className="text-sm mt-1">All systems are running normally</p></div>
      ) : (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-surface-800">
              <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Name</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Value</th>
              <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Level</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Type</th>
              <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Time</th><th className="text-center px-4 py-3 text-surface-400 text-xs uppercase">Status</th>
            </tr></thead>
            <tbody>{alarms.map(a=><tr key={a.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
              <td className="px-4 py-3 text-surface-50 font-medium text-xs">{a.name}</td><td className="px-4 py-3 text-surface-300 text-xs">{a.value}</td>
              <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${a.level>=2?"bg-red-500/10 text-red-400":a.level===1?"bg-amber-500/10 text-amber-400":"bg-surface-800 text-surface-400"}`}>{typeLabels[a.level]||`L${a.level}`}</span></td>
              <td className="px-4 py-3 text-surface-400 text-xs">{typeLabels[a.type]||`Type ${a.type}`}</td>
              <td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap flex items-center gap-1.5"><Clock className="w-3 h-3 text-surface-500"/>{formatTime(a.time)}</td>
              <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${a.status===1?"bg-emerald-500/10 text-emerald-400":a.status===2?"bg-surface-800 text-surface-500":"bg-red-500/10 text-red-400"}`}>{a.status===1?"Active":a.status===2?"Acknowledged":"Pending"}</span></td>
            </tr>)}</tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
