import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

// Basic IP/CIDR validation
function isValidIpOrCidr(s: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (!ipv4.test(s)) return false;
  const parts = s.split("/")[0].split(".");
  return parts.every(p => { const n = parseInt(p); return n >= 0 && n <= 255; });
}

// GET: list all whitelisted IPs
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT id, area, ip, count, memo FROM e_ip_limit ORDER BY id DESC");
    return NextResponse.json({
      ips: (rows as any[]).map(r => ({ id: r.id, area: r.area, ip: r.ip, count: r.count, memo: r.memo })),
    });
  } catch { return NextResponse.json({ error: "Failed to fetch IP list" }, { status: 500 }); }
}

// POST: add new IP to whitelist
export async function POST(request: NextRequest) {
  const loginUser = await verifySession();
  if (!loginUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { ip, area, memo } = body;
    if (!ip) return NextResponse.json({ error: "IP address is required" }, { status: 400 });
    if (!isValidIpOrCidr(ip)) return NextResponse.json({ error: "Invalid IP address format" }, { status: 400 });

    // Check if IP already exists
    const existing = await queryVos<any>("SELECT ip FROM e_ip_limit WHERE ip = ?", [ip]);
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: "IP already in whitelist" }, { status: 409 });
    }

    await executeVos("INSERT INTO e_ip_limit (area, ip, count, memo) VALUES (?, ?, 0, ?)", [
      area || "", ip, memo || "",
    ]);

    // Apply iptables rule to allow this IP on SIP port 5060
    try {
      const { execSync } = require("child_process");
      execSync(`iptables -I INPUT -p udp --dport 5060 -s ${ip} -j ACCEPT -m comment --comment "VOS_whitelist" 2>/dev/null`);
    } catch { /* iptables may not be available; IP is still in DB */ }

    return NextResponse.json({ success: true, ip });
  } catch { return NextResponse.json({ error: "Failed to add IP" }, { status: 500 }); }
}

// DELETE: remove IP from whitelist
export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ip = request.nextUrl.searchParams.get("ip");
    if (!ip) return NextResponse.json({ error: "IP is required" }, { status: 400 });

    await executeVos("DELETE FROM e_ip_limit WHERE ip = ?", [ip]);

    // Remove iptables rule for this IP
    try {
      const { execSync } = require("child_process");
      execSync(`iptables -D INPUT -p udp --dport 5060 -s ${ip} -j ACCEPT -m comment --comment "VOS_whitelist" 2>/dev/null`);
    } catch { /* iptables may not be available */ }

    return NextResponse.json({ success: true, ip });
  } catch { return NextResponse.json({ error: "Failed to remove IP" }, { status: 500 }); }
}
