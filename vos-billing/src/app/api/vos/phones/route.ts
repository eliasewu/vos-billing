import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT p.*, c.name AS customer_name FROM e_phone p LEFT JOIN e_customer c ON p.customer_id=c.id ORDER BY p.id");
    return NextResponse.json({ phones: (rows as any[]).map(r => ({ id: r.id, e164: r.e164, capacity: r.capacity, callLevel: r.calllevel, locktype: r.locktype, customerName: r.customer_name||null })) });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    // VOS3000 tables lack AUTO_INCREMENT — manually get next ID
    const [maxRow] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_phone");
    const nextId = Number(maxRow?.next_id || 1);
    await executeVos("INSERT INTO e_phone (id, e164, password, capacity, calllevel, locktype, customer_id) VALUES (?,?,?,?,?,?,?)", [nextId, b.e164||"", b.password||"", b.capacity||2, b.callLevel||0, b.locktype??0, b.customerId||0]);
    return NextResponse.json({ success: true, id: nextId });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_phone WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); }
}
