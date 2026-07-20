import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT n.*, c.name AS customer_name FROM e_numberlimit n LEFT JOIN e_customer c ON n.customer_id=c.id ORDER BY n.id");
    return NextResponse.json({ limits: (rows as any[]).map(r => ({ id: r.id, customerId: r.customer_id, prefix: r.prefix, limitCalls: r.limit_calls, limitDuration: r.limit_duration, memo: r.memo, customerName: r.customer_name })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    await executeVos("INSERT INTO e_numberlimit (customer_id, prefix, limit_calls, limit_duration, memo) VALUES (?,?,?,?,?)", [b.customerId||0, b.prefix||"", b.limitCalls||0, b.limitDuration||0, b.memo||""]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_numberlimit WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
