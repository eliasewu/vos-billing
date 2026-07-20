"use client";
import { useState, useEffect } from "react";
import { Server, Search, RefreshCw, Wifi, WifiOff, Building2, Download } from "lucide-react";

interface Gateway { id: number; name: string; remoteips: string; prefix: string; capacity: number; signalport: number; locktype: number; clearingCustomerId: number; customerName: string; }

export default function GatewayDetailPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [gwRes, custRes] = await Promise.all([
        fetch("/api/vos/gateways?type=routing"),
        fetch("/api/vos/customers"),
      ]);
      const gwData = await gwRes.json();
      const custData = await custRes.json();
      const customers: Record<string, any>[] = custData.customers || [];
      const custMap = new Map(customers.map((c: any) => [Number(c.id), String(c.customer_name || c.name || "")]));

      setGateways((gwData.gateways || []).map((g: any) => ({
        id: Number(g.id),
        name: String(g.gateway_name || g.name || ""),
        remoteips: String(g.remoteips || g.ip_addr || ""),
        prefix: String(g.prefix || ""),
        capacity: Number(g.capacity || g.max_calls || 0),
        signalport: Number(g.signalport || g.port || 5060),
        locktype: Number(g.locktype) ?? 0,
        clearingCustomerId: Number(g.customer_id || g.clearingCustomerId || 0),
        customerName: custMap.get(Number(g.customer_id || g.clearingCustomerId || 0)) || "",
      })));
    } catch { setError("Failed to load gateways"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = gateways.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.customerName.toLowerCase().includes(search.toLowerCase()) ||
    g.remoteips.includes(search)
  );

  const activeCount = filtered.filter(g => Number(g.locktype) === 0).length;

  const exportCSV = () => {
    const h = ["ID","Name","Customer","IP","Port","Prefix","Capacity","Status"];
    const csv = [h.join(","), ...filtered.map(g => [g.id,g.name,g.customerName,g.remoteips,g.signalport,g.prefix,g.capacity,Number(g.locktype)===0?"Active":"Locked"].join(","))].join("\n");
    const b = new Blob([csv],{type:"text/csv"}); const a = document.createElement("a"); a.href=URL.createObjectURL(b); a.download="clearing_gateways.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Gateway Detail</h1><p className="text-surface-400 text-sm mt-1">{gateways.length} clearing gateways</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4" /></button>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.length}</p><p className="text-xs text-surface-400">Total Gateways</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Wifi className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-emerald-400">{activeCount}</p><p className="text-xs text-surface-400">Active</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{new Set(gateways.map(g=>g.clearingCustomerId)).size}</p><p className="text-xs text-surface-400">Customers</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-amber-400" /></div><div><p className="text-2xl font-bold text-surface-50">{gateways.reduce((s,g)=>s+g.capacity,0)}</p><p className="text-xs text-surface-400">Total Capacity</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by name, IP, or customer..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Name</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Customer</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">IP:Port</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Prefix</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Capacity</th>
            <th className="text-center px-4 py-3 text-surface-400 text-xs uppercase">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-surface-800/50">
            {loading ? <tr><td colSpan={6} className="p-6 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-surface-500" /></td></tr> :
              filtered.length===0 ? <tr><td colSpan={6} className="p-12 text-center text-surface-500"><Server className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No gateways found</p></td></tr> :
              filtered.map(g => (
                <tr key={g.id} className="hover:bg-surface-800/30">
                  <td className="px-4 py-3 text-surface-50 font-medium text-xs">
                    <div className="flex items-center gap-1.5">{Number(g.locktype)===0?<Wifi className="w-3 h-3 text-emerald-400"/>:<WifiOff className="w-3 h-3 text-red-400"/>}{g.name}</div>
                  </td>
                  <td className="px-4 py-3 text-surface-300 text-xs">{g.customerName||"—"}</td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-xs">{g.remoteips}:{g.signalport}</td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-xs">{g.prefix||"—"}</td>
                  <td className="px-4 py-3 text-right text-surface-300 text-xs">{g.capacity}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${Number(g.locktype)===0?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>
                      {Number(g.locktype)===0?"Active":"Locked"}
                    </span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
