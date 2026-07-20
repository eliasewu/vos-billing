import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

const CDR_TABLES = ["e_cdr", "cdr", "e_calllog", "calllog", "e_call_record", "call_record"];

async function findCdrTable(): Promise<string | null> {
  for (const table of CDR_TABLES) {
    try {
      await queryVos(`SELECT 1 FROM ${table} LIMIT 1`);
      return table;
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const table = await findCdrTable();
    if (!table) {
      return NextResponse.json({ error: "CDR table not found", cdrs: [] });
    }

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100");
    const customerId = request.nextUrl.searchParams.get("customer_id");
    const dateFrom = request.nextUrl.searchParams.get("date_from");
    const dateTo = request.nextUrl.searchParams.get("date_to");
    
    let sql = `SELECT * FROM ${table}`;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (customerId) {
      conditions.push("customer_id = ?");
      params.push(parseInt(customerId));
    }
    
    if (dateFrom) {
      conditions.push("start_time >= ?");
      params.push(dateFrom);
    }
    
    if (dateTo) {
      conditions.push("start_time <= ?");
      params.push(dateTo);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    const cdrs = await queryVos(sql, params);

    // Get summary
    const summaryRows = await queryVos<{
      total_calls: number;
      total_duration: number;
      total_cost: number;
      total_sell: number;
    }>(
      `SELECT 
        COUNT(*) as total_calls,
        COALESCE(SUM(duration), 0) as total_duration,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(sell_cost), 0) as total_sell
       FROM ${table}
       ${conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : ""}`,
      params.slice(0, -1) // Remove limit from params
    );

    return NextResponse.json({ 
      cdrs, 
      table,
      summary: summaryRows[0] || {
        total_calls: 0,
        total_duration: 0,
        total_cost: 0,
        total_sell: 0,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, cdrs: [] });
  }
}
