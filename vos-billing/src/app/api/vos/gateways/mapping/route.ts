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

    let where = "";
    const params: (string | number)[] = [];

    if (search) {
      where = " WHERE m.name LIKE ? OR m.remoteips LIKE ?";
      params.push(`%${search}%`, `%${search}%`);
    }

    const sql = `SELECT m.id, m.name, m.locktype, m.calllevel, m.capacity,
      m.priority, m.registertype, m.remoteips, m.rtpforwardtype,
      m.gatewaygroups, m.routinggatewaygroups, m.memo, m.customer_id, m.mbx_id,
      c.name AS customer_name
      FROM e_gatewaymapping m
      LEFT JOIN e_customer c ON m.customer_id = c.id
      ${where}
      ORDER BY m.priority ASC, m.id ASC`;

    const rows = await queryVos<any>(sql, params);

    const gateways = (rows as any[]).map((r: any) => ({
      id: r.id,
      name: r.name,
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
    }));

    return NextResponse.json({ gateways });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed", gateways: [] }, { status: 500 });
  }
}
