import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT b.*, c.name AS customer_name FROM e_billing b LEFT JOIN e_customer c ON b.customer_id=c.id ORDER BY b.bill_date DESC");
    return NextResponse.json({ bills: (rows as any[]).map(r => ({ id: r.id, customerId: r.customer_id, customerName: r.customer_name, billDate: r.bill_date, periodStart: r.period_start||null, periodEnd: r.period_end||null, totalCalls: r.total_calls, totalDuration: r.total_duration, totalFee: r.total_fee, status: r.status, memo: r.memo, addtime: r.addtime||0 })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    await executeVos("INSERT INTO e_billing (customer_id, bill_date, period_start, period_end, total_calls, total_duration, total_fee, status, memo) VALUES (?,?,?,?,?,?,?,?,?)", [b.customerId||0, b.billDate||new Date().toISOString().slice(0,10), b.periodStart||null, b.periodEnd||null, b.totalCalls||0, b.totalDuration||0, b.totalFee||0, 0, b.memo||""]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    if (!b.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const fields: string[] = [];
    const values: (string | number)[] = [];
    const fieldMap: Record<string, string> = {
      customerId: "customer_id", billDate: "bill_date", periodStart: "period_start",
      periodEnd: "period_end", totalCalls: "total_calls", totalDuration: "total_duration",
      totalFee: "total_fee", status: "status", memo: "memo",
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (b[key] !== undefined) { fields.push(`${col} = ?`); values.push(b[key]); }
    }
    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    values.push(Number(b.id));
    await executeVos(`UPDATE e_billing SET ${fields.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed to update" }, { status: 500 }); }
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
