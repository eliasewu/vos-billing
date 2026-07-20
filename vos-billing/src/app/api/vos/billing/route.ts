import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT b.*, c.name AS customer_name FROM e_billing b LEFT JOIN e_customer c ON b.customer_id=c.id ORDER BY b.bill_date DESC");
    return NextResponse.json({ bills: (rows as any[]).map(r => ({ id: r.id, customerId: r.customer_id, billDate: r.bill_date, totalCalls: r.total_calls, totalDuration: r.total_duration, totalFee: r.total_fee, status: r.status, memo: r.memo, customerName: r.customer_name })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    await executeVos("INSERT INTO e_billing (customer_id, bill_date, total_calls, total_duration, total_fee, status, memo) VALUES (?,?,?,?,?,?,?)", [b.customerId||0, b.billDate||new Date().toISOString().slice(0,10), b.totalCalls||0, b.totalDuration||0, b.totalFee||0, 0, b.memo||""]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_billing WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
