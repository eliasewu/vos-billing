import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const accountId = parseInt(id);

    // Account core info
    const [acct] = await queryVos<any>(
      `SELECT c.*, g.name AS rate_group_name, gp.name AS private_rate_name
       FROM e_customer c
       LEFT JOIN e_feerategroup g ON c.feerategroup_id = g.id
       LEFT JOIN e_feerategroup gp ON c.feerategroupprivate_id = gp.id
       WHERE c.id = ?`,
      [accountId]
    ) as any[];
    if (!acct) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // Parse contact
    let contact: Record<string, string> = {};
    try { if (acct.memo) contact = JSON.parse(acct.memo); } catch { if (acct.memo) contact = { remark: String(acct.memo).trim() }; }

    // Gateway counts
    const mappingGws = await queryVos<any>("SELECT id, name, remoteips, capacity, locktype FROM e_gatewaymapping WHERE customer_id = ? ORDER BY id DESC", [accountId]) as any[];
    const routingGws = await queryVos<any>("SELECT id, name, remoteips, capacity, locktype FROM e_gatewayrouting WHERE clearingcustomer_id = ? ORDER BY id DESC", [accountId]) as any[];

    // Phones
    const phones = await queryVos<any>("SELECT id, e164, password, capacity, locktype FROM e_phone WHERE customer_id = ? ORDER BY id DESC LIMIT 50", [accountId]) as any[];

    // Recent CDRs (last 7 days across partitions)
    const now = new Date();
    const partitions: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      partitions.push(`e_cdr_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
    }
    const placeholders = partitions.map(() => "?").join(",");
    let existingParts: string[] = [];
    try {
      const tblRows = await queryVos<any>(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'vos3000' AND TABLE_NAME IN (${placeholders})`,
        partitions
      ) as any[];
      existingParts = tblRows.map(r => r.TABLE_NAME);
    } catch {}

    const cdrAccount = String(acct.account || "");
    let cdrs: any[] = [];
    let cdrTotal = 0;
    if (existingParts.length > 0) {
      const unionParts = existingParts.map(t =>
        `SELECT flowno, callere164, calleee164, starttime, stoptime, feetime, fee, tax, customeraccount, customername, endreason, enddirection, callergatewayid, calleegatewayid FROM ${t}`
      ).join(" UNION ALL ");
      const cdrWhere = " WHERE (customeraccount = ? OR callere164 LIKE ? OR calleee164 LIKE ?)";
      const cdrLike = `%${cdrAccount}%`;

      const [stats] = await queryVos<any>(
        `SELECT COUNT(*) AS total, COALESCE(SUM(fee),0) AS total_fee FROM (${unionParts}) AS cdr_union ${cdrWhere}`,
        [cdrAccount, cdrLike, cdrLike]
      ) as any[];
      cdrTotal = stats?.total || 0;

      const cdrRows = await queryVos<any>(
        `SELECT * FROM (${unionParts}) AS cdr_union ${cdrWhere} ORDER BY starttime DESC LIMIT 100`,
        [cdrAccount, cdrLike, cdrLike]
      ) as any[];
      cdrs = cdrRows.map((r: any) => ({
        flowno: r.flowno, caller: r.callere164, callee: r.calleee164,
        starttime: r.starttime, stoptime: r.stoptime, feetime: r.feetime,
        fee: Number(r.fee || 0), tax: Number(r.tax || 0),
        customeraccount: r.customeraccount, customername: r.customername,
        endreason: r.endreason, enddirection: r.enddirection,
        callergatewayid: r.callergatewayid, calleegatewayid: r.calleegatewayid,
      }));
    }

    // Payment history
    let payments: any[] = [];
    try {
      payments = await queryVos<any>("SELECT id, money, memo, createtime FROM e_payment WHERE customer_id = ? ORDER BY createtime DESC LIMIT 50", [accountId]) as any[];
    } catch {}

    // Today consumption
    const [today] = await queryVos<any>(
      "SELECT COALESCE(SUM(total_fee),0) AS today_fee, COALESCE(SUM(total_calls),0) AS today_calls FROM e_report_daily WHERE customer_id = ? AND report_date = CURDATE()",
      [accountId]
    ) as any[];

    // 7-day consumption
    const [weekStats] = await queryVos<any>(
      "SELECT COALESCE(SUM(total_fee),0) AS week_fee, COALESCE(SUM(total_calls),0) AS week_calls FROM e_report_daily WHERE customer_id = ? AND report_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
      [accountId]
    ) as any[];

    const account = {
      id: acct.id,
      account: acct.account,
      name: acct.name,
      money: Number(acct.money || 0),
      limitmoney: Number(acct.limitmoney || 0),
      type: acct.type,
      status: acct.status,
      starttime: acct.starttime,
      lastupdatetime: acct.lastupdatetime,
      feerateGroupId: acct.feerategroup_id || 0,
      feerateGroupName: acct.rate_group_name || null,
      privateRateName: acct.private_rate_name || null,
      feerateGroup2Name: null,
      feerateGroup3Name: null,
      email: acct.alarmemail || "",
      phone: contact.phone || "",
      company: contact.company || "",
      address: contact.address || "",
      bankAccount: contact.bankAccount || contact.bank || "",
      cc: contact.cc || "",
      bcc: contact.bcc || "",
      mappingGateways: mappingGws.map((g: any) => ({ id: g.id, name: g.name, ips: g.remoteips, capacity: g.capacity, active: (g.locktype || 0) === 0 })),
      routingGateways: routingGws.map((g: any) => ({ id: g.id, name: g.name, ips: g.remoteips, capacity: g.capacity, active: (g.locktype || 0) === 0 })),
      phones: phones.map((p: any) => ({ id: p.id, e164: p.e164, password: p.password, capacity: p.capacity, status: Number(p.locktype || 0) === 0 ? 1 : 0 })),
      cdrs,
      cdrTotal,
      payments: payments.map((p: any) => ({ id: p.id, amount: Number(p.money || 0), memo: p.memo || "", time: p.createtime })),
      todayCalls: Number(today?.today_calls || 0),
      todayFee: Number(today?.today_fee || 0),
      weekCalls: Number(weekStats?.week_calls || 0),
      weekFee: Number(weekStats?.week_fee || 0),
    };

    return NextResponse.json({ account });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();

    // Support partial update for status toggle and field edits
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.status !== undefined) {
      fields.push("status = ?");
      values.push(Number(body.status));
    }
    if (body.money !== undefined) {
      fields.push("money = ?");
      values.push(Number(body.money));
    }
    if (body.limitmoney !== undefined) {
      fields.push("limitmoney = ?");
      values.push(Number(body.limitmoney));
    }
    if (body.name !== undefined) {
      fields.push("name = ?");
      values.push(String(body.name));
    }
    if (body.account !== undefined) {
      fields.push("account = ?");
      values.push(String(body.account));
    }
    if (body.type !== undefined) {
      fields.push("type = ?");
      values.push(Number(body.type));
    }
    if (body.feerateGroupId !== undefined) {
      fields.push("feerategroup_id = ?");
      values.push(Number(body.feerateGroupId));
    }
    if (body.email !== undefined) {
      fields.push("alarmemail = ?");
      values.push(String(body.email));
    }

    // Contact details: build memo JSON merging with existing
    const hasContact = body.phone !== undefined || body.company !== undefined || body.address !== undefined ||
        body.bankAccount !== undefined || body.cc !== undefined || body.bcc !== undefined;
    if (hasContact) {
      const contactVals = [body.phone, body.company, body.address, body.bankAccount, body.cc, body.bcc]
        .map(v => v !== undefined ? String(v).trim() : "");
      const hasNonEmpty = contactVals.some(v => v !== "");
      
      if (hasNonEmpty) {
        const existing = await queryVos<any>("SELECT memo FROM e_customer WHERE id = ?", [parseInt(id)]);
        const raw = existing[0]?.memo || "";
        let memo: Record<string, string> = {};
        let isJson = false;
        try { if (raw) { memo = JSON.parse(raw); isJson = true; } } catch {}
        // Preserve plain text memo as remark
        if (!isJson && raw.trim()) memo = { remark: raw.trim() };
        if (body.phone !== undefined) memo.phone = String(body.phone);
        if (body.company !== undefined) memo.company = String(body.company);
        if (body.address !== undefined) memo.address = String(body.address);
        if (body.bankAccount !== undefined) memo.bankAccount = String(body.bankAccount);
        if (body.cc !== undefined) memo.cc = String(body.cc);
        if (body.bcc !== undefined) memo.bcc = String(body.bcc);
        // Clean up empty keys
        Object.keys(memo).forEach(k => { if (!memo[k]) delete memo[k]; });
        fields.push("memo = ?");
        values.push(JSON.stringify(memo));
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(parseInt(id));
    await executeVos(
      `UPDATE e_customer SET ${fields.join(", ")}, lastupdatetime = UNIX_TIMESTAMP() WHERE id = ?`,
      values
    );

    // Return updated account
    const rows = await queryVos<any>("SELECT id, account, name, money, limitmoney, status, type FROM e_customer WHERE id = ?", [parseInt(id)]);
    return NextResponse.json({ success: true, account: rows[0] || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    await executeVos("DELETE FROM e_customer WHERE id = ?", [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
