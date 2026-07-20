"use client";

import { useState } from "react";
import { DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";

interface RateGroup {
  id: number;
  accountId: number;
  accountName: string;
  accountType: string;
  name: string;
  description: string | null;
  effectiveDate: Date;
  syncStatus: string;
  rateCount: number;
}

interface Rate {
  id: number;
  rateGroupId: number;
  prefix: string;
  destination: string;
  ratePerMin: string;
  connectCharge: string;
  minDuration: number;
  increment: number;
  enabled: boolean;
}

export default function RatesClient({
  groups,
  rates,
}: {
  groups: RateGroup[];
  rates: Rate[];
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const rateColumns = [
    {
      key: "prefix",
      label: "Prefix",
      render: (row: Rate) => (
        <span className="font-mono text-sm text-brand-400 font-medium">
          {row.prefix}
        </span>
      ),
    },
    {
      key: "destination",
      label: "Destination",
      render: (row: Rate) => (
        <span className="text-surface-50">{row.destination}</span>
      ),
    },
    {
      key: "ratePerMin",
      label: "Rate/Min",
      render: (row: Rate) => (
        <span className="font-mono text-sm text-emerald-400">
          ${(Number(row.ratePerMin)||0).toFixed(6)}
        </span>
      ),
    },
    {
      key: "connectCharge",
      label: "Connect Fee",
      render: (row: Rate) => (
        <span className="font-mono text-sm text-surface-400">
          ${(Number(row.connectCharge)||0).toFixed(4)}
        </span>
      ),
    },
    {
      key: "minDuration",
      label: "Min Dur",
      render: (row: Rate) => (
        <span className="text-surface-300">{row.minDuration}s</span>
      ),
    },
    {
      key: "increment",
      label: "Increment",
      render: (row: Rate) => (
        <span className="text-surface-300">{row.increment}s</span>
      ),
    },
    {
      key: "enabled",
      label: "Active",
      render: (row: Rate) => (
        <StatusBadge status={row.enabled ? "active" : "disabled"} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-400" />
          Rate Management
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Manage rate groups and prefix-based pricing for clients and suppliers
        </p>
      </div>

      {/* Rate Groups */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isExpanded = expanded === group.id;
          const groupRates = rates.filter((r) => r.rateGroupId === group.id);

          return (
            <div
              key={group.id}
              className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : group.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-surface-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-surface-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-surface-400" />
                  )}
                  <div>
                    <div className="font-medium text-surface-50">{group.name}</div>
                    <div className="text-xs text-surface-500 mt-0.5">
                      {group.accountName} •{" "}
                      <span
                        className={
                          group.accountType === "client"
                            ? "text-blue-400"
                            : "text-purple-400"
                        }
                      >
                        {group.accountType}
                      </span>
                      {group.description && ` • ${group.description}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-surface-400">
                    {group.rateCount} rates
                  </span>
                  <StatusBadge status={group.syncStatus} variant="dot" />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-surface-700/50 p-5">
                  <DataTable
                    columns={rateColumns}
                    data={groupRates}
                    searchKey="destination"
                    pageSize={10}
                    emptyMessage="No rates in this group"
                  />
                </div>
              )}
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-12 text-center">
            <p className="text-surface-500">No rate groups configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
