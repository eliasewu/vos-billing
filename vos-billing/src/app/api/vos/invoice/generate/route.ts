import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { sendInvoiceEmail } from "@/lib/email";

function getCdrPartitions(startDate: string, endDate: string): string[] {
  const partitions: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const d = new Date(start);
  while (d <= end) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    partitions.push(`e_cdr_${y}${m}${day}`);
    d.setDate(d.getDate() + 1);
  }
  return partitions;
}

async function findExistingPartitions(partitions: string[]): Promise<string[]> {
  if (partitions.length === 0) return [];
  const placeholders = partitions.map(() => "?").join(",");
  try {
    const rows = await queryVos<any>(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'vos3000' AND TABLE_NAME IN (${placeholders})`,
      partitions
    ) as any[];
    return rows.map((r: any) => r.TABLE_NAME);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const customerId = parseInt(body.customerId) || 0;
    const startDate = body.startDate || "";
    const endDate = body.endDate || "";
    const download = body.download === true;
    const pdfFormat = body.pdf === true;
    const sendEmail = body.email === true;

    if (!customerId) return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    if (!startDate || !endDate) return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });

    // Get customer info with contact details from memo JSON
    const [customer] = await queryVos<any>(
      "SELECT id, account, name, money, limitmoney, feerategroup_id, alarmemail, memo, type FROM e_customer WHERE id = ?",
      [customerId]
    );
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const customerAccount = String(customer.account || "").trim();
    const rateGroupId = Number(customer.feerategroup_id || 0);

    // Parse contact details from memo JSON
    let contact: Record<string, string> = {};
    try { if (customer.memo) contact = JSON.parse(customer.memo); } catch { if (customer.memo) contact = { remark: String(customer.memo).trim() }; }

    // Get rates for the customer's rate group
    let rates: any[] = [];
    let increment = 60; // default billing increment in seconds
    if (rateGroupId > 0) {
      rates = await queryVos<any>(
        "SELECT feeprefix, areacode, fee, period FROM e_feerate WHERE feerategroup_id = ? ORDER BY feeprefix DESC",
        [rateGroupId]
      ) as any[];
      const [group] = await queryVos<any>(
        "SELECT fakeminute FROM e_feerategroup WHERE id = ?",
        [rateGroupId]
      ) as any[];
      if (group) increment = Number(group.fakeminute || 60);
    }

    // Build prefix → {areacode, areaName} lookup from rates + e_areacode
    const prefixAreacodeMap = new Map<string, { areacode: string; areaName: string }>();
    for (const rate of rates) {
      const prefix = String(rate.feeprefix || "");
      if (prefix && !prefixAreacodeMap.has(prefix)) {
        prefixAreacodeMap.set(prefix, { areacode: String(rate.areacode || ""), areaName: "" });
      }
    }
    // Resolve area names from e_areacode
    if (prefixAreacodeMap.size > 0) {
      try {
        const areaCodes = [...new Set([...prefixAreacodeMap.values()].map(v => v.areacode).filter(Boolean))];
        if (areaCodes.length > 0) {
          const areaRows = await queryVos<any>(
            `SELECT areacode, location FROM e_areacode WHERE areacode IN (${areaCodes.map(() => "?").join(",")})`,
            areaCodes
          ) as any[];
          const areaNameMap = new Map<string, string>();
          for (const r of areaRows) areaNameMap.set(String(r.areacode), String(r.location || ""));
          for (const [prefix, val] of prefixAreacodeMap) {
            if (val.areacode) val.areaName = areaNameMap.get(val.areacode) || "";
          }
        }
      } catch {}
    }

    // Get CDR partitions
    const allPartitions = getCdrPartitions(startDate, endDate);
    const existingPartitions = await findExistingPartitions(allPartitions);

    if (existingPartitions.length === 0) {
      return NextResponse.json({
        customer: { id: customerId, account: customerAccount, name: customer.name, balance: Number(customer.money || 0), creditLimit: Number(customer.limitmoney || 0), rateGroupId, email: customer.alarmemail || "", phone: contact.phone || "", company: contact.company || "", address: contact.address || "", bankAccount: contact.bankAccount || contact.bank || "" },
        invoice: { startDate, endDate, calls: 0, totalDuration: 0, totalCost: 0, items: [], areaSummary: [], partitions: 0 },
        message: "No CDR data found for this date range",
      });
    }

    // Query CDR data for this customer across all existing partitions
    const unionQuery = existingPartitions.map(t =>
      `SELECT customeraccount, calleee164, feetime, fee, starttime, stoptime, endreason FROM ${t} WHERE customeraccount = ?`
    ).join(" UNION ALL ");

    const params = existingPartitions.map(() => customerAccount);
    let cdrs: any[] = [];
    try {
      cdrs = await queryVos<any>(unionQuery, params) as any[];
    } catch {
      // Try fallback column names
      try {
        const fallbackQuery = existingPartitions.map(t =>
          `SELECT customeraccount, calleee164 AS calleedest, feetime AS duration, fee, starttime, stoptime, endreason FROM ${t} WHERE customeraccount = ?`
        ).join(" UNION ALL ");
        cdrs = await queryVos<any>(fallbackQuery, params) as any[];
      } catch {
        cdrs = [];
      }
    }

    // Calculate charges
    const invoiceItems: {
      callee: string;
      startTime: string;
      duration: number;
      rateUsed: number;
      charge: number;
      endReason: number;
      matchedPrefix: string;
    }[] = [];

    // Area/Prefix summary tracking
    const areaSummaryMap = new Map<string, { prefix: string; areacode: string; areaName: string; calls: number; totalDuration: number; totalCost: number }>();

    let totalDuration = 0;
    let totalCost = 0;

    for (const cdr of cdrs) {
      const callee = String(cdr.calleee164 || cdr.calleedest || "");
      const duration = Number(cdr.feetime || cdr.duration || 0);
      const startTime = cdr.starttime ? new Date(Number(cdr.starttime) * 1000).toISOString() : "";
      const endReason = Number(cdr.endreason || 0);

      if (duration <= 0) continue;

      // Longest prefix match
      let matchedRate = 0;
      let matchedPeriod = 60;
      let bestLen = 0;
      let matchedPrefix = "";
      for (const rate of rates) {
        const prefix = String(rate.feeprefix || "");
        if (callee.startsWith(prefix) && prefix.length > bestLen) {
          matchedRate = Number(rate.fee || 0);
          matchedPeriod = Number(rate.period || 60);
          bestLen = prefix.length;
          matchedPrefix = prefix;
        }
      }

      // If no rate matched, use the first rate as default (shortest prefix)
      if (matchedRate === 0 && rates.length > 0) {
        const defaultRate = rates[rates.length - 1];
        matchedRate = Number(defaultRate.fee || 0);
        matchedPeriod = Number(defaultRate.period || 60);
        matchedPrefix = String(defaultRate.feeprefix || "");
      }

      const period = matchedPeriod || 60;
      const billedSeconds = Math.ceil(duration / increment) * increment;
      const units = Math.max(1, Math.ceil(billedSeconds / period));
      const charge = (units * period / 60) * matchedRate;

      totalDuration += duration;
      totalCost += charge;

      invoiceItems.push({
        callee,
        startTime,
        duration,
        rateUsed: matchedRate,
        charge: parseFloat(charge.toFixed(6)),
        endReason,
        matchedPrefix,
      });

      // Aggregate area/prefix summary
      const areaKey = matchedPrefix || "Other";
      if (!areaSummaryMap.has(areaKey)) {
        const areaInfo = prefixAreacodeMap.get(areaKey) || { areacode: "", areaName: "" };
        areaSummaryMap.set(areaKey, { prefix: areaKey, areacode: areaInfo.areacode, areaName: areaInfo.areaName, calls: 0, totalDuration: 0, totalCost: 0 });
      }
      const summary = areaSummaryMap.get(areaKey)!;
      summary.calls++;
      summary.totalDuration += duration;
      summary.totalCost += charge;
    }

    // Build sorted area/prefix summary array
    const areaSummary = [...areaSummaryMap.values()].sort((a, b) => b.totalCost - a.totalCost);

    const result = {
      customer: {
        id: customerId,
        account: customerAccount,
        name: customer.name,
        balance: Number(customer.money || 0),
        creditLimit: Number(customer.limitmoney || 0),
        rateGroupId,
        email: customer.alarmemail || "",
        phone: contact.phone || "",
        company: contact.company || "",
        address: contact.address || "",
        bankAccount: contact.bankAccount || contact.bank || "",
      },
      invoice: {
        startDate,
        endDate,
        calls: invoiceItems.length,
        totalDuration,
        totalCost: parseFloat(totalCost.toFixed(4)),
        increment,
        items: (download || pdfFormat || sendEmail) ? invoiceItems : invoiceItems.slice(0, 100),
        areaSummary: areaSummary.map(s => ({ ...s, totalCost: parseFloat(s.totalCost.toFixed(4)) })),
        partitions: existingPartitions.length,
        hasMore: invoiceItems.length > 100,
      },
    };

    // If PDF format requested, generate and return PDF
    if (pdfFormat) {
      const invoiceNumber = `INV-${customerAccount}-${startDate.replace(/-/g, "")}-${endDate.replace(/-/g, "")}`;
      const pdfDoc = generateInvoicePDF({
        customer: result.customer as any,
        invoice: { ...result.invoice, invoiceNumber },
        createdBy: user.username || "System",
      });

      const chunks: Buffer[] = [];
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));

      return new Promise<NextResponse>((resolve) => {
        pdfDoc.on("end", () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(new NextResponse(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="invoice_${customerAccount}_${startDate}_${endDate}.pdf"`,
            },
          }));
        });
        pdfDoc.end();
      });
    }
    if (download) {
      const csvLines = ["Caller,Start Time,Duration (s),Rate/Min,Charge,End Reason"];
      for (const item of invoiceItems) {
        csvLines.push([
          `"${item.callee}"`,
          item.startTime,
          item.duration,
          item.rateUsed.toFixed(4),
          item.charge.toFixed(6),
          item.endReason,
        ].join(","));
      }
      csvLines.push("");
      csvLines.push(`Total Calls,${invoiceItems.length}`);
      csvLines.push(`Total Duration (s),${totalDuration}`);
      csvLines.push(`Total Cost,${totalCost.toFixed(4)}`);
      csvLines.push(`Customer,${customer.name}`);
      csvLines.push(`Period,${startDate} to ${endDate}`);

      return new NextResponse(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=invoice_${customerAccount}_${startDate}_${endDate}.csv`,
        },
      });
    }

    // If email requested, generate PDF and send via email
    if (sendEmail) {
      const customerEmail = customer.alarmemail || contact.email || "";
      if (!customerEmail) {
        return NextResponse.json({ error: "No email address found for this customer. Please set an alarm email or add email to contact details." }, { status: 400 });
      }

      const invoiceNumber = `INV-${customerAccount}-${startDate.replace(/-/g, "")}-${endDate.replace(/-/g, "")}`;
      const pdfDoc = generateInvoicePDF({
        customer: result.customer as any,
        invoice: { ...result.invoice, invoiceNumber, areaSummary: result.invoice.areaSummary },
        createdBy: user.username || "System",
      });

      const chunks: Buffer[] = [];
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));

      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.end();
      });

      const emailResult = await sendInvoiceEmail(
        customerEmail,
        customer.name,
        invoiceNumber,
        startDate,
        endDate,
        pdfBuffer,
        {
          calls: result.invoice.calls,
          totalDuration: `${result.invoice.totalDuration}s`,
          totalCost: `$${result.invoice.totalCost.toFixed(4)}`,
        }
      );

      if (emailResult.success) {
        return NextResponse.json({ ...result, emailSent: true, emailMessage: `Invoice emailed to ${customerEmail}` });
      } else {
        return NextResponse.json({ ...result, emailError: emailResult.message });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invoice generation failed" },
      { status: 500 }
    );
  }
}
