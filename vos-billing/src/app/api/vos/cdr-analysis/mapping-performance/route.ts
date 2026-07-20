import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get mapping gateways with their performance stats
    const gateways = await queryVos<any>(
      `SELECT m.id, m.name, m.capacity, m.remoteips, m.locktype, m.priority,
        c.name AS customer_name
      FROM e_gatewaymapping m
      LEFT JOIN e_customer c ON m.customer_id = c.id
      ORDER BY m.name`
    );

    // Get performance aggregates from report tables (may be empty)
    const [perf] = await queryVos<any>(
      `SELECT SUM(callcount) AS total_calls, SUM(callreply) AS answered_calls,
        SUM(callduration) AS total_duration
      FROM e_reportgatewaymappingasracd`
    );

    const totalCalls = Number(perf?.total_calls || 0);
    const answeredCalls = Number(perf?.answered_calls || 0);
    const totalDuration = Number(perf?.total_duration || 0);
    const avgAsr = totalCalls > 0 ? answeredCalls / totalCalls : 0;
    const avgAcd = answeredCalls > 0 ? totalDuration / answeredCalls : 0;

    const [feeData] = await queryVos<any>(
      `SELECT SUM(fee) AS total_revenue, COUNT(*) AS fee_records
      FROM e_reportgatewaymappingfee`
    );

    // Per-gateway performance
    const gwPerf = await queryVos<any>(
      `SELECT gatewayid, SUM(callcount) AS calls, SUM(callduration) AS duration,
        SUM(callreply) AS answered
      FROM e_reportgatewaymappingasracd
      GROUP BY gatewayid`
    );

    const gwPerfMap = new Map();
    (gwPerf as any[]).forEach((r: any) => {
      gwPerfMap.set(r.gatewayid, {
        calls: Number(r.calls) || 0,
        duration: Number(r.duration) || 0,
        answered: Number(r.answered) || 0,
      });
    });

    return NextResponse.json({
      gateways: (gateways as any[]).map((g: any) => {
        const perf = gwPerfMap.get(String(g.id)) || gwPerfMap.get(String(g.name)) || { calls: 0, duration: 0, answered: 0 };
      const gwAsr = perf.calls > 0 ? perf.answered / perf.calls : 0;
      const gwAcd = perf.answered > 0 ? perf.duration / perf.answered : 0;
        return {
          id: g.id,
          name: g.name,
          capacity: g.capacity,
          remoteIps: g.remoteips,
          lockType: g.locktype,
          priority: g.priority,
          customerName: g.customer_name || null,
          totalCalls: perf.calls,
          totalDuration: perf.duration,
          asr: gwAsr,
          acd: gwAcd,
        };
      }),
      summary: {
        totalCalls,
        totalDuration,
        avgAsr,
        avgAcd,
        totalRevenue: Number(feeData?.total_revenue || 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed", gateways: [], summary: {} }, { status: 500 });
  }
}
