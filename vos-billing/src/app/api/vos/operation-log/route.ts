import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT * FROM e_operationlog ORDER BY op_time DESC LIMIT 100");
    return NextResponse.json({ logs: (rows as any[]).map(r => ({ id: r.id, username: r.username, operation: r.operation, target: r.target, detail: r.detail, opTime: r.op_time, ip: r.ip })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
