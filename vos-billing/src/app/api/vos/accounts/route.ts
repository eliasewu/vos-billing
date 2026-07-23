import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { sendNewAccountEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const rateGroup = searchParams.get("rateGroup") || "";
    const balanceSign = searchParams.get("balanceSign") || "";

    let where = "";
    const params: (string | number)[] = [];

    if (search) {
      where += " WHERE (c.name LIKE ? OR c.account LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type) {
      where += where ? " AND c.type = ?" : " WHERE c.type = ?";
      params.push(parseInt(type));
    }

    // Status filter: comma-separated e.g. "0,2" for inactive+locked
    if (status) {
      const statuses = status.split(",").map(s => parseInt(s)).filter(n => !isNaN(n));
      if (statuses.length > 0) {
        where += where ? ` AND c.status IN (${statuses.map(() => "?").join(",")})` : ` WHERE c.status IN (${statuses.map(() => "?").join(",")})`;
        params.push(...statuses);
      }
    }

    // Balance sign filter: "negative" or "positive"
    if (balanceSign === "negative") {
      where += where ? " AND c.money < 0" : " WHERE c.money < 0";
    } else if (balanceSign === "positive") {
      where += where ? " AND c.money > 0" : " WHERE c.money > 0";
    }

    // Rate group filter
    if (rateGroup) {
      where += where ? " AND c.feerategroup_id = ?" : " WHERE c.feerategroup_id = ?";
      params.push(parseInt(rateGroup));
    }

    const sql = `SELECT c.id, c.account, c.name, c.money, c.limitmoney, c.type, c.status,
      c.starttime, c.lastupdatetime, c.feerategroup_id, c.feerategroupprivate_id,
      c.memo, c.alarmemail,
      g1.name AS feerate_group_name, g2.name AS feerate_group_private_name,
      COALESCE(mgw.cnt, 0) AS mapping_gw_count,
      COALESCE(rgw.cnt, 0) AS routing_gw_count,
      COALESCE(ph.cnt, 0) AS phone_count,
      COALESCE(rd.total, 0) AS today_consumption,
      COALESCE(su.cnt, 0) AS suite_count
      FROM e_customer c
      LEFT JOIN e_feerategroup g1 ON c.feerategroup_id = g1.id
      LEFT JOIN e_feerategroup g2 ON c.feerategroupprivate_id = g2.id
      LEFT JOIN (SELECT customer_id, COUNT(*) AS cnt FROM e_gatewaymapping GROUP BY customer_id) mgw ON mgw.customer_id = c.id
      LEFT JOIN (SELECT clearingcustomer_id, COUNT(*) AS cnt FROM e_gatewayrouting GROUP BY clearingcustomer_id) rgw ON rgw.clearingcustomer_id = c.id
      LEFT JOIN (SELECT customer_id, COUNT(*) AS cnt FROM e_phone GROUP BY customer_id) ph ON ph.customer_id = c.id
      LEFT JOIN (SELECT customer_id, SUM(total_fee) AS total FROM e_report_daily WHERE report_date = CURDATE() GROUP BY customer_id) rd ON rd.customer_id = c.id
      LEFT JOIN (SELECT customer_id, COUNT(*) AS cnt FROM e_activephonecard GROUP BY customer_id) su ON su.customer_id = c.id
      ${where}
      ORDER BY c.id DESC`;

    const rows = await queryVos<any[]>(sql, params);

    const accounts = rows.map((r: any) => {
      // Parse contact JSON from memo field
      // Parse contact JSON from memo field, preserving plain text as remark
      let contact: Record<string, string> = {};
      try { if (r.memo) contact = JSON.parse(r.memo); } catch { if (r.memo) contact = { remark: String(r.memo).trim() }; }
      return {
      id: r.id,
      account: r.account,
      name: r.name,
      money: Number(r.money || 0),
      limitmoney: Number(r.limitmoney || 0),
      type: r.type,
      status: r.status,
      starttime: r.starttime,
      lastupdatetime: r.lastupdatetime,
      feerateGroupId: r.feerategroup_id || 0,
      feerateGroupName: r.feerate_group_name || null,
      feerateGroupPrivateId: r.feerategroupprivate_id || 0,
      feerateGroupPrivateName: r.feerate_group_private_name || null,
      privateRateName: r.feerate_group_private_name || null,
      gatewayCount: Number((r.mapping_gw_count || 0) + (r.routing_gw_count || 0)),
      phoneCount: Number(r.phone_count || 0),
      todayConsumption: Number(r.today_consumption || 0),
      suiteCount: Number(r.suite_count || 0),
      email: r.alarmemail || "",
      phone: contact.phone || "",
      company: contact.company || "",
      address: contact.address || "",
      bankAccount: contact.bankAccount || contact.bank || "",
      cc: contact.cc || "",
      bcc: contact.bcc || "",
    }});

    return NextResponse.json({ accounts });
  } catch (e: any) {
    const message = e?.message || "Failed to fetch accounts";
    return NextResponse.json({ error: message, accounts: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // VOS3000 e_customer.id is NOT auto-increment — manually get next ID
    const [maxRow] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_customer");
    const nextId = Number(maxRow?.next_id || 1);
    const now = Math.floor(Date.now() / 1000);

    // Build memo JSON for contact details
    const contactFields = ["phone", "company", "address", "bankAccount", "cc", "bcc"];
    const memo: Record<string, string> = {};
    for (const key of contactFields) {
      if (body[key] !== undefined && String(body[key]).trim()) {
        memo[key] = String(body[key]).trim();
      }
    }
    const memoStr = Object.keys(memo).length > 0 ? JSON.stringify(memo) : "";

    await executeVos(
      `INSERT INTO e_customer (id, customer_id, account, name, money, limitmoney, type, status, starttime, lastupdatetime, feerategroup_id, feerategroupprivate_id, alarmemail, memo, locktype)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        nextId,
        nextId,
        body.account || "",
        body.name || "",
        Number(body.money) || 0,
        Number(body.limitmoney) || 0,
        Number(body.type) || 0,
        Number(body.status) ?? 1,
        now,
        now,
        Number(body.feerateGroupId) || 0,
        Number(body.feerateGroupPrivateId) || 0,
        body.email || "",
        memoStr,
      ]
    );

    // ─── Auto-send CDR credentials email (fire-and-forget) ───
    const targetEmail = body.email || "";
    if (targetEmail && Number(body.type || 0) === 0) {
      void (async () => {
        try {
          let cdrUser = ""; let cdrPass = "";
          try {
            const [cdr] = await queryVos<any>(
              "SELECT username, password FROM e_account_auth WHERE customer_id = ? LIMIT 1", [nextId]
            );
            if (cdr) { cdrUser = (cdr as any)?.username || ""; cdrPass = (cdr as any)?.password || ""; }
          } catch { /* no CDR auth exists yet */ }

          await sendNewAccountEmail(targetEmail, body.name || body.account || "Client", body.account || String(nextId), cdrUser || undefined, cdrPass || undefined);
        } catch (e) { console.error("[AccountEmail] Failed to send welcome email:", e); }
      })();
    }

    return NextResponse.json({ success: true, id: nextId, account: body.account, name: body.name });
  } catch (e: any) {
    const message = e?.message || "Failed to create account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
