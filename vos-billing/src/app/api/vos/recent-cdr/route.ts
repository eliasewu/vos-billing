import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const partitions = await queryVos<any>("SHOW TABLES LIKE 'e_cdr_202607%'") as any[];
    const tbls = (partitions).map((r: any) => Object.values(r)[0] as string).sort().reverse().slice(0, 3);
    let allRows: any[] = [];
    for (const tbl of tbls) {
      try { const rows = await queryVos<any>(`SELECT * FROM ${tbl} ORDER BY id DESC LIMIT 30`) as any[]; allRows = allRows.concat(rows); } catch {}
    }
    return NextResponse.json({ cdrs: allRows.slice(0,50).map(r => ({ id: r.id, caller: r.caller, callee: r.callee, startTime: r.begintime, duration: r.callduration, fee: r.fee, status: r.callstatus, gateway: r.gatewayname })) });
  } catch { return NextResponse.json({ cdrs: [], error: "Failed" }, { status: 500 }); }
}
