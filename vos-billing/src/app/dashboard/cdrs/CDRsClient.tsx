"use client";

import { useState } from "react";
import { Phone, Filter } from "lucide-react";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";

interface CDR {
  id: number;
  callId: string;
  callerNumber: string;
  calledNumber: string;
  clientAccountId: number | null;
  clientName: string | null;
  supplierAccountId: number | null;
  supplierName: string | null;
  startTime: Date;
  duration: number;
  billedDuration: number;
  status: string;
  sipCode: number | null;
  clientRate: string;
  clientCost: string;
  supplierRate: string;
  supplierCost: string;
  margin: string;
  prefix: string | null;
  destination: string | null;
}

export default function CDRsClient({ cdrs }: { cdrs: CDR[] }) {
  const [view, setView] = useState<"admin" | "client" | "supplier">("admin");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered =
    statusFilter === "all"
      ? cdrs
      : cdrs.filter((c) => c.status === statusFilter);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const adminColumns = [
    {
      key: "callId",
      label: "Call ID",
      render: (row: CDR) => (
        <span className="font-mono text-xs text-surface-400">{row.callId}</span>
      ),
    },
    {
      key: "startTime",
      label: "Time",
      render: (row: CDR) => (
        <span className="text-xs text-surface-300">{formatTime(row.startTime)}</span>
      ),
    },
    {
      key: "callerNumber",
      label: "Caller",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-surface-50">{row.callerNumber}</span>
      ),
    },
    {
      key: "calledNumber",
      label: "Called",
      render: (row: CDR) => (
        <div>
          <div className="font-mono text-sm text-surface-50">{row.calledNumber}</div>
          <div className="text-xs text-surface-500">{row.destination}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: CDR) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          <span className="text-xs text-surface-500">{row.sipCode}</span>
        </div>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-surface-300">
          {row.duration > 0 ? formatDuration(row.duration) : "—"}
        </span>
      ),
    },
    {
      key: "clientName",
      label: "Client",
      render: (row: CDR) => (
        <span className="text-sm text-blue-400">{row.clientName || "—"}</span>
      ),
    },
    {
      key: "supplierName",
      label: "Supplier",
      render: (row: CDR) => (
        <span className="text-sm text-purple-400">
          {row.supplierName || "—"}
        </span>
      ),
    },
    {
      key: "clientCost",
      label: "Revenue",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-emerald-400">
          ${(Number(row.clientCost)||0)}
        </span>
      ),
    },
    {
      key: "supplierCost",
      label: "Cost",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-red-400">
          ${(Number(row.supplierCost)||0)}
        </span>
      ),
    },
    {
      key: "margin",
      label: "Margin",
      render: (row: CDR) => {
        const m = parseFloat(row.margin);
        return (
          <span
            className={`font-mono text-sm font-medium ${
              m >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            ${m}
          </span>
        );
      },
    },
  ];

  const clientColumns = [
    {
      key: "callId",
      label: "Call ID",
      render: (row: CDR) => (
        <span className="font-mono text-xs text-surface-400">{row.callId}</span>
      ),
    },
    {
      key: "startTime",
      label: "Time",
      render: (row: CDR) => (
        <span className="text-xs text-surface-300">{formatTime(row.startTime)}</span>
      ),
    },
    {
      key: "callerNumber",
      label: "Caller",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-surface-50">{row.callerNumber}</span>
      ),
    },
    {
      key: "calledNumber",
      label: "Called",
      render: (row: CDR) => (
        <div>
          <div className="font-mono text-sm text-surface-50">{row.calledNumber}</div>
          <div className="text-xs text-surface-500">{row.destination}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: CDR) => <StatusBadge status={row.status} />,
    },
    {
      key: "duration",
      label: "Duration",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-surface-300">
          {row.duration > 0 ? formatDuration(row.duration) : "—"}
        </span>
      ),
    },
    {
      key: "clientName",
      label: "Client",
      render: (row: CDR) => (
        <span className="text-sm text-blue-400">{row.clientName || "—"}</span>
      ),
    },
    {
      key: "clientRate",
      label: "Rate/Min",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-surface-300">
          ${(Number(row.clientRate)||0).toFixed(6)}
        </span>
      ),
    },
    {
      key: "clientCost",
      label: "Charge",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-emerald-400 font-medium">
          ${(Number(row.clientCost)||0)}
        </span>
      ),
    },
  ];

  const supplierColumns = [
    {
      key: "callId",
      label: "Call ID",
      render: (row: CDR) => (
        <span className="font-mono text-xs text-surface-400">{row.callId}</span>
      ),
    },
    {
      key: "startTime",
      label: "Time",
      render: (row: CDR) => (
        <span className="text-xs text-surface-300">{formatTime(row.startTime)}</span>
      ),
    },
    {
      key: "calledNumber",
      label: "Called",
      render: (row: CDR) => (
        <div>
          <div className="font-mono text-sm text-surface-50">{row.calledNumber}</div>
          <div className="text-xs text-surface-500">{row.destination}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: CDR) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          <span className="text-xs text-surface-500">{row.sipCode}</span>
        </div>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-surface-300">
          {row.duration > 0 ? formatDuration(row.duration) : "—"}
        </span>
      ),
    },
    {
      key: "supplierName",
      label: "Supplier",
      render: (row: CDR) => (
        <span className="text-sm text-purple-400">{row.supplierName || "—"}</span>
      ),
    },
    {
      key: "supplierRate",
      label: "Rate/Min",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-surface-300">
          ${(Number(row.supplierRate)||0).toFixed(6)}
        </span>
      ),
    },
    {
      key: "supplierCost",
      label: "Cost",
      render: (row: CDR) => (
        <span className="font-mono text-sm text-red-400 font-medium">
          ${(Number(row.supplierCost)||0)}
        </span>
      ),
    },
  ];

  const currentColumns =
    view === "admin"
      ? adminColumns
      : view === "client"
      ? clientColumns
      : supplierColumns;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
          <Phone className="w-6 h-6 text-emerald-400" />
          CDR Records
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Call Detail Records — View as Admin, Client, or Supplier perspective
        </p>
      </div>

      {/* View Tabs & Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-surface-900 p-1 rounded-lg border border-surface-700/50">
          {(["admin", "client", "supplier"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                view === v
                  ? "bg-surface-700 text-surface-50"
                  : "text-surface-400 hover:text-surface-50"
              }`}
            >
              {v} View
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-surface-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-surface-900 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Status</option>
            <option value="answered">Answered</option>
            <option value="failed">Failed</option>
            <option value="busy">Busy</option>
            <option value="no_answer">No Answer</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-surface-500">
          {filtered.length} records
        </div>
      </div>

      <DataTable
        columns={currentColumns}
        data={filtered}
        searchKey="calledNumber"
        pageSize={15}
      />
    </div>
  );
}
