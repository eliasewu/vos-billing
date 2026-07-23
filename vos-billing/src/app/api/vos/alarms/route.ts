import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT id, name, value, level, type, starttime, status FROM e_alarm_current ORDER BY id DESC");
    return NextResponse.json({
      alarms: (rows as any[]).map(r => ({ id: r.id, name: r.name, value: r.value, level: r.level, type: r.type, time: r.starttime, status: r.status })),
    });
  } catch (e: any) { return NextResponse.json({ error: e?.message, alarms: [] }, { status: 500 }); }
}
