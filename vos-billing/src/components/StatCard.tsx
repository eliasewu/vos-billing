import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "red" | "yellow" | "purple";
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  green: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
  yellow: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div
      className={`bg-surface-900 border ${c.border} rounded-xl p-5 hover:bg-surface-800/50 transition-colors`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-surface-400 text-xs font-medium uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold text-surface-50">{value}</p>
          {subtitle && (
            <p className="text-xs text-surface-400">{subtitle}</p>
          )}
        </div>
        <div className={`${c.bg} p-2.5 rounded-lg`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={`text-xs font-medium ${
              trend.value >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-xs text-surface-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
