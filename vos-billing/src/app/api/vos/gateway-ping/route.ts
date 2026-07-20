import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface GatewayInfo {
  id: number;
  name: string;
  type: string;
  ips: string;
  port: number;
  capacity: number;
  prefix: string;
  locktype: number;
}

interface GatewayStatus extends GatewayInfo {
  online: boolean;
  responseTime: number | null;
  error: string | null;
  checkedAt: string;
}

async function pingHost(ip: string, timeout = 2): Promise<{ online: boolean; responseTime: number | null }> {
  if (!ip || ip === "-" || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    return { online: false, responseTime: null };
  }
  
  try {
    const start = Date.now();
    await execAsync(`ping -c 1 -W ${timeout} ${ip}`, { timeout: (timeout + 1) * 1000 });
    const responseTime = Date.now() - start;
    return { online: true, responseTime };
  } catch {
    return { online: false, responseTime: null };
  }
}

export async function GET() {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all mapping gateways
    const mappingRows = await queryVos<Record<string, unknown>>(
      `SELECT id, name, remoteips, capacity, locktype FROM e_gatewaymapping ORDER BY id DESC`
    );

    // Fetch all routing gateways
    const routingRows = await queryVos<Record<string, unknown>>(
      `SELECT id, name, remoteips, signalport, capacity, prefix, locktype FROM e_gatewayrouting ORDER BY id DESC`
    );

    // Build gateway list
    const gateways: GatewayInfo[] = [
      ...mappingRows.map((r) => ({
        id: Number(r.id),
        name: String(r.name || ""),
        type: "mapping",
        ips: String(r.remoteips || ""),
        port: 5060,
        capacity: Number(r.capacity) || 0,
        prefix: "",
        locktype: Number(r.locktype) || 0,
      })),
      ...routingRows.map((r) => ({
        id: Number(r.id),
        name: String(r.name || ""),
        type: "routing",
        ips: String(r.remoteips || ""),
        port: Number(r.signalport) || 5060,
        capacity: Number(r.capacity) || 0,
        prefix: String(r.prefix || ""),
        locktype: Number(r.locktype) || 0,
      })),
    ];

    // Ping each gateway (first IP only for multi-IP gateways)
    const results: GatewayStatus[] = await Promise.all(
      gateways.map(async (gw) => {
        const firstIp = gw.ips.split(",")[0].trim();
        const { online, responseTime } = await pingHost(firstIp);
        return {
          ...gw,
          online,
          responseTime,
          error: online ? null : "Unreachable",
          checkedAt: new Date().toISOString(),
        };
      })
    );

    const summary = {
      total: results.length,
      online: results.filter((g) => g.online).length,
      offline: results.filter((g) => !g.online).length,
      locked: results.filter((g) => g.locktype !== 0).length,
    };

    return NextResponse.json({ gateways: results, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Gateway ping error:", message);
    return NextResponse.json({ error: message, gateways: [], summary: { total: 0, online: 0, offline: 0, locked: 0 } }, { status: 500 });
  }
}
