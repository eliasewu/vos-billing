import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { exec } from "child_process";

interface Notification {
  id: string;
  type: "low_balance" | "low_asr" | "route_offline" | "gateway_offline" | "system_alarm" | "high_fail_rate";
  level: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  link?: string;
}

// Quick ping check — run in parallel with short timeout
async function pingWithTimeout(ip: string, ms: number): Promise<boolean> {
  if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  try {
    const proc = exec(`ping -c 1 -W 1 ${ip}`, { timeout: ms, killSignal: "SIGKILL" });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { proc.kill(); reject(new Error("timeout")); }, ms);
      proc.on("exit", (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`exit ${code}`)); });
      proc.on("error", () => { clearTimeout(timer); reject(new Error("exec error")); });
    });
    return true;
  } catch { return false; }
}

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications: Notification[] = [];
  const now = new Date().toISOString();

  try {
    // 1. Low balance customers
    try {
      const lowBalance = await queryVos<any>(
        `SELECT id, name, account, money, limitmoney FROM e_customer WHERE money < 0 OR money < (limitmoney * 0.1) LIMIT 10`
      );
      for (const c of lowBalance as any[]) {
        const balance = Number(c.money || 0);
        const credit = Number(c.limitmoney || 0);
        notifications.push({
          id: `bal-${c.id}`,
          type: "low_balance",
          level: balance < 0 ? "critical" : "warning",
          title: balance < 0 ? `Negative Balance: ${c.name || c.account}` : `Low Balance: ${c.name || c.account}`,
          message: balance < 0
            ? `Balance is -$${Math.abs(balance).toFixed(2)} — account is in debt`
            : `Balance $${balance.toFixed(2)} is below 10% of credit limit $${credit.toFixed(2)}`,
          timestamp: now,
          link: "/dashboard/accounts/general",
        });
      }
    } catch { /* table may not exist */ }

    // 2. System alarms from e_alarm_current
    try {
      const alarms = await queryVos<any>(
        "SELECT id, name, value, level, type FROM e_alarm_current WHERE status = 0 ORDER BY id DESC LIMIT 10"
      );
      for (const a of alarms as any[]) {
        notifications.push({
          id: `alarm-${a.id}`,
          type: "system_alarm",
          level: Number(a.level) >= 2 ? "critical" : "warning",
          title: `Alarm: ${a.name || "System Alert"}`,
          message: `Value: ${a.value || "N/A"} | Type: ${a.type || "Unknown"}`,
          timestamp: now,
          link: "/dashboard/alarms/system",
        });
      }
    } catch { /* table may not exist */ }

    // 3. Offline gateways — parallel pings with global 2s timeout
    try {
      const [mappingGws, routingGws] = await Promise.all([
        queryVos<any>("SELECT id, name, remoteips FROM e_gatewaymapping WHERE locktype = 0 AND remoteips IS NOT NULL AND remoteips != '' AND remoteips != '0.0.0.0' AND remoteips != '-' LIMIT 5"),
        queryVos<any>("SELECT id, name, remoteips FROM e_gatewayrouting WHERE locktype = 0 AND remoteips IS NOT NULL AND remoteips != '' AND remoteips != '0.0.0.0' AND remoteips != '-' LIMIT 5"),
      ]);

      const allGws = [
        ...(mappingGws as any[]).map((g: any) => ({ ...g, type: "mapping" })),
        ...(routingGws as any[]).map((g: any) => ({ ...g, type: "routing" })),
      ];

      if (allGws.length > 0) {
        const pingResults = await Promise.all(
          allGws.map(async (g) => {
            const firstIp = (g.remoteips || "").split(",")[0].trim();
            if (!firstIp) return null;
            const online = await pingWithTimeout(firstIp, 1500);
            return online ? null : g;
          })
        );

        for (const g of pingResults) {
          if (!g) continue;
          const firstIp = (g.remoteips || "").split(",")[0].trim();
          notifications.push({
            id: `gw-${g.id}`,
            type: "gateway_offline",
            level: "critical",
            title: `Gateway Offline: ${g.name}`,
            message: `${g.type === "mapping" ? "Mapping" : "Routing"} gateway unreachable at ${firstIp}`,
            timestamp: now,
            link: "/dashboard/operation/gateways/routing",
          });
        }
      }
    } catch { /* table may not exist */ }

    // 4. ASR, ACD, and fail rate checks from CDR partitions
    try {
      const today = new Date();
      const partition = `e_cdr_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
      try {
        const [row] = await queryVos<any>(
          `SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN callstatus = 1 OR callstatus = 'answered' OR endreason IS NULL OR endreason = 0 OR endreason = '' THEN 1 ELSE 0 END) AS success,
            COALESCE(AVG(CASE WHEN callstatus = 1 OR callstatus = 'answered' OR endreason IS NULL OR endreason = 0 OR endreason = '' THEN callduration ELSE NULL END), 0) AS avg_duration
          FROM ${partition}`
        ) as any[];
        if (row) {
          const total = Number(row.total || 0);
          const success = Number(row.success || 0);
          const avgDuration = Math.round(Number(row.avg_duration || 0));
          const asr = total > 0 ? (success / total) * 100 : 100;

          // Low ASR check
          if (total > 10 && asr < 50) {
            notifications.push({
              id: "asr-today",
              type: "low_asr",
              level: asr < 30 ? "critical" : "warning",
              title: `Low ASR: ${asr.toFixed(1)}%`,
              message: `Today: ${success} answered / ${total} calls. Low answer-seizure ratio detected.`,
              timestamp: now,
              link: "/dashboard/operation/call-performance",
            });
          }

          // Low ACD (Average Call Duration) check
          if (success > 10 && avgDuration > 0 && avgDuration < 30) {
            notifications.push({
              id: "acd-today",
              type: "high_fail_rate",
              level: avgDuration < 15 ? "critical" : "warning",
              title: `Low ACD: ${avgDuration}s avg duration`,
              message: `Average call duration for ${success} successful calls is only ${avgDuration}s — unusually short. Check for call drops or one-way audio.`,
              timestamp: now,
              link: "/dashboard/operation/call-performance",
            });
          }

          // High fail rate
          const failRate = total > 0 ? ((total - success) / total) * 100 : 0;
          if (total > 10 && failRate > 40) {
            notifications.push({
              id: "fail-today",
              type: "high_fail_rate",
              level: failRate > 60 ? "critical" : "warning",
              title: `High Fail Rate: ${failRate.toFixed(1)}%`,
              message: `${total - success} failed out of ${total} total calls today.`,
              timestamp: now,
              link: "/dashboard/operation/call-performance",
            });
          }
        }
      } catch { /* partition may not exist */ }
    } catch { /* CDR check failed */ }

    // 5. Check for offline routes (gateways with locktype != 0)
    try {
      const lockedRoutes = await queryVos<any>(
        "SELECT id, name, locktype FROM e_gatewayrouting WHERE locktype != 0 LIMIT 5"
      );
      for (const r of lockedRoutes as any[]) {
        notifications.push({
          id: `route-${r.id}`,
          type: "route_offline",
          level: "warning",
          title: `Route Locked: ${r.name}`,
          message: `Routing gateway is locked (status: ${r.locktype}). Calls may not route through this gateway.`,
          timestamp: now,
          link: "/dashboard/operation/gateways/routing",
        });
      }
    } catch { /* table may not exist */ }

    // Sort by level (critical first) then by timestamp
    notifications.sort((a, b) => {
      const levelOrder = { critical: 0, warning: 1, info: 2 };
      return (levelOrder[a.level] ?? 2) - (levelOrder[b.level] ?? 2);
    });

    return NextResponse.json({
      notifications: notifications.slice(0, 15),
      count: notifications.length,
      criticalCount: notifications.filter(n => n.level === "critical").length,
      warningCount: notifications.filter(n => n.level === "warning").length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, notifications: [], count: 0 }, { status: 500 });
  }
}
