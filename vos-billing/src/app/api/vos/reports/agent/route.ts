import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Aggregate CDRs by agent (customer) with date grouping
    const rows = await queryVos<any>(
      `SELECT 
        DATE(FROM_UNIXTIME(starttime)) AS report_date,
        customer_id,
        COUNT(*) AS total_calls,
        SUM(duration) AS total_duration,
        SUM(total_fee) AS total_fee
       FROM e_cdr
       WHERE starttime > 0
       GROUP BY report_date, customer_id
       ORDER BY report_date DESC, customer_id
       LIMIT 300`
    );

    const reports = (rows as any[]).map((r, i) => ({
      id: i + 1,
      date: r.report_date || "",
      agentId: r.customer_id,
      agentName: `Agent #${r.customer_id}`,
      calls: Number(r.total_calls) || 0,
      duration: Number(r.total_duration) || 0,
      fee: Number(r.total_fee) || 0,
      commission: Number(((r.total_fee || 0) * 0.1).toFixed(4)), // 10% commission
    }));

    return NextResponse.json({ reports });
  } catch(e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
