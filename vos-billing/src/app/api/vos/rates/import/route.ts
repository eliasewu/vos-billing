import { NextRequest, NextResponse } from "next/server";
import { executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { groupId, rates } = body;
    if (!groupId || !rates || !rates.length) return NextResponse.json({ error: "No rates" }, { status: 400 });
    let inserted = 0;
    for (const r of rates) {
      try {
        await executeVos("INSERT INTO e_feerate (feerategroup_id, feeprefix, areacode, fee, tax, period, ivrfee, ivrperiod, type, locktype) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [groupId, r.prefix||"", r.areacode||"", parseFloat(r.fee)||0, parseFloat(r.tax)||0, parseInt(r.period)||6, parseFloat(r.ivrfee)||0, parseInt(r.ivrperiod)||0, parseInt(r.type)||0, parseInt(r.locktype)||0]);
        inserted++;
      } catch {}
    }
    return NextResponse.json({ success: true, inserted });
  } catch { return NextResponse.json({ error: "Import failed" }, { status: 500 }); }
}
