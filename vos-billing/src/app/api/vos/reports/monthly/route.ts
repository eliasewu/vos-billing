import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT rm.*, c.name AS customer_name FROM e_report_monthly rm LEFT JOIN e_customer c ON rm.customer_id=c.id ORDER BY rm.report_month DESC");
    return NextResponse.json({ reports: (rows as any[]).map(r => ({ id: r.id, month: r.report_month, customerId: r.customer_id, customerName: r.customer_name, calls: r.total_calls, success: r.success_calls, duration: r.total_duration, fee: r.total_fee, cost: r.total_cost, profit: r.profit, asr: r.asr, acd: r.acd })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
