import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

function getCdrPartitions(startDate?: string, endDate?: string): string[] {
  const partitions: string[] = [];
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 86400000);
  const end = endDate ? new Date(endDate) : new Date();
  
  // Generate partition names for each day in range
  const d = new Date(start);
  while (d <= end) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    partitions.push(`e_cdr_${y}${m}${day}`);
    d.setDate(d.getDate() + 1);
  }
  return partitions;
}

async function findExistingPartitions(partitions: string[]): Promise<string[]> {
  if (partitions.length === 0) return [];
  const placeholders = partitions.map(() => "?").join(",");
  try {
    const rows = await queryVos<any>(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'vos3000' AND TABLE_NAME IN (${placeholders})`,
      partitions
    ) as any[];
    return rows.map(r => r.TABLE_NAME);
  } catch {
    return [];
  }
}

function buildUnionQuery(existingPartitions: string[], selectFields: string): string {
  if (existingPartitions.length === 0) return "";
  return existingPartitions.map(t => `SELECT ${selectFields} FROM ${t}`).join(" UNION ALL ");
}

const CDR_COLUMNS = `flowno, callere164, calleee164, callerip, calleeip, callercodec, calleecodec, starttime, stoptime, feetime, fee, tax, customeraccount, customername, endreason, enddirection, billingtype, callergatewayid, calleegatewayid, callerareacode, calleeareacode`;

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const startDate = searchParams.get("start") || "";
    const endDate = searchParams.get("end") || "";
    const format = searchParams.get("format") || "";
    const endReason = searchParams.get("endReason") || "";
    const gateway = searchParams.get("gateway") || "";

    // Get partitions to query
    const allPartitions = getCdrPartitions(startDate || undefined, endDate || undefined);
    const existingPartitions = await findExistingPartitions(allPartitions);
    
    if (existingPartitions.length === 0) {
      return NextResponse.json({ cdrs: [], total: 0, page, limit, partitions: [] });
    }

    // Build WHERE conditions for the inner query
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push("(callere164 LIKE ? OR calleee164 LIKE ? OR customeraccount LIKE ? OR customername LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (endReason) {
      const endReasonNum = parseInt(endReason);
      if (!isNaN(endReasonNum)) {
        conditions.push("endreason = ?");
        params.push(endReasonNum);
      }
    }
    if (gateway) {
      conditions.push("(callergatewayid LIKE ? OR calleegatewayid LIKE ?)");
      params.push(`%${gateway}%`, `%${gateway}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const unionQuery = buildUnionQuery(existingPartitions, CDR_COLUMNS);
    
    // If CSV export requested
    if (format === "csv") {
      const exportSql = `SELECT * FROM (${unionQuery}) AS cdr_union ${where} ORDER BY starttime DESC LIMIT 10000`;
      const rows = await queryVos<any>(exportSql, [...params]) as any[];
      const headers = ["caller","callee","startTime","duration","fee","customer","endReason","gateway"];
      const csvLines = [headers.join(",")];
      for (const r of rows) {
        csvLines.push([
          r.callere164||"", r.calleee164||"",
          r.starttime ? new Date(Number(r.starttime)).toISOString() : "",
          r.feetime||0, r.fee||0,
          `"${(r.customername||r.customeraccount||"").replace(/"/g,'""')}"`,
          r.endreason||0, r.callergatewayid||""
        ].join(","));
      }
      return new NextResponse(csvLines.join("\n"), {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=cdr_export.csv" },
      });
    }

    // Combined stats + paginated query
    const statsSql = `SELECT COUNT(*) AS total, COALESCE(SUM(fee),0) AS totalFee FROM (${unionQuery}) AS cdr_union ${where}`;
    const [statsRow] = await queryVos<any>(statsSql, [...params]) as any[];
    const total = statsRow?.total || 0;
    const allTotalFee = Number(statsRow?.totalFee || 0);

    const sql = `SELECT * FROM (${unionQuery}) AS cdr_union ${where} ORDER BY starttime DESC LIMIT ? OFFSET ?`;
    const rows = await queryVos<any>(sql, [...params, limit, offset]);

    const cdrs = (rows as any[]).map((r: any) => ({
      flowNo: r.flowno,
      callerE164: r.callere164,
      calleeE164: r.calleee164,
      callerIp: r.callerip,
      calleeIp: r.calleeip,
      callerCodec: r.callercodec,
      calleeCodec: r.calleecodec,
      startTime: r.starttime,
      stopTime: r.stoptime,
      feeTime: r.feetime,
      fee: Number(r.fee || 0),
      tax: Number(r.tax || 0),
      customerAccount: r.customeraccount,
      customerName: r.customername,
      endReason: r.endreason,
      endDirection: r.enddirection,
      billingType: r.billingtype,
      callerGatewayId: r.callergatewayid,
      calleeGatewayId: r.calleegatewayid,
      callerAreaCode: r.callerareacode,
      calleeAreaCode: r.calleeareacode,
    }));

    return NextResponse.json({ cdrs, total, page, limit, partitions: existingPartitions.length, totalFee: allTotalFee, avgFee: total > 0 ? allTotalFee / total : 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed", cdrs: [], total: 0 }, { status: 500 });
  }
}
