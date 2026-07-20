import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { mapEndreason } from "@/lib/vos-utils";

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = request.nextUrl;
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const status = url.searchParams.get("status");
    const caller = url.searchParams.get("caller");

    // Build WHERE conditions
    const conditions: string[] = [];
    const queryParams: (string | number)[] = [];

    if (status) {
      const mappedCodes: Record<string, string[]> = {
        answered: ["200", "NORMAL_CLEARING", "ANSWER", "ANSWERED"],
        busy: ["486", "BUSY", "USER_BUSY"],
        no_answer: ["408", "NO_ANSWER", "NOANSWER", "REQUEST_TIMEOUT"],
        cancelled: ["487", "CANCEL", "CANCELLED", "REQUEST_TERMINATED"],
        failed: [],
      };

      if (mappedCodes[status] && mappedCodes[status].length > 0) {
        const placeholders = mappedCodes[status].map(() => "?").join(",");
        conditions.push(`UPPER(TRIM(e.endreason)) IN (${placeholders})`);
        queryParams.push(...mappedCodes[status]);
      }
    }

    if (caller) {
      conditions.push("e.callere164 LIKE ?");
      queryParams.push(`%${caller}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await queryVos<Record<string, unknown>>(
      `SELECT 
        e.flowno, e.callere164, e.calleee164, e.customeraccount,
        e.starttime, e.stoptime, e.fee, e.incomefee, e.endreason,
        c.name AS customerName,
        COALESCE(TIMESTAMPDIFF(SECOND, e.starttime, e.stoptime), 0) AS callDuration
      FROM e_cdr e
      LEFT JOIN e_customer c ON c.account = e.customeraccount
      ${where}
      ORDER BY e.starttime DESC
      LIMIT ?`,
      [...queryParams, limit]
    );

    const result = rows.map((row) => {
      const cdStatus = mapEndreason(row.endreason as string);
      const income = Number(row.incomefee) || 0;
      const cost = Number(row.fee) || 0;
      const dur = Number(row.callDuration) || 0;
      return {
        id: row.flowno,
        callId: "",
        callerNumber: row.callere164 || "",
        calledNumber: row.calleee164 || "",
        clientAccountId: row.customeraccount || "",
        clientName: (row.customerName as string) || (row.customeraccount as string) || "",
        supplierAccountId: "",
        supplierName: "",
        startTime: row.starttime,
        connectTime: row.starttime,
        endTime: row.stoptime,
        duration: dur,
        billedDuration: dur,
        status: cdStatus,
        sipCode: "",
        clientRate: 0,
        clientCost: income,
        supplierRate: 0,
        supplierCost: cost,
        margin: income - cost,
        prefix: "",
        destination: row.calleee164 || "Unknown",
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("CDRs API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
