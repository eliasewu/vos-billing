"use client";

import { useState, useEffect } from "react";
import { Receipt, RefreshCw, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import DataTable from "@/components/DataTable";

interface PaymentRec { id:number; customerAccount:string; customerName:string; payMoney:number; customerMoney:number; time:number; memo:string; payType:number; loginName:string; }

export default function PaymentQueryPage(){
  const [recs,setRecs]=useState<PaymentRec[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const fetchData=async()=>{
    setLoading(true);
    try{
      const r=await window.fetch("/api/vos/payment?mode=history");const d=await r.json();
      if(d.error)setError(d.error);else setRecs(d.history||[]);
    }catch{setError("Failed");}finally{setLoading(false);}
  };

  useEffect(()=>{fetchData();},[]);

  const fmt=(v:number)=>`${v>=0?"+":""}$${Math.abs(v).toFixed(4)}`;
  const fmtTime=(t:number)=>t?new Date(t*1000).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—";

  return(<div className="p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-surface-50">Payment Query</h1></div>
    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Refresh</button></div>

    {error&&<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

    <DataTable
      columns={[
        { key: "customerName", label: "Customer", render: (r: PaymentRec) => <span className="text-surface-50 text-sm">{r.customerName}</span> },
        { key: "payMoney", label: "Amount", textAlign: "right" as const, render: (r: PaymentRec) => (
          <span className={`font-mono text-sm ${r.payMoney>=0?"text-emerald-400":"text-red-400"} inline-flex items-center gap-1`}>
            {r.payMoney>=0?<ArrowUpCircle className="w-3.5 h-3.5"/>:<ArrowDownCircle className="w-3.5 h-3.5"/>}
            {fmt(r.payMoney)}
          </span>
        )},
        { key: "customerMoney", label: "Balance", textAlign: "right" as const, render: (r: PaymentRec) => (
          <span className="font-mono text-sm text-surface-300">${r.customerMoney.toFixed(4)}</span>
        )},
        { key: "time", label: "Time", render: (r: PaymentRec) => <span className="text-surface-400 text-xs">{fmtTime(r.time)}</span> },
        { key: "memo", label: "Memo", render: (r: PaymentRec) => <span className="text-surface-400 text-xs">{r.memo||"—"}</span> },
        { key: "loginName", label: "By", render: (r: PaymentRec) => <span className="text-surface-400 text-xs">{r.loginName||"—"}</span> },
      ]}
      data={recs}
      searchKey="customerName"
      loading={loading}
      emptyIcon={<Receipt className="w-12 h-12 text-surface-600" />}
      emptyMessage="No payment records"
      emptySubtitle="Try adjusting the search to find specific transactions"
      pageSize={20}
    />
  </div>);
}
