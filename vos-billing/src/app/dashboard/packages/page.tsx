"use client";
import { Package, Layers, Clock, Calendar } from "lucide-react";
import Link from "next/link";

export default function PackagesPage() {
  const items = [
    { href: "/dashboard/packages/groups", icon: Layers, label: "Package Groups", desc: "Create and manage calling package groups" },
    { href: "/dashboard/packages/free-duration", icon: Clock, label: "Free Duration", desc: "Configure free call duration per package" },
    { href: "/dashboard/packages/period-rate", icon: Calendar, label: "Period Rate", desc: "Set billing rates per period" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
          <Package className="w-6 h-6 text-amber-400" />
          Package Management
        </h1>
        <p className="text-surface-400 text-sm mt-1">Billing packages and service bundles</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(item => (
          <Link key={item.href} href={item.href}
            className="bg-surface-900 border border-surface-700/50 rounded-xl p-6 hover:border-brand-500/30 hover:bg-surface-800/50 transition-all duration-200 group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <item.icon className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-surface-50 font-semibold mb-1">{item.label}</h3>
            <p className="text-surface-400 text-sm">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
