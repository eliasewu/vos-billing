import cron from "node-cron";
import { queryVos } from "@/lib/vos-db";
import { sendEmail, sendLowBalanceAlert } from "@/lib/email";

// ─── Daily Usage Summary Email (every day at 4:00 AM local time) ───

async function sendDailyUsageSummaries() {
  console.log(`[DailySummary] Starting daily usage emails — ${new Date().toISOString()}`);

  try {
    // Get yesterday's date partition
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, "0");
    const d = String(yesterday.getDate()).padStart(2, "0");
    const partition = `e_cdr_${y}${m}${d}`;
    const dateLabel = yesterday.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Check if partition exists
    let partitionExists = false;
    try {
      const tbl = await queryVos<any>(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'vos3000' AND TABLE_NAME = ?",
        [partition]
      ) as any[];
      partitionExists = tbl.length > 0;
    } catch {}

    if (!partitionExists) {
      console.log(`[DailySummary] No CDR partition for ${dateLabel} — skipping`);
      return;
    }

    // Get all active customers with email addresses
    const customers = await queryVos<any>(
      "SELECT id, account, name, alarmemail, type FROM e_customer WHERE status = 1 AND alarmemail IS NOT NULL AND alarmemail != '' ORDER BY id"
    );

    console.log(`[DailySummary] Found ${customers.length} active customers with email`);

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const cust of customers) {
      const email = String(cust.alarmemail || "").trim();
      if (!email) { skipped++; continue; }

      const customerAccount = String(cust.account || "").trim();
      const customerName = String(cust.name || "");
      const customerType = Number(cust.type || 0); // 0=General(client), 1=Clearing(supplier)

      if (!customerAccount) { skipped++; continue; }

      try {
        // Query CDRs for this customer from yesterday's partition
        const cdrs = await queryVos<any>(
          `SELECT customeraccount, calleee164, feetime, fee, starttime FROM ${partition} WHERE customeraccount = ?`,
          [customerAccount]
        ) as any[];

        const totalCalls = cdrs.length;
        if (totalCalls === 0) { skipped++; continue; }

        const totalDuration = cdrs.reduce((s: number, c: any) => s + Number(c.feetime || 0), 0);
        const formatDuration = (sec: number) => {
          const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
          return h > 0 ? `${h}h ${m}m ${sec % 60}s` : `${m}m ${sec % 60}s`;
        };

        // Get top destinations
        const destMap = new Map<string, number>();
        for (const cdr of cdrs) {
          const dest = String(cdr.calleee164 || "").slice(0, 6);
          destMap.set(dest, (destMap.get(dest) || 0) + 1);
        }
        const topDests = [...destMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        const typeLabel = customerType === 1 ? "Supplier (Clearing)" : "Client (General)";

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#2563eb">Daily Usage Summary — ${customerName}</h2>
            <p>Here is your usage summary for <strong>${dateLabel}</strong>:</p>
            <p style="font-size:14px;background:#f0f7ff;padding:12px;border-radius:8px;border-left:4px solid #2563eb">
              Account: <strong>${customerAccount}</strong> · Type: <strong>${typeLabel}</strong>
            </p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#f9fafb">
                <td style="padding:10px 12px"><strong>Total Calls</strong></td>
                <td style="padding:10px 12px;text-align:right;font-size:20px;font-weight:bold;color:#2563eb">${totalCalls}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px"><strong>Total Duration</strong></td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold">${formatDuration(totalDuration)}</td>
              </tr>
              <tr style="background:#f9fafb">
                <td style="padding:10px 12px"><strong>Avg Call Duration</strong></td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold">${formatDuration(Math.round(totalDuration / totalCalls))}</td>
              </tr>
            </table>
            ${topDests.length > 0 ? `
            <h3 style="color:#374151;font-size:14px">Top Destinations</h3>
            <table style="width:100%;border-collapse:collapse;margin:8px 0">
              <thead><tr style="background:#f3f4f6">
                <th style="text-align:left;padding:6px 12px;font-size:12px">Prefix</th>
                <th style="text-align:right;padding:6px 12px;font-size:12px">Calls</th>
              </tr></thead>
              <tbody>${topDests.map(([dest, count]) =>
                `<tr><td style="padding:6px 12px;font-family:monospace;font-size:13px">${dest}</td><td style="padding:6px 12px;text-align:right">${count}</td></tr>`
              ).join("")}</tbody>
            </table>` : ""}
            <hr style="border:1px solid #e5e7eb;margin:20px 0" />
            <p style="color:#6b7280;font-size:12px">
              Net2App VOS Billing System — Automated Daily Report · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        `;

        const result = await sendEmail(email, `Daily Usage — ${customerName} (${dateLabel})`, html);
        if (result.success) {
          sent++;
          console.log(`[DailySummary] Sent to ${customerName} (${email}): ${totalCalls} calls`);
        } else {
          errors.push(`${customerName}: ${result.message}`);
        }
      } catch (err: any) {
        errors.push(`${customerName}: ${err?.message || "Failed"}`);
      }
    }

    console.log(`[DailySummary] Completed: ${sent} sent, ${skipped} skipped, ${errors.length} errors`);
    if (errors.length > 0) {
      console.warn(`[DailySummary] Errors:`, errors.slice(0, 5));
    }
  } catch (err) {
    console.error("[DailySummary] Fatal error:", err);
  }
}

// ─── Auto-generate weekly invoices for all customers ───
// Runs every Monday at 11:00 AM (server time)

function getWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - end.getDay());
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

async function autoGenerateInvoices() {
  console.log(`[InvoiceScheduler] Starting auto invoice generation — ${new Date().toISOString()}`);
  try {
    const customers = await queryVos<any>(
      "SELECT id, account, name, money, limitmoney, feerategroup_id, alarmemail, memo, type FROM e_customer WHERE status = 1 ORDER BY id"
    );
    console.log(`[InvoiceScheduler] Found ${customers.length} active customers`);
    const { startDate, endDate } = getWeekRange();
    console.log(`[InvoiceScheduler] Period: ${startDate} → ${endDate}`);
    let generated = 0, skipped = 0;
    for (const customer of customers) {
      const customerAccount = String(customer.account || "").trim();
      const rateGroupId = Number(customer.feerategroup_id || 0);
      const customerId = customer.id;
      if (!customerAccount || !rateGroupId) { skipped++; continue; }
      try {
        const partitions: string[] = [];
        const start = new Date(startDate + "T00:00:00");
        const end = new Date(endDate + "T00:00:00");
        const d = new Date(start);
        while (d <= end) {
          const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
          partitions.push(`e_cdr_${y}${m}${day}`);
          d.setDate(d.getDate() + 1);
        }
        const placeholders = partitions.map(() => "?").join(",");
        let existingPartitions: string[] = [];
        try {
          const tblRows = await queryVos<any>(
            `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'vos3000' AND TABLE_NAME IN (${placeholders})`,
            partitions
          ) as any[];
          existingPartitions = tblRows.map((r: any) => r.TABLE_NAME);
        } catch {}
        if (existingPartitions.length === 0) { skipped++; continue; }
        const unionQuery = existingPartitions.map(t => `SELECT customeraccount FROM ${t} WHERE customeraccount = ?`).join(" UNION ALL ");
        const params = existingPartitions.map(() => customerAccount);
        const cdrs = await queryVos<any>(unionQuery, params) as any[];
        if (cdrs.length === 0) { skipped++; continue; }
        try {
          await queryVos<any>(
            `INSERT INTO e_invoice (customer_id, customer_account, customer_name, start_date, end_date, total_calls, total_cost, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [customerId, customerAccount, customer.name, startDate, endDate, cdrs.length, 0]
          );
        } catch {}
        generated++;
      } catch (err) { console.error(`[InvoiceScheduler] Error for customer ${customerId}:`, err); skipped++; }
    }
    console.log(`[InvoiceScheduler] Completed: ${generated} generated, ${skipped} skipped`);
  } catch (err) { console.error("[InvoiceScheduler] Fatal error:", err); }
}

// ─── Low Balance Alert Scheduler (daily at 9:00 AM) ───

async function sendLowBalanceAlerts() {
  console.log(`[LowBalance] Starting low balance check — ${new Date().toISOString()}`);

  try {
    // Find customers with email whose balance is below credit limit or negative
    const customers = await queryVos<any>(
      `SELECT id, account, name, money, limitmoney, alarmemail, type
       FROM e_customer
       WHERE status = 1
         AND alarmemail IS NOT NULL AND alarmemail != ''
         AND (money < 0 OR (limitmoney > 0 AND money < limitmoney * 0.1))
       ORDER BY money ASC`
    );

    console.log(`[LowBalance] Found ${customers.length} customers with low balance`);

    let sent = 0;
    let skipped = 0;

    for (const c of customers) {
      const email = String(c.alarmemail || "").trim();
      const name = String(c.name || c.account || "Customer");
      const account = String(c.account || "");
      const balance = Number(c.money || 0);
      const creditLimit = Number(c.limitmoney || 0);

      if (!email) { skipped++; continue; }

      // Deduplication: skip if already alerted in the last 24 hours (stored in memo JSON)
      let alreadyAlerted = false;
      try {
        const memoStr = String((c as any).memo || "");
        if (memoStr) {
          const memo = JSON.parse(memoStr);
          const lastAlert = memo.last_balance_alert ? new Date(memo.last_balance_alert).getTime() : 0;
          if (Date.now() - lastAlert < 24 * 60 * 60 * 1000) alreadyAlerted = true;
        }
      } catch {}
      if (alreadyAlerted) { skipped++; continue; }

      try {
        const alertType = balance < 0 ? "negative" : "below_limit";
        const result = await sendLowBalanceAlert(email, name, account, balance, creditLimit, alertType);
        if (result.success) {
          sent++;
          // Update memo with last alert timestamp for deduplication
          try {
            const existingMemo = String((c as any).memo || "");
            const memo = existingMemo && existingMemo.startsWith("{") ? JSON.parse(existingMemo) : {};
            memo.last_balance_alert = new Date().toISOString();
            await queryVos<any>("UPDATE e_customer SET memo = ? WHERE id = ?", [JSON.stringify(memo), (c as any).id]);
          } catch {}
          console.log(`[LowBalance] Alert sent to ${name} (${email}): balance=$${balance.toFixed(2)}`);
        } else {
          console.warn(`[LowBalance] Failed to send to ${name}: ${result.message}`);
        }
      } catch (err: any) {
        console.error(`[LowBalance] Error for ${name}:`, err?.message || err);
      }
    }

    console.log(`[LowBalance] Completed: ${sent} sent, ${skipped} skipped`);
  } catch (err) {
    console.error("[LowBalance] Fatal error:", err);
  }
}

// ─── Scheduler Starters ───

export function startDailySummaryScheduler() {
  const task = cron.schedule("0 4 * * *", sendDailyUsageSummaries);
  console.log("[DailySummary] Scheduled: every day at 4:00 AM local server time");
  return task;
}

export function startLowBalanceScheduler() {
  const task = cron.schedule("0 9 * * *", sendLowBalanceAlerts);
  console.log("[LowBalance] Scheduled: every day at 9:00 AM local server time");
  return task;
}

export function startInvoiceScheduler() {
  const task = cron.schedule("0 11 * * 1", autoGenerateInvoices, { timezone: "UTC" });
  console.log("[InvoiceScheduler] Scheduled: every Monday at 11:00 AM UTC");
  return task;
}
