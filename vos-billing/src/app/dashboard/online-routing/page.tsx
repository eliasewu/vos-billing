"use client";
import { useState, useEffect, useCallback } from "react";
import { Wifi, RefreshCw, Server, PhoneCall, WifiOff } from "lucide-react";

interface OnlineGw { name: string; ip: string; status: string; calls: number; }

export default function OnlineRoutingPage() {
  const [gateways, setGateways] = useState<OnlineGw[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vos/gateway-ping");
      const data = await res.json();
      if (data.gateways) setGateways(data.gateways);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Wifi className="w-6 h-6 text-cyan-400" />
            Online Routing Gateway
          </h1>
          <p className="text-surface-400 text-sm mt-1">Real-time status of online routing gateways</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/></span>
            <span className="text-xs font-medium text-emerald-400">LIVE</span>
          </div>
          <button onClick={fetchData} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-brand-400"/></div><div><p className="text-2xl font-bold text-surface-50">{gateways.length}</p><p className="text-xs text-surface-400">Total Gateways</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Wifi className="w-5 h-5 text-emerald-400"/></div><div><p className="text-2xl font-bold text-emerald-400">{gateways.filter(g=>g.status==="online"||g.status==="Online").length}</p><p className="text-xs text-surface-400">Online</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><PhoneCall className="w-5 h-5 text-amber-400"/></div><div><p className="text-2xl font-bold text-surface-50">{gateways.reduce((s,g)=>s+(g.calls||0),0)}</p><p className="text-xs text-surface-400">Active Calls</p></div></div></div>
      </div>

      {loading && gateways.length === 0 ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-8 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-surface-500"/></div>
      ) : gateways.length === 0 ? (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-8 text-center"><WifiOff className="w-12 h-12 text-surface-600 mx-auto mb-4"/><p className="text-surface-500">No routing gateways detected</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gateways.map((g,i) => (
            <div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5 hover:border-surface-600/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-surface-50">{g.name}</h3>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${g.status==="online"||g.status==="Online"?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>
                  {g.status==="online"||g.status==="Online"?<Wifi className="w-3 h-3"/>:<WifiOff className="w-3 h-3"/>}
                  {g.status||"Unknown"}
                </span>
              </div>
              <div className="text-xs text-surface-400">IP: {g.ip||"—"} | Calls: {g.calls||0}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
