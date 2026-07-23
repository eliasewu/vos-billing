import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { cdrPartitionsForLastNDays, findExistingCdrPartitions } from "@/lib/vos-utils";

export async function GET(_request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const partitions = cdrPartitionsForLastNDays(30);
    const tables = await findExistingCdrPartitions(queryVos, partitions);

    // Supplier payouts: group by routing gateway and clearing customer
    const supplierMap = new Map<number, {
      clearingId: number;
      clearingName: string;
      gatewayName: string;
      calls: number;
      success: number;
      duration: number;
      cost: number;
      fee: number;
    }>();

    let totalCalls = 0;
    let totalCost = 0;
    let totalFee = 0;

    for (const tbl of tables.slice(0, 14)) {
      try {
        const rows = await queryVos<any>(
          `SELECT 
            COALESCE(routing_gw_id, routinggatewayid, 0) AS gw_id,
            COALESCE(routing_gw_name, routinggatewayname, 'Unknown') AS gw_name,
            COALESCE(clearingcustomer_id, clearing_customer_id, 0) AS clearing_id,
            COUNT(*) AS cnt,
            SUM(CASE WHEN callstatus = 1 OR callstatus = 'answered' OR endreason IS NULL OR endreason = 0 OR endreason = '' THEN 1 ELSE 0 END) AS success,
            COALESCE(SUM(callduration), 0) AS dur,
            COALESCE(SUM(cost), 0) AS cost,
            COALESCE(SUM(sell_cost), 0) AS fee
          FROM ${tbl}
          WHERE (routing_gw_id > 0 OR routinggatewayid > 0 OR clearingcustomer_id > 0 OR clearing_customer_id > 0)
          GROUP BY gw_id, gw_name, clearing_id`
        ) as any[];

        for (const r of rows) {
          const clearingId = Number(r.clearing_id || r.gw_id || 0);
          if (clearingId === 0) continue;

          const existing = supplierMap.get(clearingId);
          const calls = Number(r.cnt || 0);
          const success = Number(r.success || 0);
          const dur = Number(r.dur || 0);
          const cost = Number(r.cost || 0);
          const fee = Number(r.fee || 0);

          if (existing) {
            existing.calls += calls;
            existing.success += success;
            existing.duration += dur;
            existing.cost += cost;
            existing.fee += fee;
          } else {
            supplierMap.set(clearingId, {
              clearingId,
              clearingName: String(r.clearing_name || r.gw_name || `Supplier #${clearingId}`),
              gatewayName: String(r.gw_name || ""),
              calls,
              success,
              duration: dur,
              cost,
              fee,
            });
          }

          totalCalls += calls;
          totalCost += cost;
          totalFee += fee;
        }
      } catch { continue; }
    }

    // Try to get clearing customer names
    const clearingNames = new Map<number, string>();
    try {
      const customers = await queryVos<any>(
        "SELECT id, name FROM e_customer WHERE type = 1 AND status = 0"
      ) as any[];
      for (const c of customers) {
        clearingNames.set(Number(c.id), String(c.name || ""));
      }
    } catch { /* ignore */ }

    const suppliers = Array.from(supplierMap.values())
      .map((s) => ({
        ...s,
        clearingName: clearingNames.get(s.clearingId) || s.clearingName || `Supplier #${s.clearingId}`,
        asr: s.calls > 0 ? parseFloat(((s.success / s.calls) * 100).toFixed(1)) : 0,
        margin: s.fee > 0 ? parseFloat((((s.fee - s.cost) / s.fee) * 100).toFixed(1)) : 0,
        profit: parseFloat((s.fee - s.cost).toFixed(4)),
      }))
      .sort((a, b) => b.cost - a.cost);

    // Daily cost trend
    const daily: Array<{ date: string; cost: number; calls: number }> = [];
    for (const tbl of tables) {
      try {
        const [row] = await queryVos<any>(
          `SELECT COUNT(*) AS cnt, COALESCE(SUM(cost), 0) AS cost
          FROM ${tbl}
          WHERE routing_gw_id > 0 OR routinggatewayid > 0 OR clearingcustomer_id > 0 OR clearing_customer_id > 0`
        ) as any[];
        const dateStr = tbl.slice(-8);
        daily.push({
          date: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
          cost: Number(row?.cost || 0),
          calls: Number(row?.cnt || 0),
        });
      } catch { continue; }
    }
    daily.reverse();

    return NextResponse.json({
      summary: {
        totalCalls,
        totalCost: parseFloat(totalCost.toFixed(4)),
        totalFee: parseFloat(totalFee.toFixed(4)),
        totalProfit: parseFloat((totalFee - totalCost).toFixed(4)),
        supplierCount: suppliers.length,
        margin: totalFee > 0 ? parseFloat((((totalFee - totalCost) / totalFee) * 100).toFixed(1)) : 0,
      },
      suppliers,
      daily,
      tables: tables.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
