import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { mapEndreason } from "@/lib/vos-utils";

export async function GET() {
  try {
    // Customer counts: total active customers from e_customer
    const customerResult = await queryVos<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM e_customer WHERE status = 0`
    );
    const clientCount = customerResult[0]?.cnt ?? 0;

    // CDR stats from e_cdr
    const cdrStats = await queryVos<{
      totalCalls: number;
      answeredCalls: number;
      totalDuration: number;
      totalRevenue: number;
      totalCost: number;
    }>(
      `SELECT 
        COUNT(*) AS totalCalls,
        SUM(CASE WHEN UPPER(TRIM(endreason)) IN ('200', 'NORMAL_CLEARING', 'ANSWER', 'ANSWERED') THEN 1 ELSE 0 END) AS answeredCalls,
        COALESCE(SUM(TIMESTAMPDIFF(SECOND, starttime, stoptime)), 0) AS totalDuration,
        COALESCE(SUM(incomefee), 0) AS totalRevenue,
        COALESCE(SUM(fee), 0) AS totalCost
      FROM e_cdr`
    );

    const stats = cdrStats[0];
    const totalCalls = Number(stats?.totalCalls ?? 0);
    const answeredCalls = Number(stats?.answeredCalls ?? 0);
    const totalDuration = Number(stats?.totalDuration ?? 0);
    const totalRevenue = Number(stats?.totalRevenue ?? 0);
    const totalCost = Number(stats?.totalCost ?? 0);
    const totalMargin = totalRevenue - totalCost;

    const asr = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : "0";
    const acd = answeredCalls > 0 ? (totalDuration / answeredCalls / 60).toFixed(1) : "0";

    // Gateway counts: unlocked mapping + routing gateways
    const mappingResult = await queryVos<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM e_gatewaymapping WHERE locktype = 0`
    );
    const routingResult = await queryVos<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM e_gatewayrouting WHERE locktype = 0`
    );
    const activeGateways = (mappingResult[0]?.cnt ?? 0) + (routingResult[0]?.cnt ?? 0);

    // Alerts: customers with negative balance
    const alertsResult = await queryVos<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM e_customer WHERE money < 0 AND status = 0`
    );

    // Total client balance
    const balanceResult = await queryVos<{ totalBalance: number }>(
      `SELECT COALESCE(SUM(money), 0) AS totalBalance FROM e_customer WHERE status = 0`
    );
    const totalClientBalance = Number(balanceResult[0]?.totalBalance ?? 0);

    // CDR by destination (top 6 by call count for answered calls)
    const topDestinations = await queryVos<{
      destination: string;
      calls: number;
      totalDuration: number;
      revenue: number;
      cost: number;
    }>(
      `SELECT 
        COALESCE(calleee164, 'Unknown') AS destination,
        COUNT(*) AS calls,
        COALESCE(SUM(TIMESTAMPDIFF(SECOND, starttime, stoptime)), 0) AS totalDuration,
        COALESCE(SUM(incomefee), 0) AS revenue,
        COALESCE(SUM(fee), 0) AS cost
      FROM e_cdr
      WHERE UPPER(TRIM(endreason)) IN ('200', 'NORMAL_CLEARING', 'ANSWER', 'ANSWERED')
      GROUP BY calleee164
      ORDER BY calls DESC
      LIMIT 6`
    );

    // CDR by status - map and aggregate VOS endreason codes
    const rawStatuses = await queryVos<{ endreason: string; count: number }>(
      `SELECT 
        COALESCE(endreason, 'unknown') AS endreason,
        COUNT(*) AS count
      FROM e_cdr
      GROUP BY endreason
      ORDER BY count DESC`
    );

    // Map raw codes to frontend labels and aggregate duplicates
    const statusMap = new Map<string, number>();
    for (const s of rawStatuses) {
      const label = mapEndreason(s.endreason);
      statusMap.set(label, (statusMap.get(label) || 0) + Number(s.count));
    }
    const cdrByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // Hourly traffic (last 24h)
    const hourlyTraffic = await queryVos<{
      hour: string;
      calls: number;
      answered: number;
    }>(
      `SELECT 
        DATE_FORMAT(starttime, '%H:00') AS hour,
        COUNT(*) AS calls,
        SUM(CASE WHEN UPPER(TRIM(endreason)) IN ('200', 'NORMAL_CLEARING', 'ANSWER', 'ANSWERED') THEN 1 ELSE 0 END) AS answered
      FROM e_cdr
      WHERE starttime >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY DATE_FORMAT(starttime, '%H:00')
      ORDER BY hour`
    );

    // --- Billing Summary ---
    let billingSummary = { totalBilled: 0, pendingBills: 0, pendingAmount: 0, topCustomers: [] as any[] };
    try {
      const billingAgg = await queryVos<any>(
        `SELECT
          COALESCE(SUM(total_fee), 0) AS total_billed,
          COALESCE(SUM(CASE WHEN status = 0 THEN total_fee ELSE 0 END), 0) AS pending_amount,
          COALESCE(SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END), 0) AS pending_count
        FROM e_billing`
      ) as any[];
      const ba = billingAgg[0] || {};
      billingSummary.totalBilled = Number(ba.total_billed || 0);
      billingSummary.pendingBills = Number(ba.pending_count || 0);
      billingSummary.pendingAmount = Number(ba.pending_amount || 0);

      // Top 5 customers by total billed
      const topCust = await queryVos<any>(
        `SELECT
          b.customer_id,
          c.name AS customer_name,
          COALESCE(SUM(b.total_fee), 0) AS total,
          COUNT(*) AS bill_count,
          COALESCE(SUM(CASE WHEN b.status = 0 THEN b.total_fee ELSE 0 END), 0) AS pending
        FROM e_billing b
        LEFT JOIN e_customer c ON b.customer_id = c.id
        GROUP BY b.customer_id, c.name
        ORDER BY total DESC
        LIMIT 5`
      ) as any[];
      billingSummary.topCustomers = (topCust as any[]).map(r => ({
        customerId: r.customer_id,
        customerName: r.customer_name || `Client #${r.customer_id}`,
        total: Number(r.total || 0),
        billCount: Number(r.bill_count || 0),
        pending: Number(r.pending || 0),
      }));
    } catch { /* billing table may not exist yet */ }

    return NextResponse.json({
      clientCount,
      supplierCount: 0,
      totalCalls,
      answeredCalls,
      totalDuration,
      totalRevenue,
      totalCost,
      totalMargin,
      asr: Number(asr),
      acd: Number(acd),
      activeGateways,
      unacknowledgedAlerts: alertsResult[0]?.cnt ?? 0,
      totalClientBalance,
      topDestinations,
      cdrByStatus,
      hourlyTraffic,
      billingSummary,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({
      clientCount: 0, supplierCount: 0, totalCalls: 0, answeredCalls: 0,
      totalDuration: 0, totalRevenue: 0, totalCost: 0, totalMargin: 0,
      asr: 0, acd: 0, activeGateways: 0, unacknowledgedAlerts: 0,
      totalClientBalance: 0, topDestinations: [], cdrByStatus: [], hourlyTraffic: [],
      billingSummary: { totalBilled: 0, pendingBills: 0, pendingAmount: 0, topCustomers: [] },
    });
  }
}
