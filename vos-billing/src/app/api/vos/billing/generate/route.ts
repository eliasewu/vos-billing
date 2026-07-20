import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function POST(_request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await _request.json();
    const date = body.date || new Date().toISOString().slice(0, 10);
    const dateObj = new Date(date + "T00:00:00");
    const partition =
      "e_cdr_" +
      dateObj.getFullYear() +
      String(dateObj.getMonth() + 1).padStart(2, "0") +
      String(dateObj.getDate()).padStart(2, "0");

    // 1. Check if CDR partition exists
    try {
      await queryVos(`SELECT 1 FROM ${partition} LIMIT 1`);
    } catch {
      return NextResponse.json({
        error: `No CDR data found for ${date}. Partition ${partition} does not exist.`,
      }, { status: 404 });
    }

    // 2. Get client accounts with rate groups
    const clients = await queryVos<any>(
      "SELECT id, name, account, money, feerategroup_id FROM e_customer WHERE type = 0 AND status = 0"
    ) as any[];

    if (clients.length === 0) {
      return NextResponse.json({ error: "No active client accounts found" }, { status: 404 });
    }

    // Build client maps: by account (for CDR matching) and by id (for billing insert)
    const clientByAccount = new Map<string, { id: number; name: string; rateGroupId: number }>();
    const clientById = new Map<number, { name: string }>();
    for (const c of clients) {
      const acct = String(c.account || "").trim();
      const cid = Number(c.id);
      clientById.set(cid, { name: String(c.name || "") });
      if (acct) {
        clientByAccount.set(acct, {
          id: cid,
          name: String(c.name || ""),
          rateGroupId: Number(c.feerategroup_id || 0),
        });
      }
    }

    // 3. Get all rates grouped by rate group (join for fakeminute from group)
    const allRates = await queryVos<any>(
      "SELECT r.feerategroup_id, r.feeprefix, r.fee, r.period, COALESCE(g.fakeminute, 60) AS fakeminute FROM e_feerate r LEFT JOIN e_feerategroup g ON r.feerategroup_id = g.id ORDER BY r.feeprefix DESC"
    ) as any[];

    const ratesByGroup = new Map<number, Array<{ prefix: string; fee: number; period: number; increment: number }>>();
    for (const r of allRates) {
      const gid = Number(r.feerategroup_id);
      if (!ratesByGroup.has(gid)) ratesByGroup.set(gid, []);
      ratesByGroup.get(gid)!.push({
        prefix: String(r.feeprefix || ""),
        fee: Number(r.fee || 0),
        period: Number(r.period || 60),
        increment: Number(r.fakeminute || 60),
      });
    }

    // Also get group-level fakeminute for fallback
    const groupIncrements = new Map<number, number>();
    try {
      const groups = await queryVos<any>("SELECT id, fakeminute FROM e_feerategroup") as any[];
      for (const g of groups) groupIncrements.set(Number(g.id), Number(g.fakeminute || 60));
    } catch { /* ignore */ }

    // 4. Get CDR records — use COALESCE for cross-version column name compatibility
    let cdrs: any[];
    try {
      cdrs = await queryVos<any>(
        `SELECT
          COALESCE(customeraccount, '') AS cdr_account,
          COALESCE(calleee164, callee, callednumber, '') AS cdr_callee,
          COALESCE(feetime, callduration, duration, 0) AS cdr_duration
        FROM ${partition}
        WHERE (customeraccount IS NOT NULL AND customeraccount != '')
          AND (callduration > 0 OR feetime > 0 OR duration > 0)`
      ) as any[];
    } catch {
      // Fallback: try simplified query without COALESCE
      cdrs = await queryVos<any>(
        `SELECT customeraccount, calleee164, feetime
        FROM ${partition}
        WHERE customeraccount IS NOT NULL AND customeraccount != ''
          AND feetime > 0`
      ) as any[];
    }

    if (cdrs.length === 0) {
      return NextResponse.json({ error: "No answered CDR records found for this date" }, { status: 404 });
    }

    // 5. Calculate charges per client (keyed by client id for billing insert)
    const billingMap = new Map<number, { calls: number; duration: number; fee: number }>();
    let matchedCount = 0;
    let skippedNoClient = 0;
    let skippedNoRate = 0;
    let skippedDuration = 0;

    for (const cdr of cdrs) {
      const cdrAccount = String(cdr.cdr_account || cdr.customeraccount || "").trim();
      if (!cdrAccount) continue;

      const client = clientByAccount.get(cdrAccount);
      if (!client) { skippedNoClient++; continue; }
      if (client.rateGroupId === 0) { skippedNoRate++; continue; }

      const groupRates = ratesByGroup.get(client.rateGroupId);
      if (!groupRates || groupRates.length === 0) { skippedNoRate++; continue; }

      const calledNum = String(cdr.cdr_callee || cdr.calleee164 || "");
      const duration = Number(cdr.cdr_duration || cdr.feetime || cdr.callduration || 0);
      if (duration <= 0) { skippedDuration++; continue; }

      // Find matching rate (longest prefix match)
      let matchedRate = groupRates[0];
      let bestLen = 0;
      for (const rate of groupRates) {
        if (calledNum.startsWith(rate.prefix) && rate.prefix.length > bestLen) {
          matchedRate = rate;
          bestLen = rate.prefix.length;
        }
      }

      // Calculate charge
      const increment = matchedRate.increment || groupIncrements.get(client.rateGroupId) || 60;
      const period = matchedRate.period || 60;
      const ratePerMin = matchedRate.fee || 0;
      if (ratePerMin <= 0) continue;

      // Billing calculation: round up to nearest increment, then charge per period units
      const billedSeconds = Math.ceil(duration / increment) * increment;
      const periodUnits = Math.max(1, Math.ceil(billedSeconds / period));
      const charge = (periodUnits * period / 60) * ratePerMin;

      const existing = billingMap.get(client.id);
      if (existing) {
        existing.calls++;
        existing.duration += duration;
        existing.fee += charge;
      } else {
        billingMap.set(client.id, { calls: 1, duration, fee: charge });
      }
      matchedCount++;
    }

    // 6. Insert billing records
    let created = 0;
    for (const [customerId, data] of billingMap) {
      const client = clientById.get(customerId);
      const clientName = client?.name || `Client #${customerId}`;
      const memo = `Auto-generated from CDR ${date} — ${data.calls} calls, ${data.duration}s`;
      await executeVos(
        "INSERT INTO e_billing (customer_id, bill_date, total_calls, total_duration, total_fee, status, memo) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [customerId, date, data.calls, data.duration, parseFloat(data.fee.toFixed(4)), 0, memo]
      );
      created++;
    }

    const totalFee = Array.from(billingMap.values()).reduce((s, d) => s + d.fee, 0);
    const totalCalls = Array.from(billingMap.values()).reduce((s, d) => s + d.calls, 0);

    return NextResponse.json({
      success: true,
      date,
      partition,
      clients: clients.length,
      cdrsProcessed: cdrs.length,
      matched: matchedCount,
      billsCreated: created,
      totalCalls,
      totalFee: parseFloat(totalFee.toFixed(4)),
      skipped: { noClient: skippedNoClient, noRate: skippedNoRate, noDuration: skippedDuration },
      message: `Generated ${created} bills from ${matchedCount} matched CDR records for ${date}`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
