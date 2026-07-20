import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

interface ActivePhoneCard {
  id: number;
  pin: string;
  password: string;
  displaye164: string;
  activetime: string;
  bindlimit: number;
  memo: string;
  customer_id: number;
  // Joined fields
  money: number;
  limitmoney: number;
  usedaccount: string;
  usedaccountname: string;
  sold: number;
  locktype: number;
}

export async function GET(_request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await queryVos<Record<string, unknown>>(
      `SELECT 
        a.id, a.pin, a.password, a.displaye164, a.activetime, 
        a.bindlimit, a.memo, a.customer_id,
        COALESCE(p.money, 0) AS money,
        COALESCE(p.limitmoney, 0) AS limitmoney,
        p.usedaccount,
        p.usedaccountname,
        p.sold,
        p.locktype
      FROM e_activephonecard a
      LEFT JOIN e_phonecard p ON a.pin = p.pin
      ORDER BY a.activetime DESC
      LIMIT 500`
    );

    const cards: ActivePhoneCard[] = rows.map((r) => ({
      id: Number(r.id),
      pin: String(r.pin || ""),
      password: String(r.password || ""),
      displaye164: String(r.displaye164 || ""),
      activetime: r.activetime ? String(r.activetime) : "",
      bindlimit: Number(r.bindlimit) || 0,
      memo: String(r.memo || ""),
      customer_id: Number(r.customer_id) || 0,
      money: Number(r.money) || 0,
      limitmoney: Number(r.limitmoney) || 0,
      usedaccount: String(r.usedaccount || ""),
      usedaccountname: String(r.usedaccountname || ""),
      sold: Number(r.sold) || 0,
      locktype: Number(r.locktype) || 0,
    }));

    const total = cards.length;
    const totalMoney = cards.reduce((sum, c) => sum + c.money, 0);
    const uniqueCustomers = new Set(cards.map((c) => c.usedaccount).filter(Boolean)).size;

    return NextResponse.json({
      cards,
      summary: { total, totalMoney, uniqueCustomers },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, cards: [], summary: { total: 0, totalMoney: 0, uniqueCustomers: 0 } });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const result = await executeVos(
      "DELETE FROM e_activephonecard WHERE id = ?",
      [Number(id)]
    );

    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Session ${id} disconnected` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Active phone card disconnect error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
