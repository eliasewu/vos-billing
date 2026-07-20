import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT rd.*, c.name AS customer_name FROM e_report_daily rd LEFT JOIN e_customer c ON rd.customer_id=c.id ORDER BY rd.report_date DESC");
    return NextResponse.json({ details: (rows as any[]).map(r => ({ id: r.id, date: r.report_date, customerId: r.customer_id, customerName: r.customer_name, calls: r.total_calls, fee: r.total_fee, profit: r.profit })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
