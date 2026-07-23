import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { execSync } from "child_process";

// Basic IP/CIDR validation
function isValidIpOrCidr(s: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (!ipv4.test(s)) return false;
  const parts = s.split("/")[0].split(".");
  return parts.every(p => { const n = parseInt(p); return n >= 0 && n <= 255; });
}

// Check if iptables is available on the system (cached — runs once)
let _iptablesAvailable: boolean | null = null;
function isIptablesAvailable(): boolean {
  if (_iptablesAvailable !== null) return _iptablesAvailable;
  try {
    execSync("iptables --version 2>/dev/null", { encoding: "utf8" });
    _iptablesAvailable = true;
  } catch {
    _iptablesAvailable = false;
  }
  return _iptablesAvailable;
}

// --------------------------------------------------------------------------
// Custom iptables chain: VOS_SIP_INPUT
// All VOS SIP firewall rules live in a dedicated chain so we never touch
// the main INPUT chain (avoids disrupting system firewall rules).
// --------------------------------------------------------------------------

const VOS_CHAIN = "VOS_SIP_INPUT";

// Ensure the VOS_SIP_INPUT chain exists and the jump rule is in INPUT (cached)
let _chainEnsured = false;
function ensureVosChain(): void {
  if (_chainEnsured || !isIptablesAvailable()) return;
  try {
    // Create chain if it doesn't exist (idempotent via 2>/dev/null)
    execSync(`iptables -N ${VOS_CHAIN} 2>/dev/null`);
  } catch {}
  try {
    // Add jump rule from INPUT to VOS_SIP_INPUT for UDP/5060 (skip if exists)
    execSync(`iptables -C INPUT -p udp --dport 5060 -j ${VOS_CHAIN} -m comment --comment "VOS_jump" 2>/dev/null`);
  } catch {
    try { execSync(`iptables -A INPUT -p udp --dport 5060 -j ${VOS_CHAIN} -m comment --comment "VOS_jump" 2>/dev/null`); } catch {}
  }
  _chainEnsured = true;
}

// Check if the default-deny catch-all DROP exists in VOS_SIP_INPUT
function isDefaultDenyActive(): boolean {
  if (!isIptablesAvailable()) return false;
  try {
    const output = execSync(`iptables -L ${VOS_CHAIN} -n 2>/dev/null | grep "VOS_default_deny"`, { encoding: "utf8" });
    return output.includes("VOS_default_deny");
  } catch {
    return false;
  }
}

// Append catch-all DROP at end of VOS_SIP_INPUT (only whitelisted IPs pass)
function ensureDefaultDeny(): { added: boolean; error?: string } {
  if (isDefaultDenyActive()) return { added: false };
  try {
    ensureVosChain();
    execSync(`iptables -A ${VOS_CHAIN} -j DROP -m comment --comment "VOS_default_deny" 2>/dev/null`);
    return { added: true };
  } catch (err: any) {
    return { added: false, error: err?.message || "iptables failed" };
  }
}

// Remove catch-all DROP from VOS_SIP_INPUT (allow all inbound SIP)
function removeDefaultDeny(): { removed: boolean; error?: string } {
  if (!isDefaultDenyActive()) return { removed: false };
  try {
    execSync(`iptables -D ${VOS_CHAIN} -j DROP -m comment --comment "VOS_default_deny" 2>/dev/null`);
    return { removed: true };
  } catch (err: any) {
    return { removed: false, error: err?.message || "iptables failed" };
  }
}

// Safely add rate_limit_cps column to e_ip_limit if it doesn't exist (cached)
let _rateColumnEnsured = false;
async function ensureRateLimitColumn(): Promise<void> {
  if (_rateColumnEnsured) return;
  try {
    await executeVos("ALTER TABLE e_ip_limit ADD COLUMN rate_limit_cps INT DEFAULT 0");
  } catch { /* column already exists */ }
  _rateColumnEnsured = true;
}

// Remove hashlimit rate-limiting rule for an IP from VOS_SIP_INPUT
function removeRateLimitIptables(ip: string): void {
  const safeName = ip.replace(/\./g, "_");
  try {
    const output = execSync(`iptables -L ${VOS_CHAIN} -n --line-numbers 2>/dev/null | grep "VOS_ratelimit_${safeName}"`, { encoding: "utf8" });
    // Delete by comment — remove all rules with this rate-limit comment
    const lines = output.trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const num = parseInt(line.trim().split(/\s+/)[0]);
      if (num > 0) {
        try { execSync(`iptables -D ${VOS_CHAIN} ${num} 2>/dev/null`); } catch {}
      }
    }
  } catch { /* no rate-limit rules exist */ }
}

// Add ACCEPT rule at top of VOS_SIP_INPUT (before default DROP).
// If rateLimitCps > 0, inserts a hashlimit DROP rule above the ACCEPT
// so that excess packets are dropped before they reach ACCEPT.
function addWhitelistIptables(ip: string, rateLimitCps?: number): void {
  ensureVosChain();
  // Remove conflicting DROP and old rate-limit rules first
  try { execSync(`iptables -D ${VOS_CHAIN} -s ${ip} -j DROP -m comment --comment "VOS_blacklist" 2>/dev/null`); } catch {}
  removeRateLimitIptables(ip);

  const cps = rateLimitCps && rateLimitCps > 0 ? rateLimitCps : 0;

  // Check if ACCEPT already exists
  try {
    execSync(`iptables -C ${VOS_CHAIN} -s ${ip} -j ACCEPT -m comment --comment "VOS_whitelist" 2>/dev/null`);
  } catch {
    try { execSync(`iptables -I ${VOS_CHAIN} 1 -s ${ip} -j ACCEPT -m comment --comment "VOS_whitelist" 2>/dev/null`); } catch {}
  }

  // Apply rate limiting via hashlimit (only for whitelisted IPs with CPS > 0)
  if (cps > 0) {
    const safeName = ip.replace(/\./g, "_");
    try {
      // hashlimit DROP: if above {cps}/sec for this src IP, drop the packet
      // Inserted at position 1 so it's evaluated BEFORE the ACCEPT rule
      execSync(
        `iptables -I ${VOS_CHAIN} 1 -s ${ip} -m hashlimit ` +
        `--hashlimit-name vos_${safeName} --hashlimit-above ${cps}/sec ` +
        `--hashlimit-mode srcip --hashlimit-srcmask 32 ` +
        `-j DROP -m comment --comment "VOS_ratelimit_${safeName}" 2>/dev/null`
      );
    } catch { /* hashlimit module may not be available */ }
  }
}

// Add DROP rule at top of VOS_SIP_INPUT (before default DROP and any ACCEPTs)
function addBlacklistIptables(ip: string): void {
  ensureVosChain();
  // Remove conflicting ACCEPT first
  try { execSync(`iptables -D ${VOS_CHAIN} -s ${ip} -j ACCEPT -m comment --comment "VOS_whitelist" 2>/dev/null`); } catch {}
  // Check if DROP already exists
  try {
    execSync(`iptables -C ${VOS_CHAIN} -s ${ip} -j DROP -m comment --comment "VOS_blacklist" 2>/dev/null`);
  } catch {
    try { execSync(`iptables -I ${VOS_CHAIN} 1 -s ${ip} -j DROP -m comment --comment "VOS_blacklist" 2>/dev/null`); } catch {}
  }
}

// Remove all VOS_SIP_INPUT rules for a given IP (including rate-limit rules)
function removeIptablesForIp(ip: string): void {
  try { execSync(`iptables -D ${VOS_CHAIN} -s ${ip} -j ACCEPT -m comment --comment "VOS_whitelist" 2>/dev/null`); } catch {}
  try { execSync(`iptables -D ${VOS_CHAIN} -s ${ip} -j DROP -m comment --comment "VOS_blacklist" 2>/dev/null`); } catch {}
  removeRateLimitIptables(ip);
}

// GET: list all whitelisted and blacklisted IPs, and firewall status
export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Check firewall status request
    const firewallStatus = request.nextUrl.searchParams.get("firewall_status");
    if (firewallStatus === "1") {
      const active = isDefaultDenyActive();
      let whitelistCount = 0;
      let blacklistCount = 0;
      try {
        const cnt = await queryVos<any>("SELECT list_type, COUNT(*) as cnt FROM e_ip_limit GROUP BY list_type");
        for (const r of cnt as any[]) {
          if (r.list_type === 0) whitelistCount = r.cnt;
          else if (r.list_type === 1) blacklistCount = r.cnt;
        }
      } catch {}
      return NextResponse.json({ defaultDeny: active, whitelistCount, blacklistCount });
    }

    // Whitelist (type=0) and blacklist (type=1)
    const type = request.nextUrl.searchParams.get("type") || "all";
    let whereClause = "";
    if (type === "whitelist") whereClause = "WHERE list_type = 0";
    else if (type === "blacklist") whereClause = "WHERE list_type = 1";
    
    // Ensure rate_limit_cps column exists
    await ensureRateLimitColumn();

    // Use COALESCE to fallback to account if name is empty, for reliable customer name display
    const rows = await queryVos<any>(`SELECT i.id, i.area, i.customer_id, i.ip, i.count, i.memo, i.list_type,
      COALESCE(i.rate_limit_cps, 0) AS rate_limit_cps,
      COALESCE(NULLIF(c.name,''), c.account, '') AS customer_name
      FROM e_ip_limit i
      LEFT JOIN e_customer c ON i.customer_id = c.id
      ${whereClause} ORDER BY i.list_type ASC, i.id DESC`);
    
    const whitelist: any[] = [];
    const blacklist: any[] = [];
    for (const r of rows as any[]) {
      const entry = { id: r.id, area: r.area, customerId: r.customer_id || 0, customerName: r.customer_name || null, ip: r.ip, count: r.count, memo: r.memo, rateLimitCps: Number(r.rate_limit_cps || 0) };
      if (r.list_type === 1) blacklist.push(entry);
      else whitelist.push(entry);
    }
    
    const iptablesOk = isIptablesAvailable();
    const denyActive = iptablesOk ? isDefaultDenyActive() : false;
    return NextResponse.json({ whitelist, blacklist, defaultDeny: denyActive, iptablesAvailable: iptablesOk });
  } catch { return NextResponse.json({ error: "Failed to fetch IP list" }, { status: 500 }); }
}

// POST: add new IP to whitelist/blacklist, or toggle firewall default deny
export async function POST(request: NextRequest) {
  const loginUser = await verifySession();
  if (!loginUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    
    // Firewall toggle: enable/disable default deny
    if (body.firewall_action) {
      if (body.firewall_action === "enable_deny") {
        const result = ensureDefaultDeny();
        if (result.error) return NextResponse.json({ error: `Failed to enable firewall: ${result.error}` }, { status: 500 });
        return NextResponse.json({ success: true, defaultDeny: true, message: "Firewall enabled — only whitelisted IPs can send traffic on port 5060" });
      }
      if (body.firewall_action === "disable_deny") {
        const result = removeDefaultDeny();
        if (result.error) return NextResponse.json({ error: `Failed to disable firewall: ${result.error}` }, { status: 500 });
        return NextResponse.json({ success: true, defaultDeny: false, message: "Firewall disabled — all IPs can send traffic on port 5060 (blacklist still applies)" });
      }
      return NextResponse.json({ error: "Invalid firewall_action" }, { status: 400 });
    }

    const { ip, area, memo, listType, customerId, rateLimitCps } = body; // listType: 0=whitelist, 1=blacklist
    const type = listType === 1 ? 1 : 0; // default to whitelist
    const custId = customerId || 0;
    const cps = Math.max(0, parseInt(String(rateLimitCps || 0)) || 0);
    
    if (!ip) return NextResponse.json({ error: "IP address is required" }, { status: 400 });
    if (!isValidIpOrCidr(ip)) return NextResponse.json({ error: "Invalid IP address format" }, { status: 400 });

    await ensureRateLimitColumn();

    // Check if IP already exists
    const existing = await queryVos<any>("SELECT ip FROM e_ip_limit WHERE ip = ?", [ip]);
    if ((existing as any[]).length > 0) {
      // Update existing entry's type and rate limit
      await executeVos("UPDATE e_ip_limit SET list_type = ?, memo = ?, area = ?, customer_id = ?, rate_limit_cps = ? WHERE ip = ?", [type, memo || "", area || "", custId, cps, ip]);
      if (type === 0) addWhitelistIptables(ip, cps);
      else addBlacklistIptables(ip);
      return NextResponse.json({ success: true, ip, updated: true });
    }

    await executeVos("INSERT INTO e_ip_limit (area, customer_id, ip, count, memo, list_type, rate_limit_cps) VALUES (?, ?, ?, 0, ?, ?, ?)", [
      area || "", custId, ip, memo || "", type, cps,
    ]);

    // Apply iptables rule
    if (type === 0) {
      addWhitelistIptables(ip, cps);
    } else {
      addBlacklistIptables(ip);
    }

    return NextResponse.json({ success: true, ip, listType: type });
  } catch { return NextResponse.json({ error: "Failed to add IP" }, { status: 500 }); }
}

// PUT: Move IP between whitelist and blacklist
export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { ip, listType } = body;
    if (!ip) return NextResponse.json({ error: "IP is required" }, { status: 400 });
    
    await executeVos("UPDATE e_ip_limit SET list_type = ? WHERE ip = ?", [listType === 1 ? 1 : 0, ip]);
    
    // Update iptables — read current CPS from DB so rate limit survives toggle
    if (listType === 1) {
      addBlacklistIptables(ip);
    } else {
      let cps = 0;
      try {
        const rows = await queryVos<any>("SELECT COALESCE(rate_limit_cps, 0) AS cps FROM e_ip_limit WHERE ip = ?", [ip]);
        cps = Number((rows as any[])[0]?.cps || 0);
      } catch {}
      addWhitelistIptables(ip, cps);
    }

    return NextResponse.json({ success: true, ip, listType });
  } catch { return NextResponse.json({ error: "Failed to update IP" }, { status: 500 }); }
}

// DELETE: remove IP from whitelist/blacklist (auto-adds to blacklist if was in whitelist)
export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ip = request.nextUrl.searchParams.get("ip");
    const autoBlacklist = request.nextUrl.searchParams.get("auto_blacklist") === "1";
    if (!ip) return NextResponse.json({ error: "IP is required" }, { status: 400 });

    // Check current list type
    const existing = await queryVos<any>("SELECT list_type FROM e_ip_limit WHERE ip = ?", [ip]);
    const wasWhitelisted = (existing as any[]).length > 0 && (existing as any[])[0].list_type === 0;

    if (autoBlacklist && wasWhitelisted) {
      // Auto-move to blacklist instead of deleting
      await executeVos("UPDATE e_ip_limit SET list_type = 1, memo = CONCAT(COALESCE(memo,''), ' [auto-blacklisted]') WHERE ip = ?", [ip]);
      addBlacklistIptables(ip);
      return NextResponse.json({ success: true, ip, autoBlacklisted: true });
    }

    await executeVos("DELETE FROM e_ip_limit WHERE ip = ?", [ip]);
    removeIptablesForIp(ip);

    return NextResponse.json({ success: true, ip });
  } catch { return NextResponse.json({ error: "Failed to remove IP" }, { status: 500 }); }
}
