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
      where = " WHERE r.name LIKE ? OR r.prefix LIKE ? OR r.remoteips LIKE ?";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const sql = `SELECT r.id, r.name, r.prefix, r.prefixstyle, r.locktype, r.calllevel, r.capacity,
      r.priority, r.iptype, r.encrypt, r.protocol, r.remoteips, r.rtpforwardtype,
      r.signalport, r.signalportlocal, r.gatewaygroups, r.memo, r.mbx_id, r.clearingcustomer_id,
      s.rewriterulesincallee, s.rewriterulesincaller, s.sipcodecs, s.timeoutinvite,
      s.timeoutringing
      FROM e_gatewayrouting r
      LEFT JOIN e_gatewayroutingsetting s ON r.id = s.gatewayrouting_id
      ${where}
      ORDER BY r.priority ASC, r.id ASC`;

    const rows = await queryVos<any>(sql, params);

    const gateways = (rows as any[]).map((r: any) => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      prefixStyle: r.prefixstyle,
      lockType: r.locktype,
      callLevel: r.calllevel,
      capacity: r.capacity,
      priority: r.priority,
      ipType: r.iptype,
      encrypt: r.encrypt,
      protocol: r.protocol,
      remoteIps: r.remoteips,
      rtpForwardType: r.rtpforwardtype,
      signalPort: r.signalport,
      signalPortLocal: r.signalportlocal,
      gatewayGroups: r.gatewaygroups,
      memo: r.memo,
      mbxId: r.mbx_id,
      clearingCustomerId: r.clearingcustomer_id,
      rewriteInCallee: r.rewriterulesincallee || null,
      rewriteInCaller: r.rewriterulesincaller || null,
      sipCodecs: r.sipcodecs || null,
      timeoutInvite: r.timeoutinvite,
      timeoutRinging: r.timeoutringing,
    }));

    return NextResponse.json({ gateways });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed", gateways: [] }, { status: 500 });
  }
}
