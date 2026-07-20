import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

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
      COALESCE((SELECT COUNT(*) FROM e_gatewaymapping WHERE customer_id = c.id), 0) AS mapping_gw_count,
      COALESCE((SELECT COUNT(*) FROM e_gatewayrouting WHERE clearingcustomer_id = c.id), 0) AS routing_gw_count,
      (SELECT COUNT(*) FROM e_phone WHERE customer_id = c.id) AS phone_count,
      COALESCE((SELECT SUM(total_fee) FROM e_report_daily WHERE customer_id = c.id AND report_date = CURDATE()), 0) AS today_consumption,
      COALESCE((SELECT COUNT(*) FROM e_activephonecard WHERE customer_id = c.id), 0) AS suite_count
      FROM e_customer c
      LEFT JOIN e_feerategroup g1 ON c.feerategroup_id = g1.id
      LEFT JOIN e_feerategroup g2 ON c.feerategroupprivate_id = g2.id
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
