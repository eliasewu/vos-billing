import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT ca.*, c.name AS customer_name, c.account AS customer_account FROM e_clearing_account ca LEFT JOIN e_customer c ON ca.customer_id=c.id ORDER BY ca.id");
    return NextResponse.json({ accounts: (rows as any[]).map(r => ({ id: r.id, customerId: r.customer_id, customerName: r.customer_name, account: r.customer_account || "", balance: Number(r.balance||0), limitMoney: Number(r.limit_money||0), status: Number(r.status||0), memo: r.memo||"" })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    await executeVos("INSERT INTO e_clearing_account (customer_id, balance, limit_money, status, memo) VALUES (?,?,?,?,?)",
      [b.customerId||0, b.balance||0, b.limitMoney||0, b.status??1, b.memo||""]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_clearing_account WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
