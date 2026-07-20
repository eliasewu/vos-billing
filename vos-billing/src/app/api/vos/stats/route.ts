import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats: Record<string, unknown> = {
    customers: { total: 0, active: 0 },
    gateways: { total: 0, active: 0, mapping: 0, routing: 0 },
    activeCalls: 0,
    todayCalls: 0,
    todayDuration: 0,
    todayRevenue: 0,
    todayCost: 0,
  };

  try {
    // Try to get customer stats
    const customerTables = ["e_customer", "customer", "e_account", "account"];
    for (const table of customerTables) {
      try {
        const rows = await queryVos<{ total: number; active: number }>(
          `SELECT COUNT(*) as total, SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active FROM ${table}`
        );
        if (rows[0]) {
          stats.customers = { total: rows[0].total || 0, active: rows[0].active || 0 };
          break;
        }
      } catch {
        continue;
      }
    }

    // Try to get gateway stats
    const gatewayTables = ["e_gateway", "gateway", "e_gw", "gw"];
    for (const table of gatewayTables) {
      try {
        const rows = await queryVos<{ total: number; active: number; mapping: number; routing: number }>(
          `SELECT 
            COUNT(*) as total, 
            SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN gateway_type = 0 THEN 1 ELSE 0 END) as mapping,
            SUM(CASE WHEN gateway_type = 1 THEN 1 ELSE 0 END) as routing
           FROM ${table}`
        );
        if (rows[0]) {
          stats.gateways = { 
            total: rows[0].total || 0, 
            active: rows[0].active || 0,
            mapping: rows[0].mapping || 0,
            routing: rows[0].routing || 0,
          };
          break;
        }
      } catch {
        continue;
      }
    }

    // Try to get active call count
    const activeCallTables = ["e_active_call", "active_call", "e_activecall", "activecall"];
    for (const table of activeCallTables) {
      try {
        const rows = await queryVos<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
        if (rows[0]) {
          stats.activeCalls = rows[0].count || 0;
          break;
        }
      } catch {
        continue;
      }
    }

    // Try to get today's CDR stats
    const cdrTables = ["e_cdr", "cdr", "e_calllog", "calllog"];
    for (const table of cdrTables) {
      try {
        const rows = await queryVos<{ 
          calls: number; 
          duration: number; 
          revenue: number; 
          cost: number 
        }>(
          `SELECT 
            COUNT(*) as calls,
            COALESCE(SUM(duration), 0) as duration,
            COALESCE(SUM(sell_cost), 0) as revenue,
            COALESCE(SUM(cost), 0) as cost
           FROM ${table}
           WHERE DATE(start_time) = CURDATE()`
        );
        if (rows[0]) {
          stats.todayCalls = rows[0].calls || 0;
          stats.todayDuration = rows[0].duration || 0;
          stats.todayRevenue = rows[0].revenue || 0;
          stats.todayCost = rows[0].cost || 0;
          break;
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, stats });
  }
}
