import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

const ACTIVE_CALL_TABLES = [
  "e_active_call",
  "active_call",
  "e_activecall",
  "activecall",
  "e_current_call",
  "current_call",
];

async function findActiveCallTable(): Promise<string | null> {
  for (const table of ACTIVE_CALL_TABLES) {
    try {
      await queryVos(`SELECT 1 FROM ${table} LIMIT 1`);
      return table;
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(_request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const table = await findActiveCallTable();

    // Fallback: try today's CDR partition for active calls
    let activeCalls: any[] = [];
    let source = "";

    if (table) {
      source = table;
      activeCalls = await queryVos(
        `SELECT * FROM ${table} ORDER BY start_time DESC LIMIT 200`
      );
    } else {
      // Fallback to CDR partition
      const d = new Date();
      const partition =
        "e_cdr_" +
        d.getFullYear() +
        String(d.getMonth() + 1).padStart(2, "0") +
        String(d.getDate()).padStart(2, "0");
      try {
        activeCalls = await queryVos(
          `SELECT * FROM ${partition} WHERE (callstatus = 'active' OR callstatus = 1 OR endtime IS NULL) ORDER BY begintime DESC LIMIT 200`
        );
        source = partition;
      } catch {
        // No partition found, return empty
      }
    }

    const now = Math.floor(Date.now() / 1000);

    const calls = activeCalls.map((r: any) => {
      const startTime = r.start_time || r.begintime || r.starttime || 0;
      const startTs =
        typeof startTime === "number"
          ? startTime
          : new Date(startTime).getTime() / 1000;
      const elapsed = now - startTs;

      return {
        id: r.id,
        callId: r.call_id || r.callid || String(r.id),
        caller: r.caller || r.calling_num || r.callingnumber || "",
        callee: r.callee || r.called_num || r.callednumber || "",
        customerId: r.customer_id || r.customerid || null,
        customerName: r.customer_name || r.customername || "",
        mappingGwId: r.mapping_gw_id || r.mappinggatewayid || null,
        mappingGwName: r.mapping_gw_name || r.mappinggatewayname || "",
        routingGwId: r.routing_gw_id || r.routinggatewayid || null,
        routingGwName: r.routing_gw_name || r.routinggatewayname || "",
        duration: r.duration || r.callduration || r.call_duration || elapsed || 0,
        elapsed,
        status: r.status || r.callstatus || "active",
        startTime: startTs,
        startTimeStr:
          typeof startTime === "number"
            ? new Date(startTime * 1000).toISOString()
            : startTime || "",
        codec: r.codec || r.audiocodec || "",
        rate: r.rate || r.sell_rate || 0,
      };
    });

    // Stats
    const totalCalls = calls.length;
    const totalDuration = calls.reduce((s, c) => s + (c.elapsed || 0), 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    const uniqueGateways = new Set(
      calls
        .flatMap((c) => [c.mappingGwName, c.routingGwName])
        .filter(Boolean)
    ).size;
    const uniqueCustomers = new Set(
      calls.map((c) => c.customerName).filter(Boolean)
    ).size;

    return NextResponse.json({
      calls,
      source,
      stats: {
        totalCalls,
        totalDuration,
        avgDuration,
        uniqueGateways,
        uniqueCustomers,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, calls: [] }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callId = _request.nextUrl.searchParams.get("id");
  if (!callId) {
    return NextResponse.json({ error: "Call ID required" }, { status: 400 });
  }

  try {
    const table = await findActiveCallTable();
    if (!table) {
      return NextResponse.json({ error: "No active call table found" }, { status: 404 });
    }

    // Try to delete by call_id or id
    let deleted = false;
    try {
      const result = await executeVos(
        `DELETE FROM ${table} WHERE call_id = ? OR callid = ? OR id = ? LIMIT 1`,
        [callId, callId, isNaN(Number(callId)) ? 0 : Number(callId)]
      );
      deleted = result.affectedRows > 0;
    } catch {
      // If call_id column doesn't exist, try id only
      if (!isNaN(Number(callId))) {
        try {
          const result = await executeVos(
            `DELETE FROM ${table} WHERE id = ? LIMIT 1`,
            [Number(callId)]
          );
          deleted = result.affectedRows > 0;
        } catch {
          // ignore
        }
      }
    }

    if (deleted) {
      return NextResponse.json({ success: true, message: `Call ${callId} terminated` });
    }
    return NextResponse.json({ error: "Call not found or already ended" }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
