"use client";

import { useEffect, useState } from "react";
import { GitBranch, Plus, Edit2, Trash2, X, RefreshCw } from "lucide-react";

interface Route {
  id: number;
  route_name: string;
  gateway_group_id: number;
  prefix: string;
  priority: number;
  status: number;
  create_time: string;
}

interface GatewayGroup {
  id: number;
  group_name: string;
  route_type: number;
  status: number;
}

export default function RoutingPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [groups, setGroups] = useState<GatewayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    route_name: "",
    gateway_group_id: 0,
    prefix: "",
    priority: 0,
    status: 1,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vos/routes");
      const data = await res.json();
      setRoutes(data.routes || []);
      setGroups(data.groups || []);
      if (data.error) setError(data.error);
    } catch {
      setError("Failed to fetch routes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingRoute
        ? `/api/vos/routes/${editingRoute.id}`
        : "/api/vos/routes";
      const method = editingRoute ? "PUT" : "POST";

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
        setEditingRoute(null);
        fetchData();
      }
    } catch {
      setError("Failed to save route");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this route?")) return;

    try {
      const res = await fetch(`/api/vos/routes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        fetchData();
      }
    } catch {
      setError("Failed to delete route");
    }
  };

  const openEdit = (route: Route) => {
    setEditingRoute(route);
    setForm({
      route_name: route.route_name,
      gateway_group_id: route.gateway_group_id,
      prefix: route.prefix || "",
      priority: route.priority,
      status: route.status,
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingRoute(null);
    setForm({
      route_name: "",
      gateway_group_id: groups[0]?.id || 0,
      prefix: "",
      priority: 0,
      status: 1,
    });
    setShowModal(true);
  };

  const getGroupName = (id: number) =>
    groups.find((g) => g.id === id)?.group_name || `Group ${id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-cyan-400" />
            Routing Configuration
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage routing rules and gateway groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-surface-50 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Route
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Gateway Groups */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-surface-50 mb-3">Gateway Groups</h3>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className={`px-3 py-1.5 rounded-lg border text-sm ${
                g.status === 1
                  ? "bg-surface-800 border-surface-700 text-surface-50"
                  : "bg-surface-800/50 border-surface-800 text-surface-500"
              }`}
            >
              <span className="font-mono text-xs text-surface-400 mr-2">
                #{g.id}
              </span>
              {g.group_name}
              <span className="ml-2 text-xs text-surface-500">
                ({g.route_type === 0 ? "Priority" : g.route_type === 1 ? "Round-Robin" : "Weight"})
              </span>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="text-surface-500 text-sm">No gateway groups found</p>
          )}
        </div>
      </div>

      {/* Routes Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-800/50 border-b border-surface-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Route Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Prefix
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Gateway Group
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Priority
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
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : routes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-surface-500">
                    No routes configured
                  </td>
                </tr>
              ) : (
                routes.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-800/30">
                    <td className="px-4 py-3 font-mono text-surface-400">
                      {r.id}
                    </td>
                    <td className="px-4 py-3 text-surface-50 font-medium">
                      {r.route_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-400">
                      {r.prefix || "*"}
                    </td>
                    <td className="px-4 py-3 text-surface-300">
                      {getGroupName(r.gateway_group_id)}
                    </td>
                    <td className="px-4 py-3 text-surface-300">{r.priority}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          r.status === 1
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {r.status === 1 ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
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
          <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-surface-50">
                {editingRoute ? "Edit Route" : "Add Route"}
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
                  Route Name *
                </label>
                <input
                  value={form.route_name}
                  onChange={(e) =>
                    setForm({ ...form, route_name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Prefix
                </label>
                <input
                  value={form.prefix}
                  onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                  placeholder="e.g., 1 for USA"
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Gateway Group
                </label>
                <select
                  value={form.gateway_group_id}
                  onChange={(e) =>
                    setForm({ ...form, gateway_group_id: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
                >
                  <option value={0}>Select group...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
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
                disabled={!form.route_name || saving}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : editingRoute ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
