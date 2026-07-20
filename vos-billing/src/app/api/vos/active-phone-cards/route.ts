import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Query active phone card sessions from e_activecard or e_phonecard with sold=0
    // VOS3000 tracks active sessions in e_activecard; fall back to e_phonecard where sold=0
    let rows: any[];
    try {
      rows = await queryVos<any>(
        "SELECT id, pin, displaye164, activetime, bindlimit, money, limitmoney, usedaccount, usedaccountname, sold, locktype FROM e_activecard ORDER BY activetime DESC LIMIT 500"
      );
    } catch {
      // Fallback: query e_phonecard for active (unsold) cards
      rows = await queryVos<any>(
        "SELECT id, pin, '' as displaye164, expiretime as activetime, 0 as bindlimit, money, money as limitmoney, usedaccount, '' as usedaccountname, sold, 0 as locktype FROM e_phonecard WHERE sold = 0 ORDER BY id DESC LIMIT 500"
      );
    }

    const cards = (rows as any[]).map(r => ({
      id: r.id,
      pin: r.pin || "",
      displaye164: r.displaye164 || "",
      activetime: r.activetime || "",
      bindlimit: Number(r.bindlimit) || 0,
      money: Number(r.money) || 0,
      limitmoney: Number(r.limitmoney) || 0,
      usedaccount: r.usedaccount || "",
      usedaccountname: r.usedaccountname || "",
      sold: r.sold ?? 0,
      locktype: r.locktype ?? 0,
    }));

    const totalMoney = cards.reduce((s, c) => s + c.money, 0);
    const uniqueCustomers = new Set(cards.map(c => c.usedaccount).filter(Boolean)).size;

    return NextResponse.json({
      cards,
      summary: { total: cards.length, totalMoney, uniqueCustomers },
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
    // Disconnect by setting locktype=1 or deleting
    await executeVos("UPDATE e_activecard SET locktype = 1 WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch(e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
