import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { mapEndreason } from "@/lib/vos-utils";

export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get("period") || "daily"; // daily | monthly | yearly
    
    // Determine date grouping format and range based on period
    let cdrGroupFormat: string;
    let cdrDateFilter: string;
    let billingGroupFormat: string;
    let billingDateFilter: string;
    
    if (period === "yearly") {
      cdrGroupFormat = "%Y";
      cdrDateFilter = "starttime >= DATE_SUB(NOW(), INTERVAL 5 YEAR)";
      billingGroupFormat = "%Y";
      billingDateFilter = "bill_date >= DATE_SUB(NOW(), INTERVAL 5 YEAR)";
    } else if (period === "monthly") {
      cdrGroupFormat = "%Y-%m";
      cdrDateFilter = "starttime >= DATE_SUB(NOW(), INTERVAL 12 MONTH)";
      billingGroupFormat = "%Y-%m";
      billingDateFilter = "bill_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)";
    } else {
      cdrGroupFormat = "%Y-%m-%d";
      cdrDateFilter = "starttime >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      billingGroupFormat = "%Y-%m-%d";
      billingDateFilter = "bill_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    }
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

    // Use sanitised values (Buffers already converted by queryVos)
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
    const totalClientBalance = Number(balanceResult[0]?.totalBalance ?? 0);  // Buffer→number handled by queryVos

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

    // --- Period-based Financial Breakdown (Revenue, Cost, Net Profit, Pending) ---
    let periodRevenue = 0;
    let periodCost = 0;
    let periodNetProfit = 0;
    let periodPendingAmount = 0;
    const financialByPeriod: Array<{period: string; revenue: number; cost: number; netProfit: number; pendingAmount: number; calls: number}> = [];
    
    try {
      // CDR: revenue & cost grouped by period
      const cdrPeriodRows = await queryVos<any>(
        `SELECT
          DATE_FORMAT(starttime, '${cdrGroupFormat}') AS period_label,
          COUNT(*) AS calls,
          COALESCE(SUM(incomefee), 0) AS revenue,
          COALESCE(SUM(fee), 0) AS cost
        FROM e_cdr
        WHERE ${cdrDateFilter}
        GROUP BY period_label
        ORDER BY period_label ASC`
      ) as any[];
      
      // Billing: pending amount grouped by period
      const billingPeriodRows = await queryVos<any>(
        `SELECT
          DATE_FORMAT(bill_date, '${billingGroupFormat}') AS period_label,
          COALESCE(SUM(CASE WHEN status = 0 THEN total_fee ELSE 0 END), 0) AS pending
        FROM e_billing
        WHERE ${billingDateFilter}
        GROUP BY period_label
        ORDER BY period_label ASC`
      ) as any[];
      
      // Build a map of billing pending by period
      const pendingMap = new Map<string, number>();
      for (const r of billingPeriodRows) {
        pendingMap.set(String(r.period_label), Number(r.pending || 0));
      }
      
      // Merge CDR and billing data
      for (const r of cdrPeriodRows) {
        const label = String(r.period_label);
        const revenue = Number(r.revenue || 0);
        const cost = Number(r.cost || 0);
        const pending = pendingMap.get(label) || 0;
        periodRevenue += revenue;
        periodCost += cost;
        periodPendingAmount += pending;
        financialByPeriod.push({
          period: label,
          revenue,
          cost,
          netProfit: revenue - cost,
          pendingAmount: pending,
          calls: Number(r.calls || 0),
        });
      }
      periodNetProfit = periodRevenue - periodCost;
    } catch { /* tables may not exist yet */ }

    // --- All-time Billing Summary ---
    let billingSummary = { totalBilled: 0, pendingBills: 0, pendingAmount: 0, topCustomers: [] as Array<{customerId:number;customerName:string;customerType:number;total:number;billCount:number;pending:number}> };
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

      // Top 5 customers by total billed — show real customer name from general/clearing accounts
      const topCust = await queryVos<any>(
        `SELECT
          b.customer_id,
          COALESCE(
            NULLIF(TRIM(c.name), ''),
            NULLIF(TRIM(c.account), ''),
            CONCAT('Account #', b.customer_id)
          ) AS customer_name,
          COALESCE(c.type, 0) AS customer_type,
          COALESCE(SUM(b.total_fee), 0) AS total,
          COUNT(*) AS bill_count,
          COALESCE(SUM(CASE WHEN b.status = 0 THEN b.total_fee ELSE 0 END), 0) AS pending
        FROM e_billing b
        LEFT JOIN e_customer c ON b.customer_id = c.id
        GROUP BY b.customer_id, c.name, c.account, c.type
        ORDER BY total DESC
        LIMIT 5`
      ) as any[];
      billingSummary.topCustomers = (topCust as any[]).map(r => ({
        customerId: Number(r.customer_id) || 0,
        customerName: String(r.customer_name || `Client #${Number(r.customer_id)}`),
        customerType: Number(r.customer_type) || 0,
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
      // Period-based financials
      period,
      periodRevenue,
      periodCost,
      periodNetProfit,
      periodPendingAmount,
      financialByPeriod,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({
      clientCount: 0, supplierCount: 0, totalCalls: 0, answeredCalls: 0,
      totalDuration: 0, totalRevenue: 0, totalCost: 0, totalMargin: 0,
      asr: 0, acd: 0, activeGateways: 0, unacknowledgedAlerts: 0,
      totalClientBalance: 0, topDestinations: [], cdrByStatus: [], hourlyTraffic: [],
      billingSummary: { totalBilled: 0, pendingBills: 0, pendingAmount: 0, topCustomers: [] },
      period: "daily", periodRevenue: 0, periodCost: 0, periodNetProfit: 0, periodPendingAmount: 0,
      financialByPeriod: [],
    });
  }
}
