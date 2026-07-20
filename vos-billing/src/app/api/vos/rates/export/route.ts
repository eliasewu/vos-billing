import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const groupId = request.nextUrl.searchParams.get("group_id");
    let sql = "SELECT feeprefix AS prefix, areacode, fee, tax, period, ivrfee, ivrperiod, type, locktype FROM e_feerate";
    const params: any[] = [];
    if (groupId) { sql += " WHERE feerategroup_id = ?"; params.push(groupId); }
    sql += " ORDER BY feeprefix";
    const rows = await queryVos<any>(sql, params);
    const headers = ["prefix","areacode","fee","tax","period","ivrfee","ivrperiod","type","locktype"];
    const csvLines = [headers.join(",")];
    for (const r of (rows as any[])) {
      csvLines.push(headers.map(h => { const v = r[h]; if (v===null||v===undefined) return ""; return typeof v==="string"&&v.includes(",")?`"${v}"`:String(v); }).join(","));
    }
    return new NextResponse(csvLines.join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=rates_${groupId||"all"}.csv` },
    });
  } catch { return NextResponse.json({ error: "Export failed" }, { status: 500 }); }
}
