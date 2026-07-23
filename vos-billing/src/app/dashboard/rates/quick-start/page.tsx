"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Users, Building2, Wifi, KeyRound, DollarSign, Globe, ArrowLeft, ArrowRight,
  Check, Loader2, Send, FileText, Settings2, PhoneCall, Server, MapPin, Search,
} from "lucide-react";

const CLIENT_STEPS = ["Account", "Rate", "Gateway"];
const SUPPLIER_STEPS = ["Account", "Rate", "Gateway", "Dial Plan"];

// Reusable form field components (module-level, not recreated on renders)
const textField = (label: string, value: string, onChange: (v: string) => void, opts?: { type?: string; placeholder?: string; required?: boolean }) => (
  <div>
    <label className="block text-xs font-medium text-surface-400 mb-1">
      {label} {opts?.required !== false ? "*" : ""}
    </label>
    <input
      type={opts?.type || "text"}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={opts?.placeholder}
      className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 placeholder:text-surface-600"
    />
  </div>
);

const numField = (label: string, value: number, onChange: (v: number) => void, opts?: { step?: string; placeholder?: string }) => (
  <div>
    <label className="block text-xs font-medium text-surface-400 mb-1">{label}</label>
    <input
      type="number"
      step={opts?.step || "0.01"}
      value={value || ""}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      placeholder={opts?.placeholder}
      className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 placeholder:text-surface-600"
    />
  </div>
);

export default function QuickStartWizardPage() {
  const router = useRouter();

  // Mode
  const [mode, setMode] = useState<"client" | "supplier">("client");

  // Steps
  const [step, setStep] = useState(0);
  const steps = mode === "client" ? CLIENT_STEPS : SUPPLIER_STEPS;

  // Account form
  const [acct, setAcct] = useState({
    accountName: "", account: "", password: "", company: "", email: "",
    phone: "", address: "", money: 0, limitMoney: 0,
  });

  // Rate form
  const [rate, setRate] = useState({
    rateGroupName: "", prefix: "", areacode: "", fee: 0.01, tax: 0, period: 60, fakeMinute: 60,
  });

  // Gateway form
  const [gw, setGw] = useState({
    gatewayName: "", gatewayIp: "", gatewayPort: 5060, gatewayCapacity: 30,
    gatewayPassword: "", cdrUsername: "", cdrPassword: "",
  });

  // Supplier-only: dial plan
  const [dial, setDial] = useState({
    allowedPrefix: "", rewriteCallee: "", rewriteCaller: "", protocol: 0,
  });

  // Areacode lookup for auto-fill
  const [areacodes, setAreacodes] = useState<{ areacode: string; location: string }[]>([]);
  const [autoFillInfo, setAutoFillInfo] = useState<{ areacode: string; location: string } | null>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load areacodes on mount
  useEffect(() => {
    fetch("/api/vos/areacodes")
      .then(r => r.json())
      .then(d => setAreacodes(d.areacodes || []))
      .catch(() => {});
  }, []);

  // Lookup best matching areacode for a prefix (returns null if no match)
  const lookupAreacode = useCallback((prefix: string): { areacode: string; location: string } | null => {
    if (!prefix || !areacodes.length) return null;
    const trimmed = prefix.trim();
    if (!trimmed) return null;
    // Find entries whose areacode starts with the typed prefix
    const matches = areacodes.filter(a => a.areacode.startsWith(trimmed));
    if (!matches.length) return null;
    // Pick the shortest match (most relevant: country-level for short prefixes, operator-level for longer)
    matches.sort((a, b) => a.areacode.length - b.areacode.length);
    return matches[0];
  }, [areacodes]);

  // Handle prefix change with debounced lookup
  const handlePrefixChange = (value: string) => {
    setRate(prev => ({ ...prev, prefix: value }));
    if (lookupTimer.current) clearTimeout(lookupTimer.current);

    // Clear state immediately when prefix is emptied
    if (!value.trim()) {
      setRate(prev => ({ ...prev, areacode: "" }));
      setAutoFillInfo(null);
      return;
    }

    lookupTimer.current = setTimeout(() => {
      const match = lookupAreacode(value);
      if (match) {
        setRate(prev => ({
          ...prev,
          areacode: match.areacode,
          rateGroupName: prev.rateGroupName.trim() ? prev.rateGroupName : match.location + " Rates",
        }));
        setAutoFillInfo(match);
      } else {
        setAutoFillInfo(null);
      }
    }, 300);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (lookupTimer.current) clearTimeout(lookupTimer.current); };
  }, []);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const canNext = (() => {
    if (step === 0) return acct.accountName.trim() !== "" && acct.account.trim() !== "";
    if (step === 1) return rate.rateGroupName.trim() !== "" && rate.fee > 0;
    if (step === 2) return gw.gatewayName.trim() !== "" && gw.gatewayIp.trim() !== "";
    if (step === 3) return true; // dial plan is optional
    return true;
  })();

  const handleSubmit = async () => {
    setSubmitting(true); setError("");

    try {
      const res = await fetch("/api/vos/quick-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          // Account
          accountName: acct.accountName, account: acct.account, password: acct.password,
          company: acct.company, email: acct.email, phone: acct.phone, address: acct.address,
          money: acct.money, limitMoney: acct.limitMoney,
          // Rate
          rateGroupName: rate.rateGroupName, prefix: rate.prefix, areacode: rate.areacode,
          fee: rate.fee, tax: rate.tax, period: rate.period, fakeMinute: rate.fakeMinute,
          // Gateway
          gatewayName: gw.gatewayName, gatewayIp: gw.gatewayIp, gatewayPort: gw.gatewayPort,
          gatewayCapacity: gw.gatewayCapacity, gatewayPassword: gw.gatewayPassword,
          cdrUsername: gw.cdrUsername, cdrPassword: gw.cdrPassword,
          // Supplier only
          ...(mode === "supplier" ? {
            allowedPrefix: dial.allowedPrefix,
            rewriteCallee: dial.rewriteCallee,
            rewriteCaller: dial.rewriteCaller,
            protocol: dial.protocol,
          } : {}),
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error + (data.detail ? `: ${data.detail}` : "")); return; }
      setResult(data);
    } catch { setError("Failed to submit"); }
    finally { setSubmitting(false); }
  };

  const reset = () => {
    setStep(0); setResult(null); setError(""); setAutoFillInfo(null);
    setAcct({ accountName: "", account: "", password: "", company: "", email: "", phone: "", address: "", money: 0, limitMoney: 0 });
    setRate({ rateGroupName: "", prefix: "", areacode: "", fee: 0.01, tax: 0, period: 60, fakeMinute: 60 });
    setGw({ gatewayName: "", gatewayIp: "", gatewayPort: 5060, gatewayCapacity: 30, gatewayPassword: "", cdrUsername: "", cdrPassword: "" });
    setDial({ allowedPrefix: "", rewriteCallee: "", rewriteCaller: "", protocol: 0 });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/dashboard/rates")} className="p-1.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" /> Quick Start Wizard
          </h1>
          <p className="text-surface-400 text-sm mt-1">Complete client or supplier setup in one flow</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-surface-900 border border-surface-700/50 rounded-xl p-1.5">
        <button
          onClick={() => { setMode("client"); setStep(0); setResult(null); setError(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
            mode === "client" ? "bg-blue-600 text-white shadow-sm" : "text-surface-400 hover:text-surface-200"
          }`}
        >
          <Users className="w-4 h-4" /> Client Setup
        </button>
        <button
          onClick={() => { setMode("supplier"); setStep(0); setResult(null); setError(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
            mode === "supplier" ? "bg-amber-600 text-white shadow-sm" : "text-surface-400 hover:text-surface-200"
          }`}
        >
          <Building2 className="w-4 h-4" /> Supplier Setup
        </button>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-1 bg-surface-900 border border-surface-700/50 rounded-xl p-1.5">
        {steps.map((label, i) => (
          <div key={label} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
            i === step ? "bg-brand-600 text-white shadow-sm" : i < step ? "text-emerald-400" : "text-surface-500"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              i < step ? "bg-emerald-500/20 text-emerald-400" : i === step ? "bg-white/20 text-white" : "bg-surface-800 text-surface-500"
            }`}>
              {i < step ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* ─── Success Result ─── */}
      {result && (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-surface-50">Setup Complete!</h3>
          <div className="bg-surface-800/50 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-400" />
              <span className="text-surface-400">Account:</span>
              <span className="text-surface-50 font-mono">{result.created.account.account}</span>
              <span className="text-surface-50">({result.created.account.name})</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-surface-400">Rate Group:</span>
              <span className="text-surface-50">{result.created.rateGroup.name}</span>
              {result.created.rate && (
                <span className="text-surface-500 text-xs">· {result.created.rate.prefix} @ ${result.created.rate.fee}/min</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-violet-400" />
              <span className="text-surface-400">Gateway:</span>
              <span className="text-surface-50">{result.created.gateway.name}</span>
              <span className="text-surface-500 text-xs">· {result.created.gateway.type}</span>
            </div>
            {result.created.cdrAuth && (
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span className="text-surface-400">CDR Auth:</span>
                <span className="text-surface-50 font-mono">{result.created.cdrAuth.username}</span>
              </div>
            )}
          </div>
          <p className="text-surface-400 text-sm">{result.message}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={reset} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">
              New Setup
            </button>
            <button onClick={() => router.push("/dashboard/accounts/general")} className="px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">
              View Accounts
            </button>
            <button onClick={() => router.push(`/dashboard/accounts/${result.created.account.id}`)} className="px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">
              Account Detail
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 1: Account Info ─── */}
      {!result && step === 0 && (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-surface-50 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" />
            {mode === "client" ? "Client Account" : "Supplier Account"}
          </h2>
          <p className="text-surface-400 text-sm">
            {mode === "client"
              ? "Create a general customer account for billing. This is your client/end-user."
              : "Create a clearing/supplier account. This is your upstream carrier."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {textField("Account Name", acct.accountName, v => setAcct({...acct, accountName: v}), { placeholder: "e.g. Acme Corp" })}
            {textField("Account ID", acct.account, v => setAcct({...acct, account: v}), { placeholder: "e.g. acme001" })}
            {textField("Password", acct.password, v => setAcct({...acct, password: v}), { type: "password", placeholder: "Account password", required: false })}
            {textField("Company", acct.company, v => setAcct({...acct, company: v}), { placeholder: "Company name", required: false })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {textField("Email", acct.email, v => setAcct({...acct, email: v}), { type: "email", placeholder: "alerts@example.com", required: false })}
            {textField("Phone", acct.phone, v => setAcct({...acct, phone: v}), { placeholder: "+1-555-...", required: false })}
          </div>
          {textField("Address", acct.address, v => setAcct({...acct, address: v}), { placeholder: "Street, City, Country", required: false })}
          <div className="grid grid-cols-2 gap-3">
            {numField("Initial Balance ($)", acct.money, v => setAcct({...acct, money: v}), { step: "0.01" })}
            {numField("Credit Limit ($)", acct.limitMoney, v => setAcct({...acct, limitMoney: v}), { step: "0.01" })}
          </div>
        </div>
      )}

      {/* ─── Step 2: Rate Setup ─── */}
      {!result && step === 1 && (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-surface-50 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" /> Rate Setup
          </h2>
          <p className="text-surface-400 text-sm">
            Create a rate group and add a rate entry. You can add more rates later in Rate Management.
          </p>

          {textField("Rate Group Name", rate.rateGroupName, v => setRate({...rate, rateGroupName: v}), { placeholder: `e.g. ${acct.accountName || "My"} Rates` })}

          <div className="grid grid-cols-2 gap-3">
            {/* Prefix with auto-lookup */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">Prefix</label>
              <div className="relative">
                <input
                  type="text"
                  value={rate.prefix}
                  onChange={e => handlePrefixChange(e.target.value)}
                  placeholder="e.g. 91 or 9198"
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 placeholder:text-surface-600"
                />
                {autoFillInfo && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Search className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium">Match</span>
                  </div>
                )}
              </div>
              {autoFillInfo && (
                <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {autoFillInfo.areacode} → {autoFillInfo.location}
                </p>
              )}
            </div>
            {/* Area Code with auto-fill indicator */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">Area Code</label>
              <input
                type="text"
                value={rate.areacode}
                onChange={e => setRate({...rate, areacode: e.target.value})}
                placeholder="e.g. 91 (India)"
                className={`w-full px-3 py-2 bg-surface-800 border rounded-lg text-sm focus:outline-none focus:border-brand-500/50 placeholder:text-surface-600 ${
                  autoFillInfo ? "border-emerald-500/30 text-emerald-400" : "border-surface-700/50 text-surface-50"
                }`}
              />
              {autoFillInfo && (
                <p className="text-[10px] text-emerald-500 mt-0.5">Auto-filled from prefix</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {numField("Rate ($/min)", rate.fee, v => setRate({...rate, fee: v}), { step: "0.000001" })}
            {numField("Tax (0-1)", rate.tax, v => setRate({...rate, tax: v}), { step: "0.01" })}
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Billing Cycle & Increment</label>
            <div className="flex gap-1.5 flex-wrap">
              {[[1,1,"1/1"],[6,6,"6/6"],[30,1,"30/1"],[60,1,"60/1"],[60,60,"60/60"]].map(([p,i,label]) => (
                <button key={label} type="button" onClick={() => setRate({...rate, period: Number(p), fakeMinute: Number(i)})}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    rate.period === p && rate.fakeMinute === i
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-surface-800 text-surface-500 border border-surface-700 hover:border-surface-600"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 3: Gateway ─── */}
      {!result && step === 2 && (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-surface-50 flex items-center gap-2">
            <Server className="w-5 h-5 text-violet-400" />
            {mode === "client" ? "Mapping Gateway" : "Routing Gateway"}
          </h2>
          <p className="text-surface-400 text-sm">
            {mode === "client"
              ? "Create a mapping gateway so the client can send SIP traffic to you. The username/password will be used for CDR auth."
              : "Create a routing gateway to send outbound traffic to the supplier."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {textField("Gateway Name", gw.gatewayName, v => setGw({...gw, gatewayName: v}), { placeholder: `e.g. ${acct.accountName || "My"}_GW` })}
            {textField("IP Address", gw.gatewayIp, v => setGw({...gw, gatewayIp: v}), { placeholder: "e.g. 203.0.113.5" })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {numField("Port", gw.gatewayPort, v => setGw({...gw, gatewayPort: v}), { step: "1" })}
            {numField("Capacity", gw.gatewayCapacity, v => setGw({...gw, gatewayCapacity: v}), { step: "1" })}
            {textField("SIP Password", gw.gatewayPassword, v => setGw({...gw, gatewayPassword: v}), { placeholder: "Auto if empty", required: false })}
          </div>

          {/* Client-specific: CDR auth */}
          {mode === "client" && (
            <>
              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2 mb-3">
                  <KeyRound className="w-4 h-4 text-blue-400" /> CDR Authentication
                </h3>
                <p className="text-surface-400 text-xs mb-3">
                  These credentials allow the client to view their own CDRs via the customer portal.
                  Uses the same SIP credentials by default.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {textField("CDR Username", gw.cdrUsername, v => setGw({...gw, cdrUsername: v}), { placeholder: "Default: gateway name" })}
                  {textField("CDR Password", gw.cdrPassword, v => setGw({...gw, cdrPassword: v}), { type: "password", placeholder: "Default: same as SIP password" })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Step 4: Supplier Dial Plan ─── */}
      {!result && step === 3 && mode === "supplier" && (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-surface-50 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-amber-400" /> Dial Plan & Routing
          </h2>
          <p className="text-surface-400 text-sm">
            Configure allowed prefixes and dial plan rewrite rules for the supplier route.
          </p>

          {textField("Allowed Prefixes", dial.allowedPrefix, v => setDial({...dial, allowedPrefix: v}), {
            placeholder: "e.g. 1,44,91,880 — comma-separated country codes",
            required: false,
          })}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">Protocol</label>
              <select
                value={dial.protocol}
                onChange={e => setDial({...dial, protocol: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none"
              >
                <option value={0}>SIP</option>
                <option value={1}>H.323</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 space-y-4">
            <h3 className="text-sm font-semibold text-surface-50 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-400" /> Dial Plan Rewrite Rules
            </h3>

            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">
                Rewrite Callee (Called Number)
              </label>
              <input
                type="text"
                value={dial.rewriteCallee}
                onChange={e => setDial({...dial, rewriteCallee: e.target.value})}
                placeholder="e.g. ^0(.*) → $1 (strip leading 0)"
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono focus:outline-none focus:border-amber-500/50 placeholder:text-surface-600"
              />
              <p className="text-surface-500 text-[10px] mt-1">
                VOS3000 format: ^pattern##replacement. Leave empty for no rewrite.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">
                Rewrite Caller (Calling Number)
              </label>
              <input
                type="text"
                value={dial.rewriteCaller}
                onChange={e => setDial({...dial, rewriteCaller: e.target.value})}
                placeholder="e.g. ^(.{4})(.*) → $2 (strip first 4 digits)"
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono focus:outline-none focus:border-amber-500/50 placeholder:text-surface-600"
              />
              <p className="text-surface-500 text-[10px] mt-1">
                VOS3000 format: ^pattern##replacement. Leave empty for no rewrite.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Navigation ─── */}
      {!result && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-30"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Creating..." : `Create ${mode === "client" ? "Client" : "Supplier"}`}
            </button>
          )}
        </div>
      )}

      {/* Wizard Summary Sidebar */}
      {!result && (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Summary
          </h3>
          <div className="text-xs text-surface-500 space-y-1">
            <p><span className="text-surface-400">Type:</span> {mode === "client" ? "Client (General Account)" : "Supplier (Clearing Account)"}</p>
            <p><span className="text-surface-400">Account:</span> {acct.accountName || "—"} ({acct.account || "—"})</p>
            <p><span className="text-surface-400">Rate Group:</span> {rate.rateGroupName || "—"}</p>
            {rate.prefix && <p><span className="text-surface-400">Rate:</span> {rate.prefix} @ ${rate.fee}/min</p>}
            <p><span className="text-surface-400">Gateway:</span> {gw.gatewayName || "—"} {gw.gatewayIp ? `(${gw.gatewayIp}:${gw.gatewayPort})` : ""}</p>
            {mode === "supplier" && dial.allowedPrefix && (
              <p><span className="text-surface-400">Prefixes:</span> {dial.allowedPrefix}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
