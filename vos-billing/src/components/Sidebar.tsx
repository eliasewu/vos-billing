"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  Layers,
  Package,
  Clock,
  Calendar,
  Building2,
  Users,
  Wallet,
  UserCog,
  FileText,
  Key,
  Hash,
  Server,
  ArrowLeftRight,
  GitBranch,
  Network,
  Phone,
  TrendingUp,
  Activity,
  BarChart3,
  Database,
  Search,
  Receipt,
  LogIn,
  ClipboardList,
  PieChart,
  CalendarDays,
  UserCheck,
  CreditCard,
  Radio,
  Bell,
  Settings,
  SlidersHorizontal,
  Route,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  Shield,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: (NavItem | NavSection)[];
}

type MenuItem = NavItem | NavSection;

function isNavSection(item: MenuItem): item is NavSection {
  return "children" in item && !("href" in item);
}

const menuSections: MenuItem[] = [
  // Dashboard
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },

  // Rate Management (expandable)
  {
    label: "Rate Management",
    icon: DollarSign,
    children: [
      { href: "/dashboard/rates/groups", label: "Rate Group Management", icon: Layers },
      { href: "/dashboard/rates", label: "Rate Management", icon: DollarSign },
    ],
  },

  // Package Management (expandable)
  {
    label: "Package Management",
    icon: Package,
    children: [
      { href: "/dashboard/packages/groups", label: "Package Group Management", icon: Layers },
      { href: "/dashboard/packages/free-duration", label: "Package Free Duration", icon: Clock },
      { href: "/dashboard/packages/period-rate", label: "Package Period Rate", icon: Calendar },
    ],
  },

  // Account Management (expandable)
  {
    label: "Account Management",
    icon: Building2,
    children: [
      { href: "/dashboard/accounts/general", label: "General Account", icon: Users },
      { href: "/dashboard/accounts/payment", label: "Payment", icon: Wallet },
      { href: "/dashboard/accounts/agent", label: "Agent Account", icon: UserCog },
      { href: "/dashboard/accounts/billing", label: "Billing", icon: FileText },
      { href: "/dashboard/clearing", label: "Clearing Account", icon: Shield },
      { href: "/dashboard/accounts/auth", label: "Authorization Mgmt", icon: Key },
      { href: "/dashboard/accounts/number-limit", label: "Number Section Limit", icon: Hash },
    ],
  },

  // Operation Management (expandable)
  {
    label: "Operation Management",
    icon: Radio,
    children: [
      {
        label: "Gateway Operation",
        icon: Server,
        children: [
          { href: "/dashboard/operation/gateways/routing", label: "Routing Gateway", icon: ArrowLeftRight },
          { href: "/dashboard/operation/gateways/mapping", label: "Mapping Gateway", icon: GitBranch },
          { href: "/dashboard/operation/gateways/group", label: "Gateway Group", icon: Network },
          { href: "/dashboard/operation/ip-whitelist", label: "IP Whitelist Firewall", icon: Shield },
        ],
      },
      { href: "/dashboard/operation/phone", label: "Phone Operation", icon: Phone },
      { href: "/dashboard/operation/business-analysis", label: "Business Analysis", icon: TrendingUp },
      { href: "/dashboard/operation/current-call", label: "Current Call", icon: Activity },
      { href: "/dashboard/operation/call-performance", label: "Call Performance", icon: BarChart3 },
    ],
  },

  // Data Query (expandable)
  {
    label: "Data Query",
    icon: Database,
    children: [
      { href: "/dashboard/data-query/cdr", label: "CDR Query", icon: Search },
      { href: "/dashboard/data-query/payment", label: "Payment Query", icon: Receipt },
      { href: "/dashboard/data-query/login", label: "Login Query", icon: LogIn },
      { href: "/dashboard/data-query/operation", label: "Operation Query", icon: ClipboardList },
    ],
  },

  // Data Reporting (expandable)
  {
    label: "Data Reporting",
    icon: PieChart,
    children: [
      { href: "/dashboard/reports/daily", label: "Daily Report", icon: Calendar },
      { href: "/dashboard/reports/monthly", label: "Monthly Report", icon: CalendarDays },
      { href: "/dashboard/reports/agent", label: "Agent Report", icon: UserCheck },
      { href: "/dashboard/accounts/billing/reports", label: "Billing Reports", icon: FileText },
      { href: "/dashboard/clearing/reports", label: "Clearing Reports", icon: Shield },
    ],
  },

  // Cards Management (expandable)
  {
    label: "Cards Management",
    icon: CreditCard,
    children: [
      { href: "/dashboard/cards/suite", label: "Suite Management", icon: Layers },
      { href: "/dashboard/cards/management", label: "Cards Management", icon: CreditCard },
      { href: "/dashboard/cards/active", label: "Active Management", icon: Radio },
    ],
  },

  // Alarm Management (expandable)
  {
    label: "Alarm Management",
    icon: Bell,
    children: [
      { href: "/dashboard/alarms/system", label: "System Alarm", icon: Bell },
    ],
  },

  // System Management (expandable)
  {
    label: "System Management",
    icon: Settings,
    children: [
      { href: "/dashboard/system/parameters", label: "System Parameters", icon: SlidersHorizontal },
      { href: "/dashboard/system/users", label: "User Management", icon: Users },
      { href: "/dashboard/system/routes", label: "Route Management", icon: Route },
      { href: "/dashboard/system/numbers", label: "Number Management", icon: Hash },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["Rate Management", "Package Management", "Account Management", "Operation Management", "Gateway Operation", "Data Query", "Data Reporting", "Cards Management", "Alarm Management", "System Management"])
  );

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (href: string) => {
    const [base, query] = href.split("?");
    if (query) {
      const params = new URLSearchParams(query);
      const typeMatch = params.get("type") === searchParams.get("type");
      return pathname === base && typeMatch;
    }
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?");
  };

  const renderItem = (item: NavItem, depth = 0) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive(item.href)
            ? "bg-brand-600/20 text-brand-400"
            : "text-surface-400 hover:bg-surface-800 hover:text-surface-50"
        }`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span className="truncate text-xs">{item.label}</span>}
      </Link>
    );
  };

  const renderChildren = (children: (NavItem | NavSection)[], depth: number) => {
    return children.map((child) => {
      if (isNavSection(child)) {
        const section = child as NavSection;
        const SectionIcon = section.icon;
        const isExpanded = expandedSections.has(section.label);
        return (
          <div key={section.label}>
            {!collapsed && (
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-500 hover:bg-surface-800 hover:text-surface-300 transition-colors"
                style={{ paddingLeft: `${12 + depth * 14}px` }}
              >
                <SectionIcon className="w-[14px] h-[14px] flex-shrink-0" />
                <span className="truncate flex-1 text-left">{section.label}</span>
                <ChevronDown
                  className={`w-3 h-3 flex-shrink-0 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
            {isExpanded && (
              <div className="mt-0.5">
                {renderChildren(section.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }
      return renderItem(child as NavItem, depth);
    });
  };

  return (
    <aside
      className={`${
        collapsed ? "w-[68px]" : "w-[250px]"
      } bg-surface-900 border-r border-surface-800 flex flex-col transition-all duration-200 min-h-screen sticky top-0`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-surface-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-surface-50" />
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <div className="font-bold text-sm text-surface-50">Net2App</div>
              <div className="text-[10px] text-surface-500">VOS Billing</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {menuSections.map((item) => {
          if (isNavSection(item)) {
            const section = item as NavSection;
            const SecIcon = section.icon;
            const isExpanded = expandedSections.has(section.label);
            return (
              <div key={section.label}>
                {!collapsed ? (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-surface-400 hover:bg-surface-800 hover:text-surface-50 transition-colors"
                  >
                    <SecIcon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className="truncate flex-1 text-left">{section.label}</span>
                    <ChevronDown
                      className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                ) : (
                  <div
                    className="flex items-center justify-center px-3 py-2 rounded-lg text-surface-400"
                    title={section.label}
                  >
                    <SecIcon className="w-[18px] h-[18px] flex-shrink-0" />
                  </div>
                )}
                {isExpanded && renderChildren(section.children, 1)}
              </div>
            );
          }
          return renderItem(item as NavItem);
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-surface-800 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:bg-surface-800 hover:text-surface-50 transition-colors text-sm"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
