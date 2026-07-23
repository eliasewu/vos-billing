"use client";

import type { ReactNode } from "react";
import { Edit2, Trash2, Loader2 } from "lucide-react";

// ---------- Money formatting ----------

/** Renders a monetary value with emerald (≥0) or red (<0) coloring */
export function moneyRender<T>(
  getValue: (row: T) => number,
  digits = 4
): (row: T) => ReactNode {
  return (row) => {
    const v = getValue(row);
    const abs = Math.abs(v);
    const s = abs.toFixed(digits);
    const display = v < 0 ? `-$${s}` : `$${s}`;
    return (
      <span className={`font-mono text-sm ${v < 0 ? "text-red-400" : "text-emerald-400"}`}>
        {display}
      </span>
    );
  };
}

// ---------- Action buttons ----------

/** Renders Edit + Delete icon buttons */
export function actionsRender<T>(
  onEdit: (row: T) => void,
  onDelete: (row: T) => void
): (row: T) => ReactNode {
  return (row) => (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onEdit(row)}
        className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDelete(row)}
        className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Renders a single delete button */
export function deleteRender<T>(
  onDelete: (row: T) => void
): (row: T) => ReactNode {
  return (row) => (
    <button
      onClick={() => onDelete(row)}
      className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

// ---------- Status toggle ----------

export interface StatusToggleOptions<T> {
  getId: (row: T) => number;
  getStatus: (row: T) => number;
  onToggle: (id: number, currentStatus: number) => void;
  togglingIds: Set<number>;
  /** Which status value is considered "active" (default: 0) */
  activeValue?: number;
  /** Which status value is considered "locked"/disabled (cannot toggle) */
  lockedValue?: number;
  /** Labels: map status number → display text. Default: { [activeValue]: "Active", ... "Inactive" } */
  labels?: Record<number, string>;
  /** Extra tooltip translations */
  titles?: { activate?: string; deactivate?: string; locked?: string };
  /** Show a colored dot indicator before text */
  showDot?: boolean;
}

/** Renders a clickable status badge with toggle + loading spinner */
export function statusToggleRender<T>(
  opts: StatusToggleOptions<T>
): (row: T) => ReactNode {
  const {
    getId, getStatus, onToggle, togglingIds,
    activeValue = 0,
    lockedValue,
    labels,
    titles,
    showDot = true,
  } = opts;

  const defaultLabels: Record<number, string> = { [activeValue]: "Active" };
  const lbl = labels ?? defaultLabels;

  return (row) => {
    const id = getId(row);
    const status = getStatus(row);
    const isLocked = lockedValue !== undefined && status === lockedValue;
    const isActive = status === activeValue;
    const isToggling = togglingIds.has(id);

    const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all";
    const activeClass = isLocked
      ? "bg-red-500/10 text-red-400 cursor-not-allowed"
      : isActive
        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
        : "bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer";

    const title = isLocked
      ? titles?.locked ?? "Cannot toggle"
      : isActive
        ? titles?.deactivate ?? "Click to deactivate"
        : titles?.activate ?? "Click to activate";

    return (
      <button
        onClick={() => onToggle(id, status)}
        disabled={isToggling || isLocked}
        title={title}
        className={`${base} ${activeClass}`}
      >
        {isToggling ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : showDot ? (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLocked
                ? "bg-red-400"
                : isActive
                  ? "bg-emerald-400"
                  : "bg-surface-500"
            }`}
          />
        ) : null}
        {lbl[status] ?? `Status ${status}`}
      </button>
    );
  };
}

// ---------- Type / level badge ----------

/** Renders a colored badge based on a value → label + color map */
export function badgeRender<T>(
  getValue: (row: T) => number,
  labels: Record<number, string>,
  colors: Record<number, string> = {}
): (row: T) => ReactNode {
  const defaultColors: Record<number, string> = {
    0: "bg-blue-500/10 text-blue-400",
    1: "bg-amber-500/10 text-amber-400",
    2: "bg-violet-500/10 text-violet-400",
    3: "bg-cyan-500/10 text-cyan-400",
  };

  return (row) => {
    const v = getValue(row);
    const color = colors[v] ?? defaultColors[v] ?? "bg-surface-800 text-surface-400";
    const label = labels[v] ?? `Type ${v}`;
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };
}
