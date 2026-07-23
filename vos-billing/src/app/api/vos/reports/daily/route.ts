import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { cdrPartitionsForLastNDays, findExistingCdrPartitions } from "@/lib/vos-utils";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const partitions = cdrPartitionsForLastNDays(30);
    const tables = await findExistingCdrPartitions(queryVos, partitions);

    // Aggregate across partitions in memory
    const reportMap = new Map<string, {
      date: string;
      customerAccount: string;
      customerName: string;
      calls: number;
      success: number;
      duration: number;
      fee: number;
      tax: number;
      cost: number;
    }>();

    for (const tbl of tables) {
      try {
        const dateStr = tbl.slice(-8);
        const displayDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

        const rows = await queryVos<any>(
          `SELECT 
            COALESCE(customeraccount, '') AS acct,
            COALESCE(customername, '') AS cname,
            COUNT(*) AS total_calls,
            SUM(CASE WHEN endreason = 0 OR endreason = '' OR endreason IS NULL THEN 1 ELSE 0 END) AS success_calls,
            COALESCE(SUM(feetime), 0) AS total_duration,
            COALESCE(SUM(fee), 0) AS total_fee,
            COALESCE(SUM(tax), 0) AS total_tax
          FROM ${tbl}
          WHERE starttime > 0
          GROUP BY acct, cname`
        ) as any[];

        for (const r of rows) {
          const key = `${displayDate}|${r.acct}`;
          const existing = reportMap.get(key);
          const calls = Number(r.total_calls || 0);
          const success = Number(r.success_calls || 0);
          const dur = Number(r.total_duration || 0);
          const fee = Number(r.total_fee || 0);
          const tax = Number(r.total_tax || 0);

          if (existing) {
            existing.calls += calls;
            existing.success += success;
            existing.duration += dur;
            existing.fee += fee;
            existing.tax += tax;
            existing.cost = existing.fee - existing.tax;
          } else {
            reportMap.set(key, {
              date: displayDate,
              customerAccount: r.acct,
              customerName: r.cname || r.acct,
              calls,
              success,
              duration: dur,
              fee,
              tax,
              cost: fee - tax,
            });
          }
        }
      } catch { continue; }
    }

    const reports = Array.from(reportMap.values())
      .map((r, i) => ({
        id: i + 1,
        date: r.date,
        customerId: r.customerAccount,
        customerName: r.customerName || r.customerAccount,
        calls: r.calls,
        success: r.success,
        duration: r.duration,
        fee: r.fee,
        cost: r.cost,
        profit: r.fee - r.cost,
        asr: r.calls > 0 ? parseFloat(((r.success / r.calls) * 100).toFixed(1)) : 0,
        acd: r.success > 0 ? Math.round(r.duration / r.success) : 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.calls - a.calls)
      .slice(0, 300);

    const totalCalls = reports.reduce((s, r) => s + r.calls, 0);
    const totalFee = reports.reduce((s, r) => s + r.fee, 0);
    const totalProfit = reports.reduce((s, r) => s + r.profit, 0);
    const totalDuration = reports.reduce((s, r) => s + r.duration, 0);

    return NextResponse.json({
      reports,
      summary: { totalCalls, totalFee, totalProfit, totalDuration },
      partitions: tables.length,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
