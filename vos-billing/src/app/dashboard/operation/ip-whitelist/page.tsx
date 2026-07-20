"use client";

import { useState, useEffect } from "react";
import { Shield, Search, RefreshCw, Globe, Plus, Trash2, X, Download, CheckSquare, Square } from "lucide-react";

interface IpEntry { id: number; area: string; ip: string; count: number; memo: string; }

export default function IpWhitelistPage() {
  const [ips, setIps] = useState<IpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ip: "", area: "", memo: "" });

  const fetchIps = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vos/ip-whitelist");
      const data = await res.json();
      if (data.error) setError(data.error); else { setIps(data.ips || []); setSelectedIds(new Set()); }
    } catch { setError("Failed to load IP list"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchIps(); }, []);

  const handleAdd = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/ip-whitelist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setShowModal(false); setForm({ ip: "", area: "", memo: "" }); setSuccess(`IP ${data.ip} added to whitelist`); fetchIps(); }
    } catch { setError("Failed to add IP"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (ip: string) => {
    if (!confirm(`Remove ${ip} from whitelist?`)) return;
    setError(""); setSuccess("");
    try {
      await fetch(`/api/vos/ip-whitelist?ip=${encodeURIComponent(ip)}`, { method: "DELETE" });
      setSuccess(`IP ${ip} removed from whitelist`);
      fetchIps();
    } catch { setError("Failed to remove IP"); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(e => e.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected IPs from whitelist?`)) return;
    setError(""); setSuccess("");
    let ok = 0;
    const selectedIps = filtered.filter(e => selectedIds.has(e.id));
    for (const entry of selectedIps) {
      try {
        await fetch(`/api/vos/ip-whitelist?ip=${encodeURIComponent(entry.ip)}`, { method: "DELETE" });
        ok++;
      } catch {}
    }
    setSelectedIds(new Set());
    if (ok === 0) setError("Failed to delete any IPs");
    else if (ok < selectedIds.size) setSuccess(`Deleted ${ok} of ${selectedIds.size} IPs (some failed)`);
    else setSuccess(`Deleted all ${ok} IP${ok > 1 ? "s" : ""}`);
    fetchIps();
  };

  const exportCSV = () => {
    const rows = ["ID,IP Address,Area,Hits,Memo", ...filtered.map(e => [e.id, e.ip, `"${(e.area||"").replace(/"/g,'""')}"`, e.count, `"${(e.memo||"").replace(/"/g,'""')}"`].join(","))].join("\n");
    const b = new Blob([rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "ip_whitelist.csv"; a.click();
  };

  const filtered = ips.filter(e => e.ip.includes(search) || e.area.toLowerCase().includes(search.toLowerCase()) || (e.memo || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">IP Whitelist Firewall</h1><p className="text-surface-400 text-sm mt-1">Allowlist IPs for SIP signaling (port 5060)</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setForm({ ip: "", area: "", memo: "" }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"><Plus className="w-4 h-4" />Add IP</button>
          <button onClick={exportCSV} className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400" title="Export CSV"><Download className="w-4 h-4" /></button>
          <button onClick={fetchIps} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-brand-400" /></div><div><p className="text-2xl font-bold text-surface-50">{ips.length}</p><p className="text-xs text-surface-400">Whitelisted IPs</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Globe className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-surface-50">{new Set(ips.map(i => i.area).filter(Boolean)).size}</p><p className="text-xs text-surface-400">Regions</p></div></div></div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-surface-50">{ips.reduce((s, i) => s + i.count, 0).toLocaleString()}</p><p className="text-xs text-surface-400">Total Hits</p></div></div></div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>}

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" placeholder="Search by IP, area, or memo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" /></div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <CheckSquare className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400 font-medium">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-50 hover:bg-surface-700 transition-colors">Deselect</button>
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"><Trash2 className="w-4 h-4" />Delete Selected</button>
        </div>
      )}

      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-surface-800">
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase w-12">
                <button onClick={toggleSelectAll} className="p-0.5 rounded hover:bg-surface-700 text-surface-500 hover:text-surface-300">
                  {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-4 h-4 text-brand-400" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">#</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">IP Address</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Area</th>
              <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase">Hits</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase">Memo</th>
              <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase w-24">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i} className="border-b border-surface-800/50">{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>)}</tr>))
                : filtered.length === 0 ? (<tr><td colSpan={7} className="px-4 py-12 text-center text-surface-500"><Shield className="w-10 h-10 mx-auto mb-2 text-surface-600" /><p>No IPs in whitelist</p><p className="text-xs mt-1">Add IPs to allow SIP traffic</p></td></tr>)
                  : filtered.map(e => (
                    <tr key={e.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleSelect(e.id)} className="p-0.5 rounded hover:bg-surface-700">
                          {selectedIds.has(e.id) ? <CheckSquare className="w-4 h-4 text-brand-400" /> : <Square className="w-4 h-4 text-surface-600" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-surface-500 text-xs">{e.id}</td>
                      <td className="px-4 py-3 text-surface-50 font-mono font-medium text-sm">{e.ip}</td>
                      <td className="px-4 py-3 text-surface-300 text-xs">{e.area || "—"}</td>
                      <td className="px-4 py-3 text-right text-surface-300 font-mono text-xs">{e.count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-surface-400 text-xs max-w-[300px] truncate">{e.memo || "—"}</td>
                      <td className="px-4 py-3 text-center"><button onClick={() => handleDelete(e.ip)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800"><h2 className="text-lg font-semibold text-surface-50 flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-400" />Add IP to Whitelist</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="block text-xs font-medium text-surface-400 mb-1">IP Address * (e.g. 192.168.1.0/24)</label><input value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.1 or 10.0.0.0/8" className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 font-mono" /></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Area / Region</label><input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="US, EU, Asia..." className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" /></div>
              <div><label className="block text-xs font-medium text-surface-400 mb-1">Memo</label><textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none" placeholder="Client name or reason..." /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleAdd} disabled={!form.ip || saving} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Adding..." : "Add to Whitelist"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
