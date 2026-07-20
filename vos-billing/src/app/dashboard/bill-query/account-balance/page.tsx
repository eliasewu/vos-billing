"use client";

import { useState, useEffect } from "react";
import { Wallet, Search, RefreshCw, Download, DollarSign, Building2, Shield } from "lucide-react";

interface AccountBal { id: number; name: string; account: string; balance: number; creditLimit: number; available: number; status: number; }

export default function AccountBalancePage() {
  const [accounts, setAccounts] = useState<AccountBal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/accounts");
      const d = await res.json();
      if (d.error) setError(d.error);
      else {
        const accts: any[] = d.accounts || [];
        setAccounts(accts.map((a: any) => ({
          id: a.id,
          name: a.name || a.account || "",
          account: a.account || "",
          balance: Number(a.money || 0),
          creditLimit: Number(a.limitmoney || a.limitMoney || a.creditLimit || 0),
          available: Number(a.limitmoney || a.limitMoney || a.creditLimit || 0) - Number(a.money || 0),
          status: Number(a.status || 0),
        })).sort((a: AccountBal, b: AccountBal) => a.name.localeCompare(b.name)));
      }
    } catch { setError("Failed to load account balances"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const formatMoney = (v: number) => `$${Number(v || 0).toFixed(2)}`;
  const filtered = accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.account.toLowerCase().includes(search.toLowerCase()));
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalCredit = accounts.reduce((s, a) => s + a.creditLimit, 0);
  const activeCount = accounts.filter(a => a.status === 1).length;

  const exportCSV = () => {
    const csv = ["Account,Name,Balance,CreditLimit,Available,Status", ...filtered.map(a => [a.account, a.name, a.balance.toFixed(4), a.creditLimit.toFixed(2), a.available.toFixed(2), a.status === 1 ? "Active" : "Inactive"].join(","))].join("\n");
    const b = new Blob([csv], { type: "text/csv" }); const el = document.createElement("a"); el.href = URL.createObjectURL(b); el.download = "account_balances.csv"; el.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Account Balance</h1><p className="text-surface-400 text-sm mt-1">{accounts.length} accounts | {activeCount} active</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400"><Download className="w-4 h-4" /></button>
          <button onClick={fetchData} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{accounts.length}</p><p className="text-xs text-surface-400">Total Accounts</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-emerald-400">{activeCount}</p><p className="text-xs text-surface-400">Active</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-cyan-400" /></div><div><p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatMoney(totalBalance)}</p><p className="text-xs text-surface-400">Total Balance</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-400" /></div><div><p className="text-2xl font-bold text-amber-400">{formatMoney(totalCredit)}</p><p className="text-xs text-surface-400">Total Credit</p></div></div></div>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by name or account..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-surface-800">
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Account</th>
            <th className="text-left px-4 py-3 text-surface-400 text-xs uppercase">Name</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Balance</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Credit Limit</th>
            <th className="text-right px-4 py-3 text-surface-400 text-xs uppercase">Available</th>
            <th className="text-center px-4 py-3 text-surface-400 text-xs uppercase">Status</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="p-6 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-surface-500" /></td></tr> :
            filtered.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-surface-500"><Wallet className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No accounts found</p></td></tr> :
            filtered.map(a => (
              <tr key={a.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                <td className="px-4 py-3 text-surface-50 font-mono text-xs">{a.account}</td>
                <td className="px-4 py-3 text-surface-50 font-medium text-xs">{a.name}</td>
                <td className={`px-4 py-3 text-right font-mono text-xs ${a.balance < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatMoney(a.balance)}</td>
                <td className="px-4 py-3 text-right text-surface-300 font-mono text-xs">{formatMoney(a.creditLimit)}</td>
                <td className={`px-4 py-3 text-right font-mono text-xs ${a.available < 0 ? "text-red-400" : "text-cyan-400"}`}>{formatMoney(a.available)}</td>
                <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 1 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{a.status === 1 ? "Active" : "Inactive"}</span></td>
              </tr>
            ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
