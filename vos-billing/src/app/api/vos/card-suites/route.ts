import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT * FROM e_card_suite ORDER BY id");
    return NextResponse.json({ suites: (rows as any[]).map(r => ({ id: r.id, name: r.name, quantity: r.quantity, faceValue: r.face_value, expireDays: r.expire_days, prefix: r.prefix, pinLength: r.pin_length, memo: r.memo })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    await executeVos("INSERT INTO e_card_suite (name, quantity, face_value, expire_days, prefix, pin_length, memo) VALUES (?,?,?,?,?,?,?)", [b.name||"", b.quantity||100, b.faceValue||10, b.expireDays||90, b.prefix||"", b.pinLength||10, b.memo||""]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_card_suite WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    if (!b.id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos(
      "UPDATE e_card_suite SET name=?, quantity=?, face_value=?, expire_days=?, prefix=?, pin_length=?, memo=? WHERE id=?",
      [b.name||"", b.quantity||100, b.faceValue||10, b.expireDays||90, b.prefix||"", b.pinLength||10, b.memo||"", b.id]
    );
    return NextResponse.json({ success: true });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); }
}
