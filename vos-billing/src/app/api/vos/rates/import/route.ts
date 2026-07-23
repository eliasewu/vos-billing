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
    let succeeded = 0;
    const errors: string[] = [];
    for (const r of rates) {
      if (!r.prefix) { errors.push("Missing prefix"); continue; }
      try {
        await executeVos("INSERT INTO e_feerate (feerategroup_id, feeprefix, areacode, locktype, fee, tax, period, ivrfee, ivrperiod, type) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [Number(groupId), String(r.prefix||""), String(r.areacode||""), Number(r.locktype)||0, Number(r.fee)||0, Number(r.tax)||0, Number(r.period)||0, Number(r.ivrfee)||0, Number(r.ivrperiod)||0, Number(r.type)||0]);
        succeeded++;
      } catch (e) {
        errors.push(`${r.prefix}: ${e instanceof Error ? e.message : "Failed"}`);
      }
    }
    return NextResponse.json({
      success: true,
      succeeded,
      failed: rates.length - succeeded,
      errors: errors.slice(0, 10),
    });
  } catch { return NextResponse.json({ error: "Import failed" }, { status: 500 }); }
}
