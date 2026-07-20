"use client";

import { useState } from "react";
import { Plus, Server, X, Wifi, WifiOff } from "lucide-react";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";

interface Gateway {
  id: number;
  accountId: number;
  accountName: string;
  accountType: string;
  name: string;
  gatewayType: string;
  protocol: string;
  ipAddress: string;
  port: number;
  prefix: string | null;
  maxChannels: number;
  enabled: boolean;
  vosGatewayId: string | null;
  syncStatus: string;
  createdAt: Date;
}

interface Account {
  id: number;
  name: string;
  accountType: string;
}

export default function GatewaysClient({
  gateways,
  accounts,
}: {
  gateways: Gateway[];
  accounts: Account[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "mapping" | "routing">("all");
  const [formData, setFormData] = useState({
    accountId: "",
    name: "",
    gatewayType: "mapping" as "mapping" | "routing",
    ipAddress: "",
    port: "5060",
    prefix: "",
    maxChannels: "30",
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await fetch("/api/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          accountId: parseInt(formData.accountId),
          port: parseInt(formData.port),
          maxChannels: parseInt(formData.maxChannels),
        }),
      });
      setShowModal(false);
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    filter === "all"
      ? gateways
      : gateways.filter((g) => g.gatewayType === filter);

  const columns = [
    {
      key: "name",
      label: "Gateway",
      render: (row: Gateway) => (
        <div className="flex items-center gap-2">
          {row.enabled ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <div>
            <div className="font-medium text-surface-50">{row.name}</div>
            <div className="text-xs text-surface-500">{row.accountName}</div>
          </div>
        </div>
      ),
    },
    {
      key: "gatewayType",
      label: "Type",
      render: (row: Gateway) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            row.gatewayType === "mapping"
              ? "bg-blue-500/10 text-blue-400"
              : "bg-purple-500/10 text-purple-400"
          }`}
        >
          {row.gatewayType === "mapping" ? "Mapping (Inbound)" : "Routing (Outbound)"}
        </span>
      ),
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (row: Gateway) => (
        <span className="font-mono text-sm text-surface-300">
          {row.ipAddress}:{row.port}
        </span>
      ),
    },
    {
      key: "protocol",
      label: "Protocol",
      render: (row: Gateway) => (
        <span className="text-surface-300">{row.protocol}</span>
      ),
    },
    {
      key: "prefix",
      label: "Prefix",
      render: (row: Gateway) => (
        <span className="font-mono text-sm text-surface-300">
          {row.prefix || "—"}
        </span>
      ),
    },
    {
      key: "maxChannels",
      label: "Max CH",
      render: (row: Gateway) => (
        <span className="text-surface-300">{row.maxChannels}</span>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      render: (row: Gateway) => (
        <StatusBadge status={row.enabled ? "active" : "disabled"} />
      ),
    },
    {
      key: "syncStatus",
      label: "Sync",
      render: (row: Gateway) => (
        <StatusBadge status={row.syncStatus} variant="dot" />
      ),
    },
    {
      key: "vosGatewayId",
      label: "VOS ID",
      render: (row: Gateway) => (
        <span className="font-mono text-xs text-surface-400">
          {row.vosGatewayId || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Server className="w-6 h-6 text-amber-400" />
            Gateways
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage mapping (inbound) and routing (outbound) gateways
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-surface-50 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Gateway
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-surface-900 p-1 rounded-lg w-fit border border-surface-700/50">
        {(["all", "mapping", "routing"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? "bg-surface-700 text-surface-50"
                : "text-surface-400 hover:text-surface-50"
            }`}
          >
            {f === "all" ? "All" : f === "mapping" ? "Mapping (Inbound)" : "Routing (Outbound)"}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} searchKey="name" pageSize={10} />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-surface-50">Add Gateway</h2>
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
                  Gateway Type *
                </label>
                <select
                  value={formData.gatewayType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gatewayType: e.target.value as "mapping" | "routing",
                    })
                  }
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                >
                  <option value="mapping">Mapping (Inbound - Client)</option>
                  <option value="routing">Routing (Outbound - Supplier)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Account *
                </label>
                <select
                  value={formData.accountId}
                  onChange={(e) =>
                    setFormData({ ...formData, accountId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select account...</option>
                  {accounts
                    .filter(
                      (a) =>
                        (formData.gatewayType === "mapping" &&
                          a.accountType === "client") ||
                        (formData.gatewayType === "routing" &&
                          a.accountType === "supplier")
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Gateway Name *
                </label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  placeholder="e.g., Client-GW1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    IP Address *
                  </label>
                  <input
                    value={formData.ipAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, ipAddress: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                    placeholder="192.168.1.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData({ ...formData, port: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Prefix
                  </label>
                  <input
                    value={formData.prefix}
                    onChange={(e) =>
                      setFormData({ ...formData, prefix: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Max Channels
                  </label>
                  <input
                    type="number"
                    value={formData.maxChannels}
                    onChange={(e) =>
                      setFormData({ ...formData, maxChannels: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  !formData.name || !formData.accountId || !formData.ipAddress || saving
                }
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-surface-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Creating..." : "Create Gateway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
