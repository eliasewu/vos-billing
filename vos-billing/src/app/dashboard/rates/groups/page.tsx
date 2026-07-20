"use client";

import { useState, useEffect, useRef } from "react";
import { Layers, RefreshCw, Shield, Plus, X, Send, Upload, FileUp, Search, Edit2, Trash2, Loader2, Edit3, ArrowRightLeft } from "lucide-react";

interface RateGroup { id: number; name: string; fakeMinute: number; isPrivate: number; memo: string; rateCount: number; }
interface CsvRow { prefix: string; areacode: string; fee: string; tax: string; period: string; type: string; }
interface RateResult { id: number; prefix: string; areacode: string; fee: number; tax: number; period: number; type: number; locktype: number; group_name: string; group_id: number; }

export default function RateGroupPage() {
  const [groups, setGroups] = useState<RateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── Group CRUD ───
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RateGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", fakeMinute: 60, isPrivate: 0, memo: "" });
  const [savingGroup, setSavingGroup] = useState(false);

  // ─── Add Rate modal ───
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0);
  const [addForm, setAddForm] = useState({ prefix: "", areacode: "", fee: "0.001", tax: "0", period: "60", type: "0", locktype: "0" });
  const [submitting, setSubmitting] = useState(false);

  // ─── Bulk import modal ───
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkGroupId, setBulkGroupId] = useState<number>(0);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{inserted:number;total:number;errors?:string[]}|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Global prefix search ───
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RateResult[]>([]);
  const [searching, setSearching] = useState(false);

  // ─── Edit/Delete rate from search results ───
  const [showEditRateModal, setShowEditRateModal] = useState(false);
  const [editingRate, setEditingRate] = useState<RateResult | null>(null);
  const [editRateForm, setEditRateForm] = useState({ prefix: "", areacode: "", fee: "0.001", tax: "0", period: "60", type: "0", locktype: "0" });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ─── Move to Group ───
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingRate, setMovingRate] = useState<RateResult | null>(null);
  const [moveTargetGroupId, setMoveTargetGroupId] = useState<number>(0);
  const [moving, setMoving] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try { const r = await window.fetch("/api/vos/rate-groups"); const d = await r.json(); if (d.error) setError(d.error); else setGroups(d.groups||[]); }
    catch { setError("Failed"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchGroups(); }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!searchQuery.trim()) { setSearchResults([]); return; }
      setSearching(true);
      try {
        const r = await window.fetch(`/api/vos/rates?search=${encodeURIComponent(searchQuery)}`);
        const d = await r.json();
        setSearchResults(d.results || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ─── Group CRUD handlers ───
  const openAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: "", fakeMinute: 60, isPrivate: 0, memo: "" });
    setError(""); setSuccess("");
    setShowGroupModal(true);
  };

  const openEditGroup = (g: RateGroup) => {
    setEditingGroup(g);
    setGroupForm({ name: g.name, fakeMinute: g.fakeMinute, isPrivate: g.isPrivate, memo: g.memo || "" });
    setError(""); setSuccess("");
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) { setError("Group name is required"); return; }
    setSavingGroup(true); setError(""); setSuccess("");
    try {
      if (editingGroup) {
        const r = await window.fetch("/api/vos/rate-groups", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingGroup.id, ...groupForm }),
        });
        const d = await r.json();
        if (d.error) setError(d.error);
        else { setSuccess(`Group "${groupForm.name}" updated`); setShowGroupModal(false); fetchGroups(); }
      } else {
        const r = await window.fetch("/api/vos/rate-groups", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupForm),
        });
        const d = await r.json();
        if (d.error) setError(d.error);
        else { setSuccess(`Group "${groupForm.name}" created`); setShowGroupModal(false); fetchGroups(); }
      }
    } catch { setError("Failed to save group"); }
    finally { setSavingGroup(false); }
  };

  const handleDeleteGroup = async (g: RateGroup) => {
    if (!confirm(`Delete rate group "${g.name}" and all ${g.rateCount} rates in it?`)) return;
    setError(""); setSuccess("");
    try {
      const r = await window.fetch(`/api/vos/rate-groups?id=${g.id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setSuccess(`Group "${g.name}" deleted`); fetchGroups(); }
    } catch { setError("Failed to delete group"); }
  };

  // ─── Rate CRUD handlers ───
  const openAddModal = (groupId: number) => {
    setSelectedGroupId(groupId);
    setAddForm({ prefix: "", areacode: "", fee: "0.001", tax: "0", period: "60", type: "0", locktype: "0" });
    setError(""); setSuccess("");
    setShowAddModal(true);
  };

  const openBulkModal = (groupId: number) => {
    setBulkGroupId(groupId);
    setCsvRows([]);
    setCsvFileName("");
    setImportResult(null);
    setError(""); setSuccess("");
    setShowBulkModal(true);
  };

  const handleAddRate = async () => {
    if (!selectedGroupId || !addForm.prefix) return;
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const r = await window.fetch("/api/vos/rates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feerategroup_id: selectedGroupId, prefix: addForm.prefix, areacode: addForm.areacode || null, fee: parseFloat(addForm.fee) || 0, tax: parseFloat(addForm.tax) || 0, period: parseInt(addForm.period) || 60, type: parseInt(addForm.type) || 0, locktype: parseInt(addForm.locktype) || 0 }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setSuccess(`Rate prefix "${addForm.prefix}" added to ${groups.find(g=>g.id===selectedGroupId)?.name || "group"}`); setShowAddModal(false); fetchGroups(); }
    } catch { setError("Failed to add rate"); }
    finally { setSubmitting(false); }
  };

  const handleDeleteRate = async (rate: RateResult) => {
    if (!confirm(`Delete rate prefix "${rate.prefix}" from ${rate.group_name}?`)) return;
    setDeletingId(rate.id); setError(""); setSuccess("");
    try {
      const r = await window.fetch(`/api/vos/rates?id=${rate.id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.error) setError(d.error);
      else {
        setSuccess(`Rate "${rate.prefix}" deleted`);
        setSearchResults(prev => prev.filter(s => s.id !== rate.id));
        fetchGroups();
      }
    } catch { setError("Failed to delete rate"); }
    finally { setDeletingId(null); }
  };

  const openEditRateModal = (rate: RateResult) => {
    setEditingRate(rate);
    setEditRateForm({
      prefix: rate.prefix,
      areacode: rate.areacode || "",
      fee: String(rate.fee),
      tax: String(rate.tax || 0),
      period: String(rate.period || 60),
      type: String(rate.type || 0),
      locktype: String(rate.locktype || 0),
    });
    setError(""); setSuccess("");
    setShowEditRateModal(true);
  };

  const handleSaveEditRate = async () => {
    if (!editingRate) return;
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const r = await window.fetch("/api/vos/rates", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRate.id,
          prefix: editRateForm.prefix,
          areacode: editRateForm.areacode || null,
          fee: parseFloat(editRateForm.fee) || 0,
          tax: parseFloat(editRateForm.tax) || 0,
          period: parseInt(editRateForm.period) || 60,
          type: parseInt(editRateForm.type) || 0,
          locktype: parseInt(editRateForm.locktype) || 0,
        }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else {
        setSuccess(`Rate "${editRateForm.prefix}" updated`);
        setShowEditRateModal(false);
        // Update search results in place
        setSearchResults(prev => prev.map(s => s.id === editingRate.id ? { ...s, prefix: editRateForm.prefix, areacode: editRateForm.areacode, fee: parseFloat(editRateForm.fee), tax: parseFloat(editRateForm.tax), period: parseInt(editRateForm.period), type: parseInt(editRateForm.type) } : s));
        fetchGroups();
      }
    } catch { setError("Failed to update rate"); }
    finally { setSubmitting(false); }
  };

  const handleMoveToGroup = async () => {
    if (!movingRate || !moveTargetGroupId || moveTargetGroupId === movingRate.group_id) return;
    setMoving(true); setError(""); setSuccess("");
    try {
      const r = await window.fetch("/api/vos/rates", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: movingRate.id, feerategroup_id: moveTargetGroupId }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else {
        const targetName = groups.find(g => g.id === moveTargetGroupId)?.name || "group";
        setSuccess(`Rate "${movingRate.prefix}" moved to ${targetName}`);
        setShowMoveModal(false);
        setSearchResults(prev => prev.filter(s => s.id !== movingRate.id));
        fetchGroups();
      }
    } catch { setError("Failed to move rate"); }
    finally { setMoving(false); }
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) { setError("CSV must have a header row and at least one data row"); return; }
    const header = lines[0].toLowerCase().replace(/[^a-z,]/g,"").split(",");
    const prefixIdx = header.findIndex(h=>h.includes("prefix"));
    const areaIdx = header.findIndex(h=>h.includes("area")||h.includes("code"));
    const feeIdx = header.findIndex(h=>h.includes("fee")||h.includes("rate")||h.includes("price"));
    const taxIdx = header.findIndex(h=>h.includes("tax"));
    const periodIdx = header.findIndex(h=>h.includes("period")||h.includes("cycle")||h.includes("billing"));
    const typeIdx = header.findIndex(h=>h.includes("type"));
    if (prefixIdx === -1) { setError("CSV must have a 'prefix' column"); return; }
    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c=>c.trim().replace(/^"|\"$/g,""));
      if (cols.length > 0 && cols[prefixIdx]) {
        rows.push({
          prefix: cols[prefixIdx],
          areacode: areaIdx >= 0 ? (cols[areaIdx] || "") : "",
          fee: feeIdx >= 0 ? (cols[feeIdx] || "0.001") : "0.001",
          tax: taxIdx >= 0 ? (cols[taxIdx] || "0") : "0",
          period: periodIdx >= 0 ? (cols[periodIdx] || "60") : "60",
          type: typeIdx >= 0 ? (cols[typeIdx] || "0") : "0",
        });
      }
    }
    if (rows.length === 0) { setError("No valid data rows found in CSV"); return; }
    setCsvRows(rows);
    setError("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (csvRows.length === 0) return;
    setImporting(true); setError(""); setImportResult(null);
    try {
      const r = await window.fetch("/api/vos/rates/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feerategroup_id: bulkGroupId, rates: csvRows.map(row=>({ prefix: row.prefix, areacode: row.areacode, fee: row.fee, tax: row.tax, period: row.period, type: row.type })) }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else {
        setImportResult(d);
        if (d.inserted > 0) { fetchGroups(); setCsvRows([]); }
      }
    } catch { setError("Bulk import failed"); }
    finally { setImporting(false); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-50">Rate Group Management</h1><p className="text-surface-400 text-sm mt-1">{groups.length} rate groups</p></div>
        <div className="flex items-center gap-2">
          <button onClick={openAddGroup} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Add Group</button>
          <button onClick={fetchGroups} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`} />Refresh</button>
        </div>
      </div>

      {/* Feedback */}
      {error && !showBulkModal && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>}

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input type="text" placeholder="Search rates by prefix across all groups..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-surface-500 hover:text-surface-300 transition-colors" title="Clear search"><X className="w-3.5 h-3.5" /></button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-800 flex items-center justify-between">
            <p className="text-sm text-surface-400">{searching ? "Searching..." : `${searchResults.length} results for "${searchQuery}"`}</p>
          </div>
          {searchResults.length > 0 && (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-surface-800"><th className="text-left px-4 py-2 text-surface-400 text-xs uppercase">Prefix</th><th className="text-left px-4 py-2 text-surface-400 text-xs uppercase">Area</th><th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Fee</th><th className="text-right px-4 py-2 text-surface-400 text-xs uppercase">Period</th><th className="text-left px-4 py-2 text-surface-400 text-xs uppercase">Type</th><th className="text-left px-4 py-2 text-surface-400 text-xs uppercase">Group</th><th className="text-center px-4 py-2 text-surface-400 text-xs uppercase w-20">Actions</th></tr></thead>
                <tbody className="divide-y divide-surface-800/50">
                  {searchResults.map(r => (
                    <tr key={r.id} className="hover:bg-surface-800/30">
                      <td className="px-4 py-2 text-surface-50 font-mono text-xs">{r.prefix}</td>
                      <td className="px-4 py-2 text-surface-300 text-xs">{r.areacode || "—"}</td>
                      <td className="px-4 py-2 text-right text-emerald-400 font-mono text-xs">${r.fee.toFixed(6)}</td>
                      <td className="px-4 py-2 text-right text-surface-300 text-xs">{r.period}s</td>
                      <td className="px-4 py-2"><span className="px-2 py-0.5 rounded text-[10px] bg-surface-800 text-surface-400">{r.type===0?"Std":r.type===1?"Flat":"T"+r.type}</span></td>
                      <td className="px-4 py-2 text-surface-300 text-xs">{r.group_name}</td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditRateModal(r)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-brand-400 transition-colors" title="Edit rate"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteRate(r)} disabled={deletingId === r.id} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors disabled:opacity-50" title="Delete rate">{deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                          <button onClick={() => { setMovingRate(r); setMoveTargetGroupId(0); setError(""); setSuccess(""); setShowMoveModal(true); }} className="p-1.5 rounded hover:bg-cyan-500/10 text-surface-400 hover:text-cyan-400 transition-colors" title="Move to group"><ArrowRightLeft className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Group Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:5}).map((_,i)=><div key={i} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5"><div className="h-5 bg-surface-800 rounded w-32 mb-3 animate-pulse"/></div>)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g=>(
            <div key={g.id} className="bg-surface-900 border border-surface-700/50 rounded-xl p-5 hover:border-surface-600/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Layers className="w-5 h-5 text-brand-400"/></div>
                  <div><h3 className="text-base font-semibold text-surface-50">{g.name}</h3><p className="text-xs text-surface-500">ID: {g.id}</p></div>
                </div>
                <div className="flex items-center gap-1">
                  {g.isPrivate===1 && <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400"><Shield className="w-3 h-3"/>Pvt</span>}
                  <button onClick={() => openEditGroup(g)} className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50" title="Edit group"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteGroup(g)} className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400" title="Delete group"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><span className="text-surface-500 text-xs">Rates</span><p className="text-surface-50 font-mono">{g.rateCount}</p></div>
                <div><span className="text-surface-500 text-xs">Increment</span><p className="text-surface-50 font-mono">{g.fakeMinute}s</p></div>
              </div>
              {g.memo && <p className="text-xs text-surface-500 border-t border-surface-800 pt-3 mb-3">{g.memo}</p>}
              <div className="space-y-2">
                <button onClick={() => openAddModal(g.id)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 transition-colors text-sm font-medium"><Plus className="w-4 h-4"/>Add New Rate</button>
                <button onClick={() => openBulkModal(g.id)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600/20 transition-colors text-sm font-medium"><Upload className="w-4 h-4"/>Bulk CSV Import</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add/Edit Group Modal ─── */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700/50 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center"><Layers className="w-5 h-5 text-brand-400"/></div>
                <div><h2 className="text-lg font-semibold text-surface-50">{editingGroup ? "Edit Rate Group" : "New Rate Group"}</h2><p className="text-xs text-surface-500">{editingGroup ? `Editing: ${editingGroup.name}` : "Create a new rate group"}</p></div>
              </div>
              <button onClick={()=>setShowGroupModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Group Name *</label>
                <input type="text" placeholder="e.g. Default, Premium, Gold..." value={groupForm.name} onChange={e=>setGroupForm({...groupForm,name:e.target.value})}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">Billing Increment (s)</label>
                  <input type="number" value={groupForm.fakeMinute} onChange={e=>setGroupForm({...groupForm,fakeMinute:parseInt(e.target.value)||60})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">Visibility</label>
                  <select value={groupForm.isPrivate} onChange={e=>setGroupForm({...groupForm,isPrivate:parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50">
                    <option value={0}>Public</option>
                    <option value={1}>Private</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Memo</label>
                <textarea value={groupForm.memo} onChange={e=>setGroupForm({...groupForm,memo:e.target.value})} rows={2}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50 resize-none"
                  placeholder="Optional notes about this group..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <button onClick={()=>setShowGroupModal(false)} className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800">Cancel</button>
              <button onClick={handleSaveGroup} disabled={!groupForm.name.trim() || savingGroup}
                className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {savingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {savingGroup ? "Saving..." : editingGroup ? "Update Group" : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Rate Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700/50 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Plus className="w-5 h-5 text-emerald-400"/></div><div><h2 className="text-lg font-semibold text-surface-50">Add New Rate</h2><p className="text-xs text-surface-500">Group: {groups.find(g=>g.id===selectedGroupId)?.name||"—"}</p></div></div>
              <button onClick={()=>setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Prefix *</label><input type="text" placeholder="e.g. 0091" value={addForm.prefix} onChange={e=>setAddForm({...addForm,prefix:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-emerald-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Area Code</label><input type="text" placeholder="e.g. 91" value={addForm.areacode} onChange={e=>setAddForm({...addForm,areacode:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-emerald-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Rate ($/min)</label><input type="number" step="0.000001" value={addForm.fee} onChange={e=>setAddForm({...addForm,fee:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-emerald-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Tax</label><input type="number" step="0.01" min="0" max="1" value={addForm.tax} onChange={e=>setAddForm({...addForm,tax:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-emerald-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Billing Cycle (s)</label><input type="number" value={addForm.period} onChange={e=>setAddForm({...addForm,period:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-emerald-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Type</label><select value={addForm.type} onChange={e=>setAddForm({...addForm,type:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-emerald-500/50"><option value="0">Standard</option><option value="1">Flat Rate</option><option value="2">Tiered</option><option value="3">Premium</option></select></div>
              </div>
              <button onClick={handleAddRate} disabled={!addForm.prefix||submitting} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{submitting?<RefreshCw className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}{submitting?"Adding...":"Add Rate"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Rate Modal ─── */}
      {showEditRateModal && editingRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700/50 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Edit3 className="w-5 h-5 text-amber-400"/></div><div><h2 className="text-lg font-semibold text-surface-50">Edit Rate</h2><p className="text-xs text-surface-500">ID: {editingRate.id} — Group: {editingRate.group_name}</p></div></div>
              <button onClick={()=>setShowEditRateModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Prefix *</label><input type="text" value={editRateForm.prefix} onChange={e=>setEditRateForm({...editRateForm,prefix:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Area Code</label><input type="text" value={editRateForm.areacode} onChange={e=>setEditRateForm({...editRateForm,areacode:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Rate ($/min)</label><input type="number" step="0.000001" value={editRateForm.fee} onChange={e=>setEditRateForm({...editRateForm,fee:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Tax</label><input type="number" step="0.01" min="0" max="1" value={editRateForm.tax} onChange={e=>setEditRateForm({...editRateForm,tax:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Billing Cycle (s)</label><input type="number" value={editRateForm.period} onChange={e=>setEditRateForm({...editRateForm,period:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="block text-xs font-medium text-surface-400 mb-1">Type</label><select value={editRateForm.type} onChange={e=>setEditRateForm({...editRateForm,type:e.target.value})} className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-amber-500/50"><option value="0">Standard</option><option value="1">Flat Rate</option><option value="2">Tiered</option><option value="3">Premium</option></select></div>
              </div>
              <button onClick={handleSaveEditRate} disabled={!editRateForm.prefix||submitting} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{submitting?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}{submitting?"Saving...":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Move to Group Modal ─── */}
      {showMoveModal && movingRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700/50 rounded-2xl w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center"><ArrowRightLeft className="w-5 h-5 text-cyan-400"/></div><div><h2 className="text-lg font-semibold text-surface-50">Move Rate</h2><p className="text-xs text-surface-500">Prefix: {movingRate.prefix} — From: {movingRate.group_name}</p></div></div>
              <button onClick={()=>setShowMoveModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Target Rate Group</label>
                <select value={moveTargetGroupId} onChange={e=>setMoveTargetGroupId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-cyan-500/50">
                  <option value={0}>— Select group —</option>
                  {groups.filter(g => g.id !== movingRate.group_id).map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.rateCount} rates)</option>
                  ))}
                </select>
              </div>
              <button onClick={handleMoveToGroup} disabled={!moveTargetGroupId || moving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {moving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                {moving ? "Moving..." : moveTargetGroupId ? `Move to ${groups.find(g=>g.id===moveTargetGroupId)?.name}` : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk CSV Import Modal ─── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700/50 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Upload className="w-5 h-5 text-violet-400"/></div>
                <div><h2 className="text-lg font-semibold text-surface-50">Bulk CSV Import</h2><p className="text-xs text-surface-500">Group: {groups.find(g=>g.id===bulkGroupId)?.name||"—"} | Max 500 rows</p></div>
              </div>
              <button onClick={()=>setShowBulkModal(false)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-50"><X className="w-5 h-5"/></button>
            </div>
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/30 text-xs text-surface-400">
                <p className="font-medium text-surface-300 mb-1">CSV Format:</p>
                <code className="text-brand-400">prefix,areacode,fee,tax,period,type</code>
                <p className="mt-1">Columns are auto-detected by header name. Only <b>prefix</b> is required.</p>
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                <button onClick={()=>fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-surface-700 hover:border-violet-500/50 text-surface-400 hover:text-violet-400 transition-colors">
                  <FileUp className="w-8 h-8"/><div className="text-left"><p className="font-medium">{csvFileName || "Click to upload CSV file"}</p><p className="text-xs text-surface-500">{csvFileName ? `${csvRows.length} rows parsed` : ".csv files only"}</p></div>
                </button>
              </div>
              {csvRows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-surface-400 mb-2">{csvRows.length} rows ready to import</p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-surface-700/50">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-surface-800/50 text-surface-400"><th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Prefix</th><th className="text-left px-3 py-2">Area</th><th className="text-right px-3 py-2">Fee</th><th className="text-right px-3 py-2">Tax</th><th className="text-right px-3 py-2">Period</th><th className="text-left px-3 py-2">Type</th></tr></thead>
                      <tbody className="divide-y divide-surface-800/50">
                        {csvRows.slice(0, 20).map((row,i)=>(
                          <tr key={i} className="text-surface-300"><td className="px-3 py-1.5 text-surface-500">{i+1}</td><td className="px-3 py-1.5 font-mono text-surface-50">{row.prefix}</td><td className="px-3 py-1.5">{row.areacode||"—"}</td><td className="px-3 py-1.5 text-right font-mono">${parseFloat(row.fee||"0").toFixed(6)}</td><td className="px-3 py-1.5 text-right">{row.tax||"0"}</td><td className="px-3 py-1.5 text-right">{row.period||"60"}s</td><td className="px-3 py-1.5">{parseInt(row.type||"0")===0?"Std":parseInt(row.type||"0")===1?"Flat":"T"+row.type}</td></tr>
                        ))}
                        {csvRows.length > 20 && <tr><td colSpan={7} className="px-3 py-2 text-center text-surface-500">... and {csvRows.length - 20} more rows</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {importResult && (
                <div className={`p-4 rounded-xl ${importResult.errors?.length ? "bg-amber-500/10 border border-amber-500/20" : "bg-emerald-500/10 border border-emerald-500/20"}`}>
                  <p className={`text-sm font-medium ${importResult.errors?.length ? "text-amber-400" : "text-emerald-400"}`}>✓ Imported {importResult.inserted} of {importResult.total} rates</p>
                  {importResult.errors && importResult.errors.length > 0 && <div className="mt-2 space-y-1">{importResult.errors.slice(0,5).map((e,i)=><p key={i} className="text-xs text-red-400">{e}</p>)}</div>}
                </div>
              )}
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}
            </div>
            {csvRows.length > 0 && !importResult && (
              <div className="px-6 py-4 border-t border-surface-800 flex-shrink-0">
                <button onClick={handleBulkImport} disabled={importing} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  {importing?<RefreshCw className="w-4 h-4 animate-spin"/>:<Upload className="w-4 h-4"/>}
                  {importing?"Importing...":`Import ${csvRows.length} Rates`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
