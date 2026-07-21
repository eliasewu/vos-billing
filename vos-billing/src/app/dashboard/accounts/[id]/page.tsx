"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Wallet, PhoneCall, Wifi, FileText, Mail, MapPin,
  CreditCard, RefreshCw, Clock, Phone, History, BarChart3, TrendingUp,
  DollarSign, Loader2, Users, Shield, Server, Activity, X,
} from "lucide-react";

interface Gateway { id: number; name: string; ips: string; capacity: number; active: boolean; }
interface Phone { id: number; e164: string; password: string; capacity: number; status: number; }
interface CDR {
  flowno: number; caller: string; callee: string;
  starttime: number; stoptime: number; feetime: number;
  fee: number; tax: number; customeraccount: string; customername: string;
  endreason: number; enddirection: number;
  callergatewayid: number; calleegatewayid: number;
}
interface Payment { id: number; amount: number; memo: string; time: number; }
interface AccountDetail {
  id: number; account: string; name: string; money: number; limitmoney: number;
  type: number; status: number; starttime: number; lastupdatetime: number;
  feerateGroupId: number; feerateGroupName: string | null; privateRateName: string | null;
  feerateGroup2Name: string | null; feerateGroup3Name: string | null;
  email: string; phone: string; company: string; address: string;
  bankAccount: string; cc: string; bcc: string;
  mappingGateways: Gateway[]; routingGateways: Gateway[];
  phones: Phone[]; cdrs: CDR[]; cdrTotal: number;
  payments: Payment[];
  todayCalls: number; todayFee: number; weekCalls: number; weekFee: number;
}

const TYPE_LABELS: Record<number, string> = { 0: "General", 1: "Clearing", 2: "Agent", 3: "Phone Card" };
const STATUS_LABELS: Record<number, string> = { 0: "Inactive", 1: "Active", 2: "Locked" };
const END_REASONS: Record<number, string> = {
  1: "Normal", 2: "Busy", 3: "No Answer", 4: "Cancel", 5: "Rejected",
  6: "Forbidden", 7: "Unreachable", 8: "Timeout", 9: "Unknown", 10: "Server Error",
};

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const fetchAccount = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/vos/accounts/${id}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setAccount(data.account);
    } catch { setError("Failed to load account"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (id) fetchAccount(); }, [id]);

  const formatMoney = (v: number) => {
    const abs = Math.abs(v);
    return v < 0 ? `-$${abs.toFixed(4)}` : `$${abs.toFixed(4)}`;
  };
  const formatTime = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="p-6">
        <button onClick={() => router.push("/dashboard/accounts/general")} className="flex items-center gap-2 text-surface-400 hover:text-surface-50 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Accounts
        </button>
        <div className="p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-surface-600" />
          <p className="text-surface-400">{error || "Account not found"}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "cdr", label: `CDR History (${account.cdrTotal})`, icon: History },
    { id: "gateways", label: `Gateways (${account.mappingGateways.length + account.routingGateways.length})`, icon: Wifi },
    { id: "payments", label: `Payments (${account.payments.length})`, icon: DollarSign },
    { id: "phones", label: `Phones (${account.phones.length})`, icon: Phone },
    { id: "contact", label: "Contact", icon: Mail },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/dashboard/accounts/general")} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-50">{account.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              account.status === 1 ? "bg-emerald-500/10 text-emerald-400" :
              account.status === 2 ? "bg-red-500/10 text-red-400" : "bg-surface-800 text-surface-500"
            }`}>{STATUS_LABELS[account.status]}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              account.type === 1 ? "bg-amber-500/10 text-amber-400" :
              account.type === 2 ? "bg-violet-500/10 text-violet-400" :
              account.type === 3 ? "bg-cyan-500/10 text-cyan-400" :
              "bg-blue-500/10 text-blue-400"
            }`}>{TYPE_LABELS[account.type]}</span>
          </div>
          <p className="text-surface-400 text-sm mt-1">Account ID: <span className="font-mono text-surface-300">{account.account}</span> • Created {formatTime(account.starttime)} • Last updated {formatTime(account.lastupdatetime)}</p>
        </div>
        <button onClick={fetchAccount} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 hover:bg-surface-700 transition-colors text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-surface-500">Balance</span>
          </div>
          <p className={`text-lg font-bold font-mono ${account.money < 0 ? "text-red-400" : "text-emerald-400"}`}>
            {formatMoney(account.money)}
          </p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-surface-500">Overdraft</span>
          </div>
          <p className="text-lg font-bold font-mono text-surface-50">
            ${account.limitmoney.toFixed(2)}
          </p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-surface-500">Today Calls</span>
          </div>
          <p className="text-lg font-bold font-mono text-surface-50">{account.todayCalls}</p>
          <p className="text-xs text-surface-500">{formatMoney(account.todayFee)} today</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-surface-500">Week Calls</span>
          </div>
          <p className="text-lg font-bold font-mono text-surface-50">{account.weekCalls}</p>
          <p className="text-xs text-surface-500">{formatMoney(account.weekFee)} / week</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-surface-500">Gateways</span>
          </div>
          <p className="text-lg font-bold font-mono text-surface-50">
            {account.mappingGateways.length + account.routingGateways.length}
          </p>
          <p className="text-xs text-surface-500">{account.mappingGateways.length} map · {account.routingGateways.length} route</p>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-surface-500">Phones</span>
          </div>
          <p className="text-lg font-bold font-mono text-surface-50">{account.phones.length}</p>
          <p className="text-xs text-surface-500">extensions</p>
        </div>
      </div>

      {/* Rate Group & Billing Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-brand-400" /></div>
          <div>
            <p className="text-xs text-surface-500">Billing Rate Group</p>
            <p className="text-sm font-medium text-surface-50">{account.feerateGroupName || "—"}</p>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-amber-400" /></div>
          <div>
            <p className="text-xs text-surface-500">Private Rate</p>
            <p className="text-sm font-medium text-surface-50">{account.privateRateName || "—"}</p>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Clock className="w-5 h-5 text-emerald-400" /></div>
          <div>
            <p className="text-xs text-surface-500">Account Since</p>
            <p className="text-sm font-medium text-surface-50">{account.starttime ? new Date(account.starttime * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="flex border-b border-surface-800 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-brand-400 border-b-2 border-brand-400 bg-brand-500/5"
                  : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent CDRs preview */}
                <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2"><History className="w-4 h-4 text-brand-400" />Recent CDRs</h3>
                    <button onClick={() => setActiveTab("cdr")} className="text-xs text-brand-400 hover:text-brand-300">View all →</button>
                  </div>
                  {account.cdrs.length === 0 ? (
                    <p className="text-surface-500 text-sm text-center py-4">No CDRs found</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {account.cdrs.slice(0, 8).map((c, i) => (
                        <div key={i} className="flex items-center justify-between bg-surface-900/50 rounded-lg p-2.5 text-xs">
                          <div>
                            <p className="text-surface-300 font-mono">{c.caller}</p>
                            <p className="text-surface-500 font-mono text-[11px]">→ {c.callee}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-surface-300">{formatDuration(c.feetime)}</p>
                            <p className="text-brand-400 font-mono">${Number(c.fee).toFixed(4)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments preview */}
                <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" />Recent Payments</h3>
                    <button onClick={() => setActiveTab("payments")} className="text-xs text-brand-400 hover:text-brand-300">View all →</button>
                  </div>
                  {account.payments.length === 0 ? (
                    <p className="text-surface-500 text-sm text-center py-4">No payments recorded</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {account.payments.slice(0, 8).map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-surface-900/50 rounded-lg p-2.5 text-xs">
                          <div>
                            <p className="text-surface-300">{p.memo || `Payment #${p.id}`}</p>
                            <p className="text-surface-500 text-[11px]">{formatTime(p.time)}</p>
                          </div>
                          <p className={`font-mono font-medium ${p.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {p.amount >= 0 ? "+" : ""}{formatMoney(p.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Gateways & Phones summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2"><Server className="w-4 h-4 text-violet-400" />Gateways</h3>
                    <button onClick={() => setActiveTab("gateways")} className="text-xs text-brand-400 hover:text-brand-300">View all →</button>
                  </div>
                  {[...account.mappingGateways, ...account.routingGateways].length === 0 ? (
                    <p className="text-surface-500 text-sm text-center py-4">No gateways assigned</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {account.mappingGateways.map((g: Gateway) => (
                        <div key={`m-${g.id}`} className="flex items-center justify-between bg-surface-900/50 rounded-lg p-2.5 text-xs">
                          <div>
                            <p className="text-surface-300">{g.name}</p>
                            <p className="text-surface-500 text-[11px]">{g.ips?.split(",")[0] || "—"} · {g.capacity} ch</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400">Mapping</span>
                        </div>
                      ))}
                      {account.routingGateways.map((g: Gateway) => (
                        <div key={`r-${g.id}`} className="flex items-center justify-between bg-surface-900/50 rounded-lg p-2.5 text-xs">
                          <div>
                            <p className="text-surface-300">{g.name}</p>
                            <p className="text-surface-500 text-[11px]">{g.ips?.split(",")[0] || "—"} · {g.capacity} ch</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400">Routing</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-400" />Phones</h3>
                    <button onClick={() => setActiveTab("phones")} className="text-xs text-brand-400 hover:text-brand-300">View all →</button>
                  </div>
                  {account.phones.length === 0 ? (
                    <p className="text-surface-500 text-sm text-center py-4">No phones registered</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {account.phones.slice(0, 6).map((p: Phone) => (
                        <div key={p.id} className="flex items-center justify-between bg-surface-900/50 rounded-lg p-2.5 text-xs">
                          <div>
                            <p className="text-surface-300 font-mono">{p.e164}</p>
                            <p className="text-surface-500 text-[11px]">Pass: {p.password} · {p.capacity} ch</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${p.status === 1 ? "bg-emerald-500/10 text-emerald-400" : "bg-surface-700 text-surface-500"}`}>
                            {p.status === 1 ? "Active" : "Inactive"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CDR Tab */}
          {activeTab === "cdr" && (
            <div>
              {account.cdrs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-10 h-10 mx-auto mb-2 text-surface-600" />
                  <p className="text-surface-500">No CDR records found for this account</p>
                  <p className="text-surface-600 text-xs mt-1">CDRs are stored in daily partitions (e_cdr_YYYYMMDD)</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Caller</th>
                        <th className="text-left px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Callee</th>
                        <th className="text-left px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Start Time</th>
                        <th className="text-right px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Duration</th>
                        <th className="text-right px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Fee</th>
                        <th className="text-center px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">End Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.cdrs.map((c, i) => (
                        <tr key={i} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                          <td className="px-3 py-2.5 text-surface-300 font-mono text-xs">{c.caller || "—"}</td>
                          <td className="px-3 py-2.5 text-surface-300 font-mono text-xs">{c.callee || "—"}</td>
                          <td className="px-3 py-2.5 text-surface-400 text-xs">{formatTime(c.starttime)}</td>
                          <td className="px-3 py-2.5 text-right text-surface-300 font-mono text-xs">{formatDuration(c.feetime)}</td>
                          <td className="px-3 py-2.5 text-right text-brand-400 font-mono text-xs">${Number(c.fee).toFixed(4)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              c.endreason === 1 ? "bg-emerald-500/10 text-emerald-400" : "bg-surface-800 text-surface-500"
                            }`}>{END_REASONS[c.endreason] || `Code ${c.endreason}`}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Gateways Tab */}
          {activeTab === "gateways" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-surface-50 mb-3 flex items-center gap-2"><Server className="w-4 h-4 text-blue-400" />Mapping Gateways <span className="text-xs text-surface-500 font-normal">(Inbound / Customer)</span></h3>
                {account.mappingGateways.length === 0 ? (
                  <p className="text-surface-500 text-sm">No mapping gateways</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {account.mappingGateways.map((g: Gateway) => (
                      <div key={g.id} className="bg-surface-800/50 border border-surface-700/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${g.active ? "bg-emerald-400" : "bg-surface-600"}`} />
                          <span className="text-sm font-medium text-surface-50">{g.name}</span>
                        </div>
                        <p className="text-xs text-surface-500 font-mono">{g.ips?.split(",")[0] || "—"}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-surface-400">{g.capacity} channels</span>
                          <span className={`text-xs ${g.active ? "text-emerald-400" : "text-surface-600"}`}>{g.active ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-50 mb-3 flex items-center gap-2"><Server className="w-4 h-4 text-amber-400" />Routing Gateways <span className="text-xs text-surface-500 font-normal">(Outbound / Supplier)</span></h3>
                {account.routingGateways.length === 0 ? (
                  <p className="text-surface-500 text-sm">No routing gateways</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {account.routingGateways.map((g: Gateway) => (
                      <div key={g.id} className="bg-surface-800/50 border border-surface-700/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${g.active ? "bg-emerald-400" : "bg-surface-600"}`} />
                          <span className="text-sm font-medium text-surface-50">{g.name}</span>
                        </div>
                        <p className="text-xs text-surface-500 font-mono">{g.ips?.split(",")[0] || "—"}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-surface-400">{g.capacity} channels</span>
                          <span className={`text-xs ${g.active ? "text-emerald-400" : "text-surface-600"}`}>{g.active ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div>
              {account.payments.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 text-surface-600" />
                  <p className="text-surface-500">No payment history</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">#</th>
                        <th className="text-left px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Date</th>
                        <th className="text-right px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Amount</th>
                        <th className="text-left px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Memo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.payments.map((p, i) => (
                        <tr key={p.id || i} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                          <td className="px-3 py-2.5 text-surface-500 text-xs">{p.id}</td>
                          <td className="px-3 py-2.5 text-surface-300 text-xs">{formatTime(p.time)}</td>
                          <td className={`px-3 py-2.5 text-right font-mono text-xs font-medium ${p.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {p.amount >= 0 ? "+" : ""}{formatMoney(p.amount)}
                          </td>
                          <td className="px-3 py-2.5 text-surface-400 text-xs">{p.memo || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Phones Tab */}
          {activeTab === "phones" && (
            <div>
              {account.phones.length === 0 ? (
                <div className="text-center py-12">
                  <Phone className="w-10 h-10 mx-auto mb-2 text-surface-600" />
                  <p className="text-surface-500">No phones registered for this account</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">#</th>
                        <th className="text-left px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">E164 Number</th>
                        <th className="text-left px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Password</th>
                        <th className="text-center px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Capacity</th>
                        <th className="text-center px-3 py-2.5 text-surface-400 font-medium text-xs uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.phones.map((p: Phone) => (
                        <tr key={p.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                          <td className="px-3 py-2.5 text-surface-500 text-xs">{p.id}</td>
                          <td className="px-3 py-2.5 text-surface-300 font-mono text-xs">{p.e164}</td>
                          <td className="px-3 py-2.5 text-surface-400 font-mono text-xs">{p.password}</td>
                          <td className="px-3 py-2.5 text-center text-surface-300 text-xs">{p.capacity}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.status === 1 ? "bg-emerald-500/10 text-emerald-400" : "bg-surface-800 text-surface-500"}`}>
                              {p.status === 1 ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              {[
                { icon: Building2, label: "Company", value: account.company, color: "text-blue-400" },
                { icon: Mail, label: "Email", value: account.email, color: "text-brand-400" },
                { icon: PhoneCall, label: "Phone", value: account.phone, color: "text-emerald-400" },
                { icon: MapPin, label: "Address", value: account.address, color: "text-amber-400" },
                { icon: CreditCard, label: "Bank Account", value: account.bankAccount, color: "text-violet-400" },
                { icon: Mail, label: "CC Email", value: account.cc, color: "text-cyan-400" },
                { icon: Mail, label: "BCC Email", value: account.bcc, color: "text-pink-400" },
              ].map(item => (
                <div key={item.label} className="bg-surface-800/50 border border-surface-700/30 rounded-xl p-4 flex items-start gap-3">
                  <item.icon className={`w-5 h-5 ${item.color} mt-0.5 shrink-0`} />
                  <div>
                    <p className="text-xs text-surface-500 mb-0.5">{item.label}</p>
                    <p className="text-sm text-surface-200">{item.value || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
