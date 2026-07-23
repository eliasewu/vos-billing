"use client";
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import DataTable from "@/components/DataTable";
import { moneyRender } from "@/components/DataTableHelpers";

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
      <DataTable
        columns={[
          { key: "caller", label: "Caller", render: (c: Cdr) => <span className="text-surface-50 font-mono text-sm">{c.caller}</span> },
          { key: "callee", label: "Callee", render: (c: Cdr) => <span className="text-surface-300 font-mono text-sm">{c.callee}</span> },
          { key: "gateway", label: "Gateway", render: (c: Cdr) => <span className="text-surface-400 text-xs">{c.gateway||"—"}</span> },
          { key: "duration", label: "Duration", textAlign: "right" as const, render: (c: Cdr) => (
            <span className="text-surface-50 font-mono">{c.duration}s</span>
          )},
          { key: "fee", label: "Fee", textAlign: "right" as const, render: moneyRender((c: Cdr) => Number(c.fee || 0), 4) },
          { key: "status", label: "Status", textAlign: "center" as const, render: (c: Cdr) => (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">{c.status||"completed"}</span>
          )},
        ]}
        data={cdrs}
        searchKey="caller"
        loading={loading}
        emptyMessage="No CDR records found in recent partitions"
        emptySubtitle="Records will appear once calls begin flowing through the system"
        pageSize={15}
      />
    </div>
  );
}
