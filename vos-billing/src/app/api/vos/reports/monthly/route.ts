import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>(
      `SELECT 
        DATE_FORMAT(FROM_UNIXTIME(c.starttime), '%Y-%m') AS report_month,
        c.customer_id,
        cu.name AS customer_name,
        COUNT(*) AS total_calls,
        SUM(CASE WHEN c.connecttime > 0 THEN 1 ELSE 0 END) AS success_calls,
        SUM(c.duration) AS total_duration,
        SUM(c.total_fee) AS total_fee,
        SUM(c.cost) AS total_cost,
        ROUND(AVG(CASE WHEN c.connecttime > 0 THEN 100 ELSE 0 END), 1) AS asr,
        ROUND(AVG(CASE WHEN c.connecttime > 0 THEN c.duration ELSE 0 END), 1) AS acd
       FROM e_cdr c
       LEFT JOIN e_customer cu ON c.customer_id = cu.id
       WHERE c.starttime > 0
       GROUP BY report_month, c.customer_id, cu.name
       ORDER BY report_month DESC, c.customer_id
       LIMIT 300`
    );

    const reports = (rows as any[]).map((r, i) => ({
      id: i + 1,
      month: r.report_month || "",
      customerId: r.customer_id,
      customerName: r.customer_name || `Customer #${r.customer_id}`,
      calls: Number(r.total_calls) || 0,
      success: Number(r.success_calls) || 0,
      duration: Number(r.total_duration) || 0,
      fee: Number(r.total_fee) || 0,
      cost: Number(r.total_cost) || 0,
      profit: (Number(r.total_fee) || 0) - (Number(r.total_cost) || 0),
      asr: Number(r.asr) || 0,
      acd: Number(r.acd) || 0,
    }));

    return NextResponse.json({ reports });
  } catch(e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
