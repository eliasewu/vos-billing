"use client";

import { useState, useEffect } from "react";
import { Receipt, Search, RefreshCw, ArrowUpCircle, ArrowDownCircle , Download} from "lucide-react";

interface PaymentRec { id:number; customerAccount:string; customerName:string; payMoney:number; customerMoney:number; time:number; memo:string; payType:number; loginName:string; }

export default function PaymentQueryPage(){
  const [recs,setRecs]=useState<PaymentRec[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [debounced,setDebounced]=useState("");

  useEffect(()=>{const t=setTimeout(()=>setDebounced(search),300);return ()=>clearTimeout(t);},[search]);

  const fetchData=async()=>{
    setLoading(true);
    try{
      const p=new URLSearchParams();if(debounced)p.set("search",debounced);
      const r=await window.fetch(`/api/vos/payment?mode=history&${p}`);const d=await r.json();
      if(d.error)setError(d.error);else setRecs(d.history||[]);
    }catch{setError("Failed");}finally{setLoading(false);}
  };

  useEffect(()=>{fetchData();},[debounced]);

  const fmt=(v:number)=>`${v>=0?"+":""}$${Math.abs(v).toFixed(4)}`;
  const fmtTime=(t:number)=>t?new Date(t*1000).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—";

  return(<div className="p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-surface-50">Payment Query</h1></div>
    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button></div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"/><input placeholder="Search by customer..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50"/></div>
    {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
    <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-surface-800"><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Customer</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Amount</th><th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Balance</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Time</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Memo</th><th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">By</th></tr></thead>
        <tbody>
          {loading?Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-surface-800/50">{Array.from({length:6}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse"/></td>)}</tr>):
          recs.length===0?<tr><td colSpan={6} className="px-4 py-16 text-center text-surface-500"><Receipt className="w-12 h-12 mx-auto mb-3 text-surface-600"/><p>No payment records</p></td></tr>:
          recs.map(r=><tr key={r.id} className="border-b border-surface-800/50 hover:bg-surface-800/30"><td className="px-4 py-3 text-surface-50 text-sm">{r.customerName}</td><td className={`px-4 py-3 text-right font-mono text-sm ${r.payMoney>=0?"text-emerald-400":"text-red-400"}`}><span className="inline-flex items-center gap-1">{r.payMoney>=0?<ArrowUpCircle className="w-3.5 h-3.5"/>:<ArrowDownCircle className="w-3.5 h-3.5"/>}{fmt(r.payMoney)}</span></td><td className="px-4 py-3 text-right font-mono text-sm text-surface-300">${r.customerMoney.toFixed(4)}</td><td className="px-4 py-3 text-surface-400 text-xs">{fmtTime(r.time)}</td><td className="px-4 py-3 text-surface-400 text-xs">{r.memo||"—"}</td><td className="px-4 py-3 text-surface-400 text-xs">{r.loginName||"—"}</td></tr>)}
        </tbody>
      </table>
    </div>
  </div>);
}
