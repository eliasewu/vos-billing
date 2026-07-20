interface StatusBadgeProps {
  status: string;
  variant?: "default" | "dot";
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  synced: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  answered: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  pending: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  suspended: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  busy: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  disabled: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  no_answer: { bg: "bg-surface-500/10", text: "text-surface-400", dot: "bg-surface-400" },
  cancelled: { bg: "bg-surface-500/10", text: "text-surface-400", dot: "bg-surface-400" },
};

export default function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  const colors = statusColors[status] || statusColors["pending"];

  if (variant === "dot") {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
        <span className={`text-xs font-medium capitalize ${colors.text}`}>{status.replace("_", " ")}</span>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
