"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

// Map URL segments to friendly labels
const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  accounts: "Accounts",
  operation: "Operation",
  gateways: "Gateways",
  routing: "Routing Gateway",
  mapping: "Mapping Gateway",
  group: "Gateway Group",
  "ip-whitelist": "IP Whitelist",
  phone: "Phone Operation",
  "business-analysis": "Business Analysis",
  "current-call": "Current Call",
  "call-performance": "Call Performance",
  general: "General Account",
  payment: "Payment",
  agent: "Agent Account",
  billing: "Billing",
  clearing: "Clearing Account",
  auth: "Authorization",
  "number-limit": "Number Limit",
  rates: "Rate Management",
  packages: "Package Management",
  "free-duration": "Free Duration",
  "period-rate": "Period Rate",
  "cdr-analysis": "CDR Analysis",
  "mapping-performance": "Mapping Performance",
  "routing-performance": "Routing Performance",
  "mapping-call-analysis": "Call Analysis",
  "mapping-fail-analysis": "Fail Analysis",
  "mapping-call-daily": "Call Daily",
  "mapping-area-analysis": "Area Analysis",
  "mapping-cross-analysis": "Cross Analysis",
  "routing-call-analysis": "Call Analysis",
  "routing-fail-analysis": "Fail Analysis",
  "routing-call-daily": "Call Daily",
  "routing-area-analysis": "Area Analysis",
  "routing-cross-analysis": "Cross Analysis",
  "data-query": "Data Query",
  cdr: "CDR Query",
  "recent-cdr": "Recent CDR",
  login: "Login Query",
  "bill-query": "Bill Query",
  "revenue-detail": "Revenue Detail",
  "gateway-bill": "Gateway Bill",
  "phone-bill": "Phone Bill",
  "area-detail": "Area Detail",
  "account-area": "Account Area",
  "account-balance": "Account Balance",
  "clearing-query": "Clearing Query",
  "account-detail": "Account Detail",
  "gateway-detail": "Gateway Detail",
  reports: "Reports",
  daily: "Daily Report",
  monthly: "Monthly Report",
  cards: "Cards",
  suite: "Suite Management",
  management: "Cards Management",
  active: "Active Management",
  alarms: "Alarms",
  system: "System Alarm",
  parameters: "Parameters",
  users: "Users",
  routes: "Routes",
  numbers: "Numbers",
  "online-routing": "Online Routing",
  "online-mapping": "Online Mapping",
  "gateway-status": "Gateway Status",
  "active-calls": "Active Calls",
  "active-phone-cards": "Active Phone Cards",
  "phone-card": "Phone Card",
  monitoring: "Monitoring",
  settings: "Settings",
};

function labelFor(segment: string): string {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  // Fallback: capitalize and replace hyphens
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumb() {
  const pathname = usePathname();

  // Skip breadcrumbs on the dashboard home
  if (pathname === "/dashboard") return null;

  const segments = pathname.split("/").filter(Boolean);
  // Skip the "dashboard" prefix for path building but keep in display
  const crumbs: { label: string; href: string; isLast: boolean }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = labelFor(segments[i]);
    crumbs.push({
      label,
      href,
      isLast: i === segments.length - 1,
    });
  }

  return (
    <nav className="px-6 py-2.5 border-b border-brand-500/30 bg-brand-600/80 backdrop-blur-sm flex items-center gap-1.5 text-sm">
      <Link
        href="/dashboard"
        className="text-white/50 hover:text-white transition-colors flex items-center gap-1"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />
          {crumb.isLast ? (
            <span className="text-white font-bold truncate">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-white/50 hover:text-white/80 transition-colors truncate"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
