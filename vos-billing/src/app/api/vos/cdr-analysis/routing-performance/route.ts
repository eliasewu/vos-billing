import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const gateways = await queryVos<any>(
      `SELECT r.id, r.name, r.capacity, r.remoteips, r.locktype, r.priority,
        c.name AS customer_name
      FROM e_gatewayrouting r
      LEFT JOIN e_customer c ON r.clearingcustomer_id = c.id
      ORDER BY r.name`
    );

    const [perf] = await queryVos<any>(
      `SELECT COALESCE(SUM(callcount),0) AS total_calls, COALESCE(SUM(callreply),0) AS answered_calls,
        COALESCE(SUM(callduration),0) AS total_duration
      FROM e_reportgatewayroutingasracd`
    );

    const totalCalls = Number(perf?.total_calls || 0);
    const answeredCalls = Number(perf?.answered_calls || 0);
    const totalDuration = Number(perf?.total_duration || 0);
    const avgAsr = totalCalls > 0 ? answeredCalls / totalCalls : 0;
    const avgAcd = answeredCalls > 0 ? totalDuration / answeredCalls : 0;

    const [feeData] = await queryVos<any>(
      `SELECT COALESCE(SUM(fee),0) AS total_revenue FROM e_reportgatewayroutingfee`
    );

    const gwPerf = await queryVos<any>(
      `SELECT gatewayid, COALESCE(SUM(callcount),0) AS calls, COALESCE(SUM(callduration),0) AS duration,
        COALESCE(SUM(callreply),0) AS answered
      FROM e_reportgatewayroutingasracd GROUP BY gatewayid`
    );

    const gwPerfMap = new Map<string, { calls: number; duration: number; answered: number }>();
    (gwPerf as any[]).forEach((r: any) => {
      const key = String(r.gatewayid || "");
      const existing = gwPerfMap.get(key) || { calls: 0, duration: 0, answered: 0 };
      existing.calls += Number(r.calls) || 0;
      existing.duration += Number(r.duration) || 0;
      existing.answered += Number(r.answered) || 0;
      gwPerfMap.set(key, existing);
    });

    return NextResponse.json({
      gateways: (gateways as any[]).map((g: any) => {
        const key = String(g.id);
        const perf = gwPerfMap.get(key) || gwPerfMap.get(String(g.name)) || { calls: 0, duration: 0, answered: 0 };
        const gwAsr = perf.calls > 0 ? perf.answered / perf.calls : 0;
        const gwAcd = perf.answered > 0 ? perf.duration / perf.answered : 0;
        return {
          id: g.id, name: g.name, capacity: g.capacity, remoteIps: g.remoteips,
          lockType: g.locktype, priority: g.priority, customerName: g.customer_name || null,
          totalCalls: perf.calls, totalDuration: perf.duration, asr: gwAsr, acd: gwAcd,
        };
      }),
      summary: { totalCalls, totalDuration, avgAsr, avgAcd, totalRevenue: Number(feeData?.total_revenue || 0) },
    });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Failed", gateways: [], summary: {} }, { status: 500 }); }
}
