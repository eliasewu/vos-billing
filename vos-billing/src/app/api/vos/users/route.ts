import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT id, loginname, username, level, locktype, expiretime FROM e_user ORDER BY id");
    return NextResponse.json({
      users: (rows as any[]).map(r => ({ id: r.id, loginName: r.loginname, userName: r.username, level: r.level, lockType: r.locktype, expireTime: r.expiretime })),
    });
  } catch (e: any) { return NextResponse.json({ error: e?.message, users: [] }, { status: 500 }); }
}
