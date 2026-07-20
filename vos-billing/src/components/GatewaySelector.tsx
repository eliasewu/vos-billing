"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, Check, PlusCircle, Search, RefreshCw, Loader2 } from "lucide-react";

interface GatewayInfo {
  id: number;
  name: string;
  remoteips: string;
  prefix: string;
  capacity: number;
  locktype: number;
  signalport: number;
  customer_id: number;
}

interface GatewaySelectorProps {
  gatewayType: "mapping" | "routing";
  customerId?: number;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export default function GatewaySelector({ gatewayType, customerId, selectedIds, onChange }: GatewaySelectorProps) {
  const [allGateways, setAllGateways] = useState<GatewayInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchGateways();
  }, [gatewayType]);

  const fetchGateways = async () => {
    setLoading(true); setError("");
    try {
      const typeParam = gatewayType === "routing" ? "routing" : "mapping";
      const res = await fetch(`/api/vos/gateways?type=${typeParam}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        const gws: GatewayInfo[] = (data.gateways || []).map((g: any) => ({
          id: Number(g.id),
          name: String(g.gateway_name || g.name || ""),
          remoteips: String(g.remoteips || g.ip_addr || ""),
          prefix: String(g.prefix || ""),
          capacity: Number(g.capacity || g.max_calls || 0),
          locktype: Number(g.locktype) ?? 0,
          signalport: Number(g.signalport || g.port || 5060),
          customer_id: Number(g.customer_id || g.clearingCustomerId || 0),
        }));
        setAllGateways(gws);
      }
    } catch { setError("Failed to load gateways"); }
    finally { setLoading(false); }
  };

  const toggleGateway = (gwId: number) => {
    if (selectedIds.includes(gwId)) {
      onChange(selectedIds.filter(id => id !== gwId));
    } else {
      onChange([...selectedIds, gwId]);
    }
  };

  // Available gateways (not assigned to any customer, or assigned to this one)
  const availableGateways = allGateways.filter(g =>
    g.customer_id === 0 || g.customer_id === (customerId || 0)
  );

  const filtered = availableGateways.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.remoteips.toLowerCase().includes(search.toLowerCase()) ||
    g.prefix.toLowerCase().includes(search.toLowerCase())
  );

  const displayGateways = showAll ? filtered : filtered.slice(0, 8);

  const selectedCount = selectedIds.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-surface-400">
          Select Gateways {selectedCount > 0 && <span className="text-brand-400">({selectedCount} selected)</span>}
        </label>
        <button
          type="button"
          onClick={fetchGateways}
          className="p-1 rounded hover:bg-surface-700 text-surface-500 hover:text-surface-300"
          title="Refresh gateways"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
        <input
          type="text"
          placeholder="Search gateways..."
          value={search}
          onChange={e => { setSearch(e.target.value); setShowAll(true); }}
          className="w-full pl-8 pr-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-surface-50 text-xs placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-surface-500" />
        </div>
      ) : displayGateways.length === 0 ? (
        <div className="text-center py-4 text-surface-500 text-xs">
          <WifiOff className="w-6 h-6 mx-auto mb-1 text-surface-600" />
          <p>No {gatewayType} gateways available</p>
        </div>
      ) : (
        <>
          {/* Gateway card grid */}
          <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
            {displayGateways.map(gw => {
              const isSelected = selectedIds.includes(gw.id);
              const isAlreadyMine = customerId ? gw.customer_id === customerId : false;
              const isTaken = gw.customer_id !== 0 && gw.customer_id !== (customerId || 0);

              return (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => !isTaken && toggleGateway(gw.id)}
                  disabled={isTaken}
                  className={`
                    flex items-start gap-2 p-3 rounded-xl border text-left transition-all duration-150
                    ${isTaken
                      ? "bg-surface-800/30 border-surface-700/20 opacity-50 cursor-not-allowed"
                      : isSelected
                        ? "bg-brand-600/10 border-brand-500/40 ring-1 ring-brand-500/30"
                        : "bg-surface-800/50 border-surface-700/40 hover:border-surface-600 cursor-pointer"
                    }
                  `}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    isSelected
                      ? "bg-brand-500 border-brand-500"
                      : isTaken
                        ? "border-surface-700 bg-surface-800/50"
                        : "border-surface-600 bg-transparent"
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    {isTaken && <span className="text-[10px] text-surface-500">✕</span>}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {gw.locktype === 0
                        ? <Wifi className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        : <WifiOff className="w-3 h-3 text-red-400 flex-shrink-0" />
                      }
                      <p className="text-xs font-medium text-surface-50 truncate">{gw.name}</p>
                    </div>
                    <p className="text-[10px] text-surface-500 font-mono truncate">{gw.remoteips}:{gw.signalport}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {gw.prefix && <span className="text-[10px] text-surface-500 font-mono">{gw.prefix}</span>}
                      <span className="text-[10px] text-surface-500">Cap: {gw.capacity}</span>
                      {isAlreadyMine && <span className="text-[10px] text-amber-400 font-medium">current</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Show more / less */}
          {filtered.length > 8 && !search && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-surface-500 hover:text-surface-300 transition-colors"
            >
              <PlusCircle className="w-3 h-3" />
              {showAll ? `Show fewer` : `Show all ${filtered.length} gateways`}
            </button>
          )}
        </>
      )}

      {/* Selected count summary */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/5 border border-brand-500/10">
          <Check className="w-3.5 h-3.5 text-brand-400" />
          <p className="text-xs text-brand-300">{selectedCount} gateway{selectedCount > 1 ? "s" : ""} selected</p>
        </div>
      )}
    </div>
  );
}
