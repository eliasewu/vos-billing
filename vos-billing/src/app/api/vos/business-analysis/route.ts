import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Get date range from query params
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "7");

    // 1. Overall summary from report tables
    const [s] = await queryVos<any>(
      "SELECT COALESCE(SUM(total_calls),0) AS calls, COALESCE(SUM(success_calls),0) AS success, COALESCE(SUM(total_duration),0) AS dur, COALESCE(SUM(total_fee),0) AS fee, COALESCE(SUM(total_cost),0) AS cost, COALESCE(SUM(profit),0) AS profit FROM e_report_daily WHERE report_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)",
      [days]
    ) as any[];

    const totalCalls = Number(s?.calls || 0);
    const successCalls = Number(s?.success || 0);
    const totalDuration = Number(s?.dur || 0);
    const totalFee = Number(s?.fee || 0);
    const totalCost = Number(s?.cost || 0);
    const totalProfit = Number(s?.profit || 0);

    // 2. Per-customer breakdown
    const customers = await queryVos<any>(
      "SELECT rd.customer_id, c.name, COALESCE(SUM(rd.total_calls),0) AS calls, COALESCE(SUM(rd.success_calls),0) AS success, COALESCE(SUM(rd.total_duration),0) AS dur, COALESCE(SUM(rd.total_fee),0) AS fee, COALESCE(SUM(rd.total_cost),0) AS cost, COALESCE(SUM(rd.profit),0) AS profit FROM e_report_daily rd LEFT JOIN e_customer c ON rd.customer_id=c.id WHERE rd.report_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY rd.customer_id ORDER BY calls DESC",
      [days]
    );

    // 3. Daily trends
    const dailyTrends = await queryVos<any>(
      "SELECT report_date, COALESCE(SUM(total_calls),0) AS calls, COALESCE(SUM(success_calls),0) AS success, COALESCE(SUM(total_fee),0) AS fee, COALESCE(SUM(profit),0) AS profit FROM e_report_daily GROUP BY report_date ORDER BY report_date DESC LIMIT ?",
      [days]
    );

    // 4. Try to get CDR data from partitioned tables for gateway analysis
    let gatewayStats: any[] = [];
    try {
      const now = new Date();
      const cdrPattern = `e_cdr_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}%`;
      const partitions = await queryVos<any>(`SHOW TABLES LIKE '${cdrPattern}'`) as any[];
      const tbls = (partitions).map((r: any) => Object.values(r)[0] as string).sort().reverse().slice(0, 3);
      let allCalls: any[] = [];
      for (const tbl of tbls) {
        try {
          const rows = await queryVos<any>(
            `SELECT gatewayname, COUNT(*) AS calls, COALESCE(SUM(callduration),0) AS dur, COALESCE(SUM(CASE WHEN callstatus='answered' OR callstatus='success' THEN 1 ELSE 0 END),0) AS success FROM ${tbl} WHERE gatewayname IS NOT NULL AND gatewayname != '' GROUP BY gatewayname`
          ) as any[];
          allCalls = allCalls.concat(rows);
        } catch {}
      }
      // Aggregate across partitions
      const gwMap = new Map<string, { calls: number; dur: number; success: number }>();
      for (const r of allCalls) {
        const key = r.gatewayname || "Unknown";
        const existing = gwMap.get(key) || { calls: 0, dur: 0, success: 0 };
        existing.calls += Number(r.calls || 0);
        existing.dur += Number(r.dur || 0);
        existing.success += Number(r.success || 0);
        gwMap.set(key, existing);
      }
      gatewayStats = Array.from(gwMap.entries()).map(([name, v]) => ({
        name,
        calls: v.calls,
        success: v.success,
        duration: v.dur,
        asr: v.calls > 0 ? ((v.success / v.calls) * 100).toFixed(1) : "0.0",
        acd: v.success > 0 ? (v.dur / v.success).toFixed(1) : "0.0",
      })).sort((a, b) => b.calls - a.calls);
    } catch {}

    return NextResponse.json({
      summary: {
        totalCalls,
        successCalls,
        totalDuration,
        totalFee,
        totalCost,
        totalProfit,
        profitMargin: totalFee > 0 ? ((totalProfit / totalFee) * 100).toFixed(1) : "0.0",
        asr: totalCalls > 0 ? Number(((successCalls / totalCalls) * 100).toFixed(1)) : 0,
        acd: successCalls > 0 ? Number((totalDuration / successCalls).toFixed(1)) : 0,
        avgFeePerCall: totalCalls > 0 ? Number((totalFee / totalCalls).toFixed(4)) : 0,
        avgProfitPerCall: totalCalls > 0 ? Number((totalProfit / totalCalls).toFixed(4)) : 0,
      },
      customers: (customers as any[]).map(r => ({
        customerId: r.customer_id,
        name: r.name || "Unknown",
        calls: Number(r.calls),
        success: Number(r.success),
        duration: Number(r.dur),
        fee: Number(r.fee),
        cost: Number(r.cost),
        profit: Number(r.profit),
        margin: Number(r.fee) > 0 ? Number(((Number(r.profit) / Number(r.fee)) * 100).toFixed(1)) : 0,
        asr: Number(r.calls) > 0 ? Number(((Number(r.success) / Number(r.calls)) * 100).toFixed(1)) : 0,
        acd: Number(r.success) > 0 ? Number((Number(r.dur) / Number(r.success)).toFixed(1)) : 0,
      })),
      dailyTrends: (dailyTrends as any[]).map(r => ({
        date: r.report_date,
        calls: Number(r.calls),
        success: Number(r.success),
        fee: Number(r.fee),
        profit: Number(r.profit),
      })),
      gatewayStats,
    });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 }); }
}
