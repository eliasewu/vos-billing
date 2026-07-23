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
      duration: number;
      fee: number;
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
            COALESCE(SUM(feetime), 0) AS total_duration,
            COALESCE(SUM(fee), 0) AS total_fee
          FROM ${tbl}
          WHERE starttime > 0
          GROUP BY acct, cname`
        ) as any[];

        for (const r of rows) {
          const key = `${displayDate}|${r.acct}`;
          const existing = reportMap.get(key);
          const calls = Number(r.total_calls || 0);
          const dur = Number(r.total_duration || 0);
          const fee = Number(r.total_fee || 0);

          if (existing) {
            existing.calls += calls;
            existing.duration += dur;
            existing.fee += fee;
          } else {
            reportMap.set(key, {
              date: displayDate,
              customerAccount: r.acct,
              customerName: r.cname || r.acct,
              calls,
              duration: dur,
              fee,
            });
          }
        }
      } catch { continue; }
    }

    const reports = Array.from(reportMap.values())
      .map((r, i) => ({
        id: i + 1,
        date: r.date,
        agentId: r.customerAccount,
        agentName: r.customerName || r.customerAccount,
        calls: r.calls,
        duration: r.duration,
        fee: r.fee,
        commission: parseFloat((r.fee * 0.1).toFixed(4)), // 10% commission
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.calls - a.calls)
      .slice(0, 300);

    return NextResponse.json({ reports, partitions: tables.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
