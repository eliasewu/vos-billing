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
  X,
  Mail,
} from "lucide-react";
import { useState, useEffect } from "react";

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

const TOP_LEVEL_SECTIONS = new Set([
  "Rate Management", "Package Management", "Account Management",
  "Operation Management", "CDR Analysis", "Data Query",
  "Data Reporting", "Cards Management", "Alarm Management", "System Management"
]);

// Map URL path prefixes to the top-level section that should be expanded
const PATH_TO_SECTION: [string, string][] = [
  ["/dashboard/rates", "Rate Management"],
  ["/dashboard/packages", "Package Management"],
  ["/dashboard/accounts", "Account Management"],
  ["/dashboard/clearing", "Account Management"],
  ["/dashboard/operation", "Operation Management"],
  ["/dashboard/cdr", "CDR Analysis"],
  ["/dashboard/data-query", "Data Query"],
  ["/dashboard/reports", "Data Reporting"],
  ["/dashboard/cards", "Cards Management"],
  ["/dashboard/alarms", "Alarm Management"],
  ["/dashboard/system", "System Management"],
];

function getExpandedSection(pathname: string): string | null {
  for (const [prefix, section] of PATH_TO_SECTION) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?")) {
      return section;
    }
  }
  return null;
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
      { href: "/dashboard/rates/wizard", label: "Rate Wizard", icon: Zap },
      { href: "/dashboard/rates/quick-start", label: "Quick Start Wizard", icon: Zap },
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
      { href: "/dashboard/accounts/invoice", label: "Invoice Generator", icon: Receipt },
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
      { href: "/dashboard/system/routes", label: "Route Management", icon: Route },
      { href: "/dashboard/operation/gateways/mapping", label: "Mapping Gateway", icon: GitBranch },
    ],
  },

  // CDR Analysis (expandable)
  {
    label: "CDR Analysis",
    icon: BarChart3,
    children: [
      {
        label: "Mapping Gateway",
        icon: GitBranch,
        children: [
          { href: "/dashboard/cdr-analysis/mapping-performance", label: "Performance", icon: TrendingUp },
          { href: "/dashboard/cdr-analysis/mapping-call-analysis", label: "Call Analysis", icon: Phone },
          { href: "/dashboard/cdr-analysis/mapping-fail-analysis", label: "Fail Analysis", icon: X },
          { href: "/dashboard/cdr-analysis/mapping-call-daily", label: "Call Daily", icon: Calendar },
          { href: "/dashboard/cdr-analysis/mapping-area-analysis", label: "Area Analysis", icon: Network },
          { href: "/dashboard/cdr-analysis/mapping-cross-analysis", label: "Cross Analysis", icon: GitBranch },
        ],
      },
      {
        label: "Routing Gateway",
        icon: ArrowLeftRight,
        children: [
          { href: "/dashboard/cdr-analysis/routing-performance", label: "Performance", icon: TrendingUp },
          { href: "/dashboard/cdr-analysis/routing-call-analysis", label: "Call Analysis", icon: Phone },
          { href: "/dashboard/cdr-analysis/routing-fail-analysis", label: "Fail Analysis", icon: X },
          { href: "/dashboard/cdr-analysis/routing-call-daily", label: "Call Daily", icon: Calendar },
          { href: "/dashboard/cdr-analysis/routing-area-analysis", label: "Area Analysis", icon: Network },
          { href: "/dashboard/cdr-analysis/routing-cross-analysis", label: "Cross Analysis", icon: GitBranch },
        ],
      },
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
      { href: "/dashboard/system/smtp", label: "SMTP Configuration", icon: Mail },
      { href: "/dashboard/system/prefixes", label: "Prefix Database", icon: Hash },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const section = getExpandedSection(pathname);
    return new Set(section ? [section] : []);
  });

  // Auto-expand the section containing current page when navigating
  useEffect(() => {
    const section = getExpandedSection(pathname);
    if (!section) return;
    setExpandedSections(prev => {
      // Skip if already correct (avoids redundant re-render on initial mount)
      if (prev.has(section) && [...prev].every(s => !TOP_LEVEL_SECTIONS.has(s) || s === section)) {
        return prev;
      }
      const next = new Set(prev);
      // Only close other top-level sections (accordion behavior)
      for (const topLabel of TOP_LEVEL_SECTIONS) {
        if (topLabel !== section) next.delete(topLabel);
      }
      next.add(section);
      return next;
    });
  }, [pathname]);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      
      if (next.has(label)) {
        // Close this section
        next.delete(label);
      } else {
        // If it's a top-level section, close all other top-level sections (accordion)
        if (TOP_LEVEL_SECTIONS.has(label)) {
          for (const topLabel of TOP_LEVEL_SECTIONS) {
            next.delete(topLabel);
          }
        }
        next.add(label);
      }
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
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={!active}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active
            ? "bg-white/20 text-white font-bold"
            : "text-white/70 hover:bg-white/10 hover:text-white font-bold"
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
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-bold text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
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
      } bg-gradient-to-b from-blue-600 to-blue-900 border-r border-brand-500 flex flex-col transition-all duration-300 ease-in-out min-h-screen sticky top-0`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-brand-500">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <div className="font-bold text-sm text-white">Net2App</div>
              <div className="text-[10px] text-white/60">VOS Billing</div>
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
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
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
                    className="flex items-center justify-center px-3 py-2 rounded-lg text-white/70"
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
      <div className="border-t border-brand-500 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm font-bold"
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
