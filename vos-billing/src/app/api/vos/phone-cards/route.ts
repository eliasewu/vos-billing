import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>(
      "SELECT id, serialno, pin, money, usedaccount, agentaccount, expiretime, type FROM e_phonecard ORDER BY id DESC LIMIT 500"
    );
    return NextResponse.json({
      cards: (rows as any[]).map(r => ({
        id: r.id,
        serialNo: r.serialno,
        pin: r.pin,
        money: Number(r.money) || 0,
        usedAccount: r.usedaccount || "",
        agentAccount: r.agentaccount || "",
        expireTime: r.expiretime,
        type: r.type ?? 0,
      })),
    });
  } catch(e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_phonecard WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch(e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
