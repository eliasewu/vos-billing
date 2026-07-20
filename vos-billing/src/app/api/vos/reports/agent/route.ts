import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT ra.*, a.name AS agent_name FROM e_report_agent ra LEFT JOIN e_agent a ON ra.agent_id=a.id ORDER BY ra.report_date DESC");
    return NextResponse.json({ reports: (rows as any[]).map(r => ({ id: r.id, date: r.report_date, agentId: r.agent_id, agentName: r.agent_name, calls: r.total_calls, duration: r.total_duration, fee: r.total_fee, commission: r.commission })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
