import { NextRequest, NextResponse } from "next/server";
import { executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { feerategroup_id, rates } = body;

    if (!feerategroup_id || !Array.isArray(rates) || rates.length === 0) {
      return NextResponse.json({ error: "Group ID and non-empty rates array are required" }, { status: 400 });
    }

    if (rates.length > 500) {
      return NextResponse.json({ error: "Maximum 500 rates per import" }, { status: 400 });
    }

    let inserted = 0;
    const errors: string[] = [];

    for (const rate of rates) {
      if (!rate.prefix) {
        errors.push(`Row skipped: missing prefix`);
        continue;
      }
      try {
        await executeVos(
          `INSERT INTO e_feerate (feerategroup_id, feeprefix, areacode, fee, tax, period, type, locktype)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            feerategroup_id,
            rate.prefix,
            rate.areacode || null,
            parseFloat(rate.fee) || 0,
            parseFloat(rate.tax) || 0,
            parseInt(rate.period) || 60,
            parseInt(rate.type) || 0,
            parseInt(rate.locktype) || 0,
          ]
        );
        inserted++;
      } catch (e: any) {
        errors.push(`Prefix "${rate.prefix}": ${e?.message || "Failed"}`);
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      total: rates.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bulk import failed" }, { status: 500 });
  }
}
