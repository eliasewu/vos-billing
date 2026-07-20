import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT * FROM e_loginlog ORDER BY login_time DESC LIMIT 100");
    return NextResponse.json({ logs: (rows as any[]).map(r => ({ id: r.id, username: r.username, loginTime: r.login_time, logoutTime: r.logout_time, ip: r.ip, status: r.status, memo: r.memo })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
