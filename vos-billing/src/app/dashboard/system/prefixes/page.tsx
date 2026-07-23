"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Hash, RefreshCw, Search, Edit2, X, Check, Plus, Trash2, MapPin, Database, Download, Upload, Loader2, FileUp, Eye, AlertTriangle, FileText, ChevronLeft, ChevronRight } from "lucide-react";

// Parse location into country and area name
// Strategy: split on first space (country <space> area-name), with fallbacks for comma and hyphen delimiters
// Examples: "Afghanistan Cellular-AT", "Georgia,Tbilisi", "Dominican Republic-Santo Domingo"
function parseLocation(location: string): { country: string; areaName: string } {
  if (!location) return { country: "—", areaName: "" };

  // 1. Comma separator (legacy): "Georgia,Tbilisi", "Netherlands,Premium"
  const commaIdx = location.indexOf(",");
  if (commaIdx > 0) {
    return { country: location.slice(0, commaIdx).trim(), areaName: location.slice(commaIdx + 1).trim() };
  }

  // 2. Split on first space: "India Cellular-Vodafone Idea" → country="India", area="Cellular-Vodafone Idea"
  //    "Morocco Cellular-Wana" → country="Morocco", area="Cellular-Wana"
  //    "India" → no space, falls through to next checks
  const spaceIdx = location.indexOf(" ");
  if (spaceIdx > 0) {
    return { country: location.slice(0, spaceIdx).trim(), areaName: location.slice(spaceIdx + 1).trim() };
  }

  // 3. Hyphen separator (no spaces present): "Morocco-Wana", "Inmarsat-BGAN", "Panama-Offnet"
  const hyphenIdx = location.indexOf("-");
  if (hyphenIdx > 0) {
    const before = location.slice(0, hyphenIdx).trim();
    const after = location.slice(hyphenIdx + 1).trim();
    if (before && after) return { country: before, areaName: after };
  }

  // 4. No separator found — it's just a country name: "India", "USA"
  return { country: location, areaName: "" };
}

interface AreaPrefix {
  areacode: string;
  location: string;
  initialBilling: number;
  incrementalBilling: number;
  rateCount: number;
}

// Simple CSV line parser (handles quoted fields with escaped quotes)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current); current = ""; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

export default function AreaPrefixPage() {
  const [prefixes, setPrefixes] = useState<AreaPrefix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Edit state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editInitBill, setEditInitBill] = useState(1);
  const [editIncrBill, setEditIncrBill] = useState(1);
  const [saving, setSaving] = useState(false);

  // Add state
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ areacode: "", location: "" });
  const [adding, setAdding] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV preview state
  const [csvPreview, setCsvPreview] = useState<{
    rows: Array<{ areacode: string; location: string }>;
    totalRows: number;
    columns: string[];
    codeCol: string;
    locCol: string;
  } | null>(null);

  const fetchPrefixes = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const r = await fetch(`/api/vos/prefixes?${params}`);
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setPrefixes(d.prefixes || []); setTotal(d.total || 0); }
    } catch { setError("Failed to load area prefixes"); }
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch]);

  useEffect(() => { fetchPrefixes(); }, [fetchPrefixes]);

  const startEdit = (p: AreaPrefix) => {
    setEditingCode(p.areacode);
    setEditLocation(p.location);
    setEditInitBill(p.initialBilling ?? 1);
    setEditIncrBill(p.incrementalBilling ?? 1);
  };

  const cancelEdit = () => { setEditingCode(null); setEditLocation(""); setEditInitBill(1); setEditIncrBill(1); };

  const saveEdit = async (areacode: string) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/prefixes", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areacode, location: editLocation, initialBilling: editInitBill, incrementalBilling: editIncrBill }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setPrefixes(prev => prev.map(p => p.areacode === areacode ? { ...p, location: editLocation, initialBilling: editInitBill, incrementalBilling: editIncrBill } : p));
      setEditingCode(null);
      setSuccess(`Area code ${areacode} updated`);
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!addForm.areacode || !addForm.location) {
      setError("Area code and location are required"); return;
    }
    setAdding(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/prefixes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setShowAdd(false);
      setAddForm({ areacode: "", location: "" });
      setSuccess(`Area code ${data.areacode} added`);
      await fetchPrefixes();
    } catch { setError("Failed to add area code"); }
    finally { setAdding(false); }
  };

  const handleDownloadTemplate = () => {
    const csv = "areacode,location\n91,India\n44,United Kingdom\n880,Bangladesh\n1,USA";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "area_prefix_template.csv";
    a.click();
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const r = await fetch(`/api/vos/prefixes?limit=200000&page=1`);
      const d = await r.json();
      const allPrefixes = d.prefixes || [];
      const rows = ["areacode,location", ...allPrefixes.map((p: AreaPrefix) => `"${p.areacode}","${(p.location||"").replace(/"/g,'""')}"`)].join("\n");
      const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `area_prefixes_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      setSuccess(`Exported ${allPrefixes.length.toLocaleString()} area codes to CSV`);
    } catch { setError("Failed to export CSV"); }
    finally { setExporting(false); }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processImportFile(file);
  };

  const parsedRowsRef = useRef<Array<{ areacode: string; location: string }>>([]);

  const processImportFile = async (file: File) => {
    setImporting(true); setError(""); setSuccess(""); setCsvPreview(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { setError("CSV must have a header row and at least one data row"); return; }

      const header = lines[0].toLowerCase();
      const allCols = header.split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const codeIdx = allCols.findIndex(c => c === "areacode" || c === "area code" || c === "code");
      const locIdx = allCols.findIndex(c => c === "location" || c === "country" || c === "name");

      if (codeIdx === -1 || locIdx === -1) {
        setError("CSV must have columns: areacode (or 'area code') and location (or 'country')");
        return;
      }

      const rows: Array<{ areacode: string; location: string }> = [];
      for (let i = 1; i < Math.min(lines.length, 50001); i++) {
        const values = parseCSVLine(lines[i]);
        const areacode = (values[codeIdx] || "").trim().replace(/^"|"$/g, "");
        const location = (values[locIdx] || "").trim().replace(/^"|"$/g, "");
        if (areacode && location) rows.push({ areacode, location });
      }

      if (rows.length === 0) { setError("No valid rows found in CSV"); return; }

      // Show preview instead of importing immediately
      setCsvPreview({
        rows: rows.slice(0, 5),
        totalRows: rows.length,
        columns: allCols,
        codeCol: allCols[codeIdx],
        locCol: allCols[locIdx],
      });
      // Keep parsed rows in a ref for confirm
      parsedRowsRef.current = rows;
    } catch { setError("Failed to parse CSV"); }
    finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    const rows = parsedRowsRef.current;
    if (rows.length === 0) return;
    setImporting(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/vos/prefixes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_import: true, rows }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setCsvPreview(null);
      parsedRowsRef.current = [];
      setSuccess(`CSV import complete: ${data.imported} imported, ${data.failed} skipped (${data.total} total)`);
      await fetchPrefixes();
    } catch { setError("Failed to import CSV"); }
    finally { setImporting(false); }
  };

  const cancelPreview = () => {
    setCsvPreview(null);
    parsedRowsRef.current = [];
  };

  // Drag-and-drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      await processImportFile(file);
    } else if (file) {
      setError("Please drop a .csv file");
    }
  };

  const handleDelete = async (areacode: string, rateCount: number) => {
    const warnMsg = rateCount > 0
      ? `Delete area code "${areacode}"?\n\n⚠️ This area code is referenced by ${rateCount} rate entr${rateCount === 1 ? "y" : "ies"} in e_feerate. Deleting it may break rate matching.`
      : `Delete area code "${areacode}"?`;
    if (!confirm(warnMsg)) return;
    setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/vos/prefixes?areacode=${encodeURIComponent(areacode)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setPrefixes(prev => prev.filter(p => p.areacode !== areacode));
      setSuccess(`Area code ${areacode} deleted`);
      // Refetch if page becomes empty after delete
      fetchPrefixes();
    } catch { setError("Failed to delete"); }
  };

  const sorted = prefixes;
  const [exporting, setExporting] = useState(false);

  return (
    <div className="p-6 space-y-6"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/60 backdrop-blur-sm pointer-events-none">
          <div className="bg-surface-900 border-2 border-dashed border-brand-500 rounded-2xl p-12 text-center max-w-md mx-4">
            <FileUp className="w-16 h-16 text-brand-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-surface-50 mb-2">Drop CSV File</h2>
            <p className="text-surface-400 text-sm">Release to import area prefixes from your CSV</p>
            <p className="text-surface-500 text-xs mt-2">Expected columns: areacode, location</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand-400" />Area Prefix Database
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            {total.toLocaleString()} area prefixes — Country calling codes from VOS3000 e_areacode
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowAdd(!showAdd); setAddForm({ areacode: "", location: "" }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />Add Area Code
          </button>
          <button onClick={handleExportCsv} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-emerald-400 text-sm transition-colors disabled:opacity-50"
            title="Export all area codes as CSV">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? "Exporting..." : "Export"}
          </button>
          <button onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-brand-400 text-sm transition-colors"
            title="Download CSV template with correct headers">
            <FileText className="w-4 h-4" />Template
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50 text-sm transition-colors disabled:opacity-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? "Importing..." : "Import"}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
          <button onClick={fetchPrefixes}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <button onClick={() => setError("")} className="p-0.5 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <button onClick={() => setSuccess("")} className="p-0.5 hover:text-emerald-300"><X className="w-3.5 h-3.5" /></button>
          {success}
        </div>
      )}

      {/* CSV Import Preview */}
      {csvPreview && (
        <div className="p-5 rounded-xl bg-surface-900 border border-brand-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-brand-400" />
              <h3 className="text-surface-50 font-semibold">CSV Import Preview</h3>
            </div>
            <button onClick={cancelPreview} className="p-1 rounded hover:bg-surface-700 text-surface-400"><X className="w-4 h-4" /></button>
          </div>

          {/* Column mapping info */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-surface-500">Column mapping:</span>
              <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 font-mono">"{csvPreview.codeCol}" → Area Code</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">"{csvPreview.locCol}" → Location</span>
            </div>
            <span className="text-surface-500">·</span>
            <span className="text-surface-400">
              <span className="text-surface-50 font-mono font-bold">{csvPreview.totalRows.toLocaleString()}</span> valid rows found
            </span>
          </div>

          {/* Preview table (first 5 rows) */}
          <div className="bg-surface-800/50 border border-surface-700/50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left px-4 py-2 text-surface-400 font-medium text-xs">#</th>
                  <th className="text-left px-4 py-2 text-surface-400 font-medium text-xs">Area Code</th>
                  <th className="text-left px-4 py-2 text-surface-400 font-medium text-xs">Location</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.rows.map((r, i) => (
                  <tr key={i} className="border-b border-surface-700/30">
                    <td className="px-4 py-2 text-surface-500 text-xs font-mono">{i + 1}</td>
                    <td className="px-4 py-2 text-surface-50 font-mono text-xs">{r.areacode}</td>
                    <td className="px-4 py-2 text-surface-200 text-xs">{r.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* More rows indicator */}
          {csvPreview.totalRows > 5 && (
            <p className="text-xs text-surface-500">
              ... and {csvPreview.totalRows - 5} more row{(csvPreview.totalRows - 5) !== 1 ? 's' : ''}
            </p>
          )}

          {/* Confirm / Cancel */}
          <div className="flex items-center gap-3">
            <button onClick={confirmImport} disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {importing ? "Importing..." : `Confirm Import ${csvPreview.totalRows} Rows`}
            </button>
            <button onClick={cancelPreview}
              className="px-4 py-2.5 rounded-lg bg-surface-800 text-surface-400 hover:text-surface-50 text-sm transition-colors">
              Cancel
            </button>
            {csvPreview.totalRows >= 50000 && (
              <span className="flex items-center gap-1 text-amber-400 text-xs">
                <AlertTriangle className="w-3 h-3" />Max 50,000 rows — import truncated
              </span>
            )}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="p-5 rounded-xl bg-surface-900 border border-brand-500/20 space-y-4">
          <h3 className="text-surface-50 font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-400" />Add Area Prefix
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Area Code *</label>
              <input type="text" value={addForm.areacode}
                onChange={e => setAddForm({ ...addForm, areacode: e.target.value })}
                placeholder="e.g. 91, 880, 44"
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm font-mono focus:outline-none focus:border-brand-500/50" />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Country / Location *</label>
              <input type="text" value={addForm.location}
                onChange={e => setAddForm({ ...addForm, location: e.target.value })}
                placeholder="e.g. India, Bangladesh"
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-sm focus:outline-none focus:border-brand-500/50" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleAdd} disabled={adding}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50">
                {adding ? "Saving..." : <><Check className="w-4 h-4" />Save</>}
              </button>
              <button onClick={() => setShowAdd(false)}
                className="px-4 py-2.5 rounded-lg bg-surface-800 text-surface-400 hover:text-surface-50 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input type="text" placeholder="Search by area code or country..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700/50 rounded-lg text-surface-50 text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-50">{total.toLocaleString()}</p>
              <p className="text-xs text-surface-400">Total Area Codes</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-50">{totalPages}</p>
              <p className="text-xs text-surface-400">Total Pages</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-50">{limit}</p>
              <p className="text-xs text-surface-400">Per Page</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-50">{sorted.length}</p>
              <p className="text-xs text-surface-400">Page {page} of {totalPages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider w-12">#</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Area Code</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Country</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider">Area Name</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider w-16">Init</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider w-16">Incr</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider w-24">Rates</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium text-xs uppercase tracking-wider w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-800/50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              )) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-surface-500">
                    <MapPin className="w-10 h-10 mx-auto mb-2 text-surface-600" />
                    <p>{prefixes.length === 0 ? "No area prefixes yet — add country calling codes like 91 (India), 880 (Bangladesh)" : "No results match your search"}</p>
                  </td>
                </tr>
              ) : sorted.map((p, i) => (
                <tr key={p.areacode} className={`border-b border-surface-800/50 transition-colors hover:bg-surface-800/30 ${i % 2 === 0 ? "bg-surface-800/10" : ""}`}>
                  <td className="px-4 py-3 text-surface-500 text-xs font-mono">{i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-surface-50 font-mono text-sm font-bold tracking-wider">{p.areacode}</span>
                  </td>
                  <td className="px-4 py-3">
                    {editingCode === p.areacode ? (
                      <div className="flex items-center gap-2">
                        <input type="text" value={editLocation}
                          onChange={e => setEditLocation(e.target.value)}
                          className="w-full min-w-[120px] px-3 py-1.5 bg-surface-800 border border-brand-500/50 rounded-lg text-surface-50 text-sm focus:outline-none" autoFocus />
                        <button onClick={() => saveEdit(p.areacode)} disabled={saving}
                          className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-surface-700 text-surface-400"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        {(() => { const { country } = parseLocation(p.location); return (
                          <div className="text-surface-200 text-sm font-medium">{country}</div>
                        ); })()}
                        {!p.location && <span className="text-surface-600 text-sm">—</span>}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingCode !== p.areacode && (
                      <>
                        {(() => { const { areaName } = parseLocation(p.location); return areaName ? (
                          <span className="text-surface-300 text-xs">{areaName}</span>
                        ) : (
                          <span className="text-surface-600 text-xs">—</span>
                        ); })()}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingCode === p.areacode ? (
                      <input type="number" step="0.0001" min="0" value={editInitBill}
                        onChange={e => setEditInitBill(Number(e.target.value))}
                        className="w-16 px-2 py-1.5 bg-surface-800 border border-brand-500/50 rounded-lg text-surface-50 text-xs font-mono focus:outline-none" />
                    ) : (
                      <span className="text-surface-300 text-xs font-mono">{p.initialBilling ?? 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingCode === p.areacode ? (
                      <input type="number" step="0.0001" min="0" value={editIncrBill}
                        onChange={e => setEditIncrBill(Number(e.target.value))}
                        className="w-16 px-2 py-1.5 bg-surface-800 border border-brand-500/50 rounded-lg text-surface-50 text-xs font-mono focus:outline-none" />
                    ) : (
                      <span className="text-surface-300 text-xs font-mono">{p.incrementalBilling ?? 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.rateCount > 0 ? (
                      <span className="text-brand-400 font-mono text-xs font-medium">{p.rateCount.toLocaleString()}</span>
                    ) : (
                      <span className="text-surface-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {editingCode !== p.areacode && (
                        <button onClick={() => startEdit(p)}
                          className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"
                          title="Edit location name">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(p.areacode, p.rateCount)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-surface-500 hover:text-red-400"
                        title={p.rateCount > 0 ? `${p.rateCount} rate entries reference this area code` : "Delete area code"}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-4 py-3 border-t border-surface-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-surface-500">
              <span>Showing <span className="text-surface-300 font-medium">{((page - 1) * limit) + 1}-{Math.min(page * limit, total)}</span> of <span className="text-surface-300 font-medium">{total.toLocaleString()}</span></span>
              <span className="text-surface-600">·</span>
              <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-surface-800 border border-surface-700 rounded text-xs text-surface-300 focus:outline-none">
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={200}>200 / page</option>
                <option value={500}>500 / page</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page <= 1}
                className="px-2 py-1 rounded text-xs text-surface-400 hover:text-surface-50 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="First page">
                «
              </button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex items-center gap-0.5 px-2.5 py-1 rounded text-xs text-surface-400 hover:text-surface-50 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-3 h-3" />Prev
              </button>
              {(() => {
                const pages: number[] = [];
                const start = Math.max(1, page - 2);
                const end = Math.min(totalPages, page + 2);
                if (start > 1) { pages.push(1); if (start > 2) pages.push(-1); }
                for (let p = start; p <= end; p++) pages.push(p);
                if (end < totalPages) { if (end < totalPages - 1) pages.push(-2); pages.push(totalPages); }
                return pages.map((p, i) =>
                  p < 0 ? <span key={p} className="px-1 text-surface-600">...</span> :
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      p === page ? "bg-brand-600 text-white" : "text-surface-400 hover:text-surface-50 hover:bg-surface-800"
                    }`}>{p}</button>
                );
              })()}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="flex items-center gap-0.5 px-2.5 py-1 rounded text-xs text-surface-400 hover:text-surface-50 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Next<ChevronRight className="w-3 h-3" />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}
                className="px-2 py-1 rounded text-xs text-surface-400 hover:text-surface-50 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Last page">
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
