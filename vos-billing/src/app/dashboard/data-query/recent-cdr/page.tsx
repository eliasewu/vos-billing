"use client";
import { useState, useEffect } from "react";
import { Search, RefreshCw , Download} from "lucide-react";

interface Cdr { id: number; caller: string; callee: string; startTime: string; duration: number; fee: number; status: string; gateway: string; }

export default function Page() {
  const [cdrs, setCdrs] = useState<Cdr[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try { const r = await fetch("/api/vos/recent-cdr"); const d = await r.json(); if (d.error) setError(d.error); else setCdrs(d.cdrs||[]); }
    catch { setError("Failed to load"); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-surface-50">Recent CDR</h1><p className="text-surface-400 text-sm mt-1">Latest call detail records from partitioned tables</p></div>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`} />Refresh</button>
      </div>
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{error}</div>}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800"><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Caller</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Callee</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Gateway</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Duration</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Fee</th><th className="text-center px-4 py-3 text-surface-400 text-xs uppercase">Status</th></tr></thead>
          <tbody className="divide-y divide-surface-800/50">
            {loading ? <tr><td colSpan={6} className="p-6 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-surface-500" /></td></tr> :
              cdrs.length===0 ? <tr><td colSpan={6} className="p-12 text-center text-surface-500"><Search className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No CDR records found in recent partitions</p><p className="text-xs mt-1">Records will appear once calls begin flowing through the system</p></td></tr> :
              cdrs.map(c => (
                <tr key={c.id} className="hover:bg-surface-800/30">
                  <td className="px-4 py-3 text-surface-50 font-mono text-sm">{c.caller}</td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-sm">{c.callee}</td>
                  <td className="px-4 py-3 text-surface-400 text-xs">{c.gateway||"—"}</td>
                  <td className="px-4 py-3 text-right text-surface-50 font-mono">{c.duration}s</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-mono">${Number(c.fee||0).toFixed(4)}</td>
                  <td className="px-4 py-3 text-center"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">{c.status||"completed"}</span></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
