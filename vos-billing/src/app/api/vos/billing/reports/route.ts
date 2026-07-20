import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("from") || "";
    const dateTo = searchParams.get("to") || "";

    // Build date filter
    let dateWhere = "";
    const params: string[] = [];
    if (dateFrom) {
      dateWhere += " WHERE b.bill_date >= ?";
      params.push(dateFrom);
    }
    if (dateTo) {
      dateWhere += dateWhere ? " AND b.bill_date <= ?" : " WHERE b.bill_date <= ?";
      params.push(dateTo);
    }

    // 1. Summary stats
    const summarySql = `SELECT
      COUNT(*) AS total_bills,
      COALESCE(SUM(b.total_fee), 0) AS total_fee,
      COALESCE(SUM(b.total_calls), 0) AS total_calls,
      COALESCE(SUM(b.total_duration), 0) AS total_duration,
      COUNT(DISTINCT b.customer_id) AS customer_count,
      COALESCE(SUM(CASE WHEN b.status = 0 THEN b.total_fee ELSE 0 END), 0) AS pending_fee,
      COALESCE(SUM(CASE WHEN b.status = 0 THEN 1 ELSE 0 END), 0) AS pending_count,
      COALESCE(SUM(CASE WHEN b.status = 1 THEN b.total_fee ELSE 0 END), 0) AS paid_fee,
      COALESCE(SUM(CASE WHEN b.status = 1 THEN 1 ELSE 0 END), 0) AS paid_count
    FROM e_billing b${dateWhere}`;

    const [summary] = await queryVos<any>(summarySql, params) as any[];

    // 2. Per-customer aggregation
    const customerSql = `SELECT
      b.customer_id,
      c.name AS customer_name,
      COUNT(*) AS bill_count,
      COALESCE(SUM(b.total_fee), 0) AS total_fee,
      COALESCE(SUM(b.total_calls), 0) AS total_calls,
      COALESCE(SUM(b.total_duration), 0) AS total_duration,
      COALESCE(SUM(CASE WHEN b.status = 0 THEN b.total_fee ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN b.status = 1 THEN b.total_fee ELSE 0 END), 0) AS paid
    FROM e_billing b
    LEFT JOIN e_customer c ON b.customer_id = c.id${dateWhere}
    GROUP BY b.customer_id, c.name
    ORDER BY total_fee DESC`;

    const customers = await queryVos<any>(customerSql, params) as any[];

    // 3. Daily trend
    const dailySql = `SELECT
      b.bill_date,
      COUNT(*) AS bill_count,
      COALESCE(SUM(b.total_fee), 0) AS total_fee,
      COALESCE(SUM(b.total_calls), 0) AS total_calls,
      COALESCE(SUM(b.total_duration), 0) AS total_duration
    FROM e_billing b${dateWhere}
    GROUP BY b.bill_date
    ORDER BY b.bill_date DESC
    LIMIT 60`;

    const daily = await queryVos<any>(dailySql, params) as any[];

    // 4. Monthly aggregation
    const monthlySql = `SELECT
      DATE_FORMAT(b.bill_date, '%Y-%m') AS month,
      COUNT(*) AS bill_count,
      COALESCE(SUM(b.total_fee), 0) AS total_fee,
      COALESCE(SUM(b.total_calls), 0) AS total_calls
    FROM e_billing b${dateWhere}
    GROUP BY DATE_FORMAT(b.bill_date, '%Y-%m')
    ORDER BY month DESC
    LIMIT 24`;

    const monthly = await queryVos<any>(monthlySql, params) as any[];

    return NextResponse.json({
      summary: {
        totalBills: Number(summary?.total_bills || 0),
        totalFee: Number(summary?.total_fee || 0),
        totalCalls: Number(summary?.total_calls || 0),
        totalDuration: Number(summary?.total_duration || 0),
        customerCount: Number(summary?.customer_count || 0),
        pendingFee: Number(summary?.pending_fee || 0),
        pendingCount: Number(summary?.pending_count || 0),
        paidFee: Number(summary?.paid_fee || 0),
        paidCount: Number(summary?.paid_count || 0),
      },
      customers: (customers as any[]).map(r => ({
        customerId: r.customer_id,
        customerName: r.customer_name || `Client #${r.customer_id}`,
        billCount: Number(r.bill_count || 0),
        totalFee: Number(r.total_fee || 0),
        totalCalls: Number(r.total_calls || 0),
        totalDuration: Number(r.total_duration || 0),
        pending: Number(r.pending || 0),
        paid: Number(r.paid || 0),
      })),
      daily: (daily as any[]).reverse().map(r => ({
        date: r.bill_date,
        billCount: Number(r.bill_count || 0),
        totalFee: Number(r.total_fee || 0),
        totalCalls: Number(r.total_calls || 0),
        totalDuration: Number(r.total_duration || 0),
      })),
      monthly: (monthly as any[]).reverse().map(r => ({
        month: r.month,
        billCount: Number(r.bill_count || 0),
        totalFee: Number(r.total_fee || 0),
        totalCalls: Number(r.total_calls || 0),
      })),
      filters: { dateFrom, dateTo },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
