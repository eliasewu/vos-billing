"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Server,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

interface Gateway {
  id: number;
  gateway_name: string;
  gateway_type: number;
  ip_addr: string;
  port: number;
  protocol: number;
  prefix: string;
  max_calls: number;
  status: number;
  customer_id: number;
  create_time: string;
  remark: string;
}

export default function GatewaysPage() {
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type");
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "0" | "1">(
    urlType === "routing" ? "1" : urlType === "mapping" ? "0" : "all"
  );
  const [showModal, setShowModal] = useState(false);
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    gateway_name: "",
    gateway_type: 0,
    ip_addr: "",
    port: 5060,
    protocol: 0,
    prefix: "",
    max_calls: 30,
    status: 1,
    customer_id: 0,
    remark: "",
  });

  const fetchGateways = async () => {
    setLoading(true);
    try {
      const url = urlType === "routing"
        ? "/api/vos/gateways?type=routing"
        : urlType === "mapping"
        ? "/api/vos/gateways?type=mapping"
        : "/api/vos/gateways";
      const res = await fetch(url);
      const data = await res.json();
      setGateways(data.gateways || []);
      if (data.error) setError(data.error);
    } catch {
      setError("Failed to fetch gateways");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingGateway
        ? `/api/vos/gateways/${editingGateway.id}`
        : "/api/vos/gateways";
      const method = editingGateway ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setShowModal(false);
        setEditingGateway(null);
        fetchGateways();
      }
    } catch {
      setError("Failed to save gateway");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this gateway?")) return;

    try {
      const res = await fetch(`/api/vos/gateways/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        fetchGateways();
      }
    } catch {
      setError("Failed to delete gateway");
    }
  };

  const openEdit = (gw: Gateway) => {
    setEditingGateway(gw);
    setForm({
      gateway_name: gw.gateway_name,
      gateway_type: gw.gateway_type,
      ip_addr: gw.ip_addr,
      port: gw.port,
      protocol: gw.protocol,
      prefix: gw.prefix || "",
      max_calls: gw.max_calls,
      status: gw.status,
      customer_id: gw.customer_id,
      remark: gw.remark || "",
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingGateway(null);
    setForm({
      gateway_name: "",
      gateway_type: 0,
      ip_addr: "",
      port: 5060,
      protocol: 0,
      prefix: "",
      max_calls: 30,
      status: 1,
      customer_id: 0,
      remark: "",
    });
    setShowModal(true);
  };

  const filtered = gateways.filter((g) => {
    const matchesSearch = g.gateway_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType =
      typeFilter === "all" || g.gateway_type === parseInt(typeFilter);
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Server className="w-6 h-6 text-purple-400" />
            Gateways
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage Mapping & Routing Gateways
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchGateways}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-surface-50 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Gateway
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gateways..."
            className="w-full pl-10 pr-4 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | "0" | "1")}
          className="px-4 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="0">Mapping (Inbound)</option>
          <option value="1">Routing (Outbound)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-800/50 border-b border-surface-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Protocol
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Prefix
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Max Calls
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-surface-500">
                    No gateways found
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-surface-800/30">
                    <td className="px-4 py-3 font-mono text-surface-400">
                      {g.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {g.status === 1 ? (
                          <Wifi className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-surface-50 font-medium">
                          {g.gateway_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          g.gateway_type === 0
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-purple-500/10 text-purple-400"
                        }`}
                      >
                        {g.gateway_type === 0 ? "Mapping" : "Routing"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-300">
                      {g.ip_addr}:{g.port}
                    </td>
                    <td className="px-4 py-3 text-surface-300">
                      {g.protocol === 0 ? "SIP" : "H.323"}
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-300">
                      {g.prefix || "-"}
                    </td>
                    <td className="px-4 py-3 text-surface-300">
                      {g.max_calls}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          g.status === 1
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {g.status === 1 ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(g)}
                          className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-surface-50">
                {editingGateway ? "Edit Gateway" : "Add Gateway"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-surface-400 hover:text-surface-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Gateway Name *
                </label>
                <input
                  value={form.gateway_name}
                  onChange={(e) =>
                    setForm({ ...form, gateway_name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Type
                  </label>
                  <select
                    value={form.gateway_type}
                    onChange={(e) =>
                      setForm({ ...form, gateway_type: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
                  >
                    <option value={0}>Mapping (Inbound)</option>
                    <option value={1}>Routing (Outbound)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Protocol
                  </label>
                  <select
                    value={form.protocol}
                    onChange={(e) =>
                      setForm({ ...form, protocol: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
                  >
                    <option value={0}>SIP</option>
                    <option value={1}>H.323</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    IP Address *
                  </label>
                  <input
                    value={form.ip_addr}
                    onChange={(e) =>
                      setForm({ ...form, ip_addr: e.target.value })
                    }
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) =>
                      setForm({ ...form, port: parseInt(e.target.value) || 5060 })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Prefix
                  </label>
                  <input
                    value={form.prefix}
                    onChange={(e) =>
                      setForm({ ...form, prefix: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Max Calls
                  </label>
                  <input
                    type="number"
                    value={form.max_calls}
                    onChange={(e) =>
                      setForm({ ...form, max_calls: parseInt(e.target.value) || 30 })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Customer ID
                  </label>
                  <input
                    type="number"
                    value={form.customer_id}
                    onChange={(e) =>
                      setForm({ ...form, customer_id: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Remark
                </label>
                <textarea
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.gateway_name || !form.ip_addr || saving}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : editingGateway ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
