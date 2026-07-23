import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let where = "";
    const params: (string | number)[] = [];

    if (search) {
      where = " WHERE m.name LIKE ? OR m.remoteips LIKE ?";
      params.push(`%${search}%`, `%${search}%`);
    }

    const sql = `SELECT m.id, m.name, m.password, m.customerpassword, m.locktype, m.calllevel, m.capacity,
      m.priority, m.registertype, m.remoteips, m.rtpforwardtype,
      m.gatewaygroups, m.routinggatewaygroups, m.memo, m.customer_id, m.mbx_id,
      c.name AS customer_name, c.account AS customer_account, c.money AS customer_balance
      FROM e_gatewaymapping m
      LEFT JOIN e_customer c ON m.customer_id = c.id
      ${where}
      ORDER BY m.priority ASC, m.id ASC`;

    const rows = await queryVos<any>(sql, params);

    const gateways = (rows as any[]).map((r: any) => ({
      id: r.id,
      name: r.name,
      password: r.password || "",
      customerPassword: r.customerpassword || "",
      lockType: r.locktype,
      callLevel: r.calllevel,
      capacity: r.capacity,
      priority: r.priority,
      registerType: r.registertype,
      remoteIps: r.remoteips,
      rtpForwardType: r.rtpforwardtype,
      gatewayGroups: r.gatewaygroups,
      routingGatewayGroups: r.routinggatewaygroups,
      memo: r.memo,
      customerId: r.customer_id,
      mbxId: r.mbx_id,
      customerName: r.customer_name || null,
      customerAccount: r.customer_account || "",
      customerBalance: Number(r.customer_balance) || 0,
    }));

    return NextResponse.json({ gateways });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed", gateways: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const [maxRow] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_gatewaymapping");
    const nextId = Number(maxRow?.next_id || 1);

    await executeVos(
      `INSERT INTO e_gatewaymapping (id, name, password, customerpassword, locktype, calllevel, capacity, priority, registertype, remoteips, rtpforwardtype, gatewaygroups, routinggatewaygroups, memo, customer_id, mbx_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextId,
        body.name || "",
        body.password || "",
        body.customerPassword || "",
        body.lockType ?? 0,
        body.callLevel ?? 0,
        body.capacity ?? 30,
        body.priority ?? 1,
        body.registerType ?? 0,
        body.remoteIps || "",
        body.rtpForwardType ?? 0,
        body.gatewayGroups || "",
        body.routingGatewayGroups || "",
        body.memo || "",
        body.customerId ?? 0,
        body.mbxId ?? 0,
      ]
    );

    // Create corresponding settings row (required for VOS3000 to route calls)
    try {
      await executeVos(
        "INSERT INTO e_gatewaymappingsetting (gatewaymapping_id) VALUES (?)",
        [nextId]
      );
    } catch (settingsErr) {
      // Clean up the gateway if settings can't be created
      try { await executeVos("DELETE FROM e_gatewaymapping WHERE id = ?", [nextId]); } catch {}
      return NextResponse.json({ error: "Gateway created but settings initialization failed — rolled back" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: nextId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create mapping gateway" }, { status: 500 });
  }
}
