import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT rd.*, c.name AS customer_name FROM e_report_daily rd LEFT JOIN e_customer c ON rd.customer_id=c.id ORDER BY rd.report_date DESC");
    const [s] = await queryVos<any>("SELECT COALESCE(SUM(total_calls),0) AS calls, COALESCE(SUM(total_fee),0) AS fee, COALESCE(SUM(profit),0) AS profit, COALESCE(SUM(total_duration),0) AS dur FROM e_report_daily") as any[];
    return NextResponse.json({
      reports: (rows as any[]).map(r => ({ id: r.id, date: r.report_date, customerId: r.customer_id, customerName: r.customer_name, calls: r.total_calls, success: r.success_calls, duration: r.total_duration, fee: r.total_fee, cost: r.total_cost, profit: r.profit, asr: r.asr, acd: r.acd })),
      summary: { totalCalls: Number(s?.calls||0), totalFee: Number(s?.fee||0), totalProfit: Number(s?.profit||0), totalDuration: Number(s?.dur||0) }
    });
  } catch (e: any) { return NextResponse.json({ error: "Failed: "+(e?.message||"") }, { status: 500 }); }
}
