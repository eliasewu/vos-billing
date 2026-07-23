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
      where = " WHERE r.name LIKE ? OR r.prefix LIKE ? OR r.remoteips LIKE ?";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const sql = `SELECT r.id, r.name, r.prefix, r.prefixstyle, r.password, r.customerpassword,
      r.locktype, r.calllevel, r.capacity, r.priority, r.iptype, r.encrypt, r.protocol,
      r.remoteips, r.rtpforwardtype, r.signalport, r.signalportlocal, r.gatewaygroups, r.memo,
      r.mbx_id, r.clearingcustomer_id,
      s.rewriterulesincallee, s.rewriterulesincaller, s.sipcodecs, s.h323codecs,
      s.timeoutinvite, s.timeoutringing, s.callerblacklistpolicy, s.calleeblacklistpolicy,
      s.callincallerprefixesallow, s.callincallerprefixes, s.callincalleeprefixesallow, s.callincalleeprefixes,
      s.callinforwardprefixes, s.denycallercallee,
      s.scheduledcapacity, s.scheduledpriority, s.scheduledcallinprefixes, s.scheduledrewriterulesin,
      s.callinmappinggateways,
      clr.name AS clearing_name, clr.account AS clearing_account, clr.money AS clearing_balance,
      clr.limitmoney AS clearing_limit
      FROM e_gatewayrouting r
      LEFT JOIN e_gatewayroutingsetting s ON r.id = s.gatewayrouting_id
      LEFT JOIN e_customer clr ON r.clearingcustomer_id = clr.id
      ${where}
      ORDER BY r.priority ASC, r.id ASC`;

    const rows = await queryVos<any>(sql, params);

    const gateways = (rows as any[]).map((r: any) => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      prefixStyle: r.prefixstyle,
      password: r.password || "",
      customerPassword: r.customerpassword || "",
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
      h323Codecs: r.h323codecs || null,
      timeoutInvite: r.timeoutinvite,
      timeoutRinging: r.timeoutringing,
      callerBlacklistPolicy: r.callerblacklistpolicy || 0,
      calleeBlacklistPolicy: r.calleeblacklistpolicy || 0,
      callerPrefixesAllow: r.callincallerprefixesallow || 0,
      callerPrefixes: r.callincallerprefixes || "",
      calleePrefixesAllow: r.callincalleeprefixesallow || 0,
      calleePrefixes: r.callincalleeprefixes || "",
      forwardingPrefixes: r.callinforwardprefixes || "",
      denyCallerCallee: r.denycallercallee || "",
      scheduledCapacity: r.scheduledcapacity || "",
      scheduledPriority: r.scheduledpriority || "",
      scheduledCallinPrefixes: r.scheduledcallinprefixes || "",
      scheduledRewriteRulesIn: r.scheduledrewriterulesin || "",
      mappingGatewayNames: r.callinmappinggateways || "",
      clearingName: r.clearing_name || "",
      clearingAccount: r.clearing_account || "",
      clearingBalance: Number(r.clearing_balance) || 0,
      clearingLimit: Number(r.clearing_limit) || 0,
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
    const [maxRow] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_gatewayrouting");
    const nextId = Number(maxRow?.next_id || 1);

    await executeVos(
      `INSERT INTO e_gatewayrouting (id, name, prefix, prefixstyle, password, customerpassword, locktype, calllevel, capacity, priority, iptype, encrypt, protocol, remoteips, rtpforwardtype, signalport, signalportlocal, gatewaygroups, memo, mbx_id, clearingcustomer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextId,
        body.name || "",
        body.prefix || "",
        body.prefixStyle ?? 0,
        body.password || "",
        body.customerPassword || "",
        body.lockType ?? 0,
        body.callLevel ?? 0,
        body.capacity ?? 30,
        body.priority ?? 1,
        body.ipType ?? 0,
        body.encrypt ?? 0,
        body.protocol ?? 0,
        body.remoteIps || "",
        body.rtpForwardType ?? 0,
        body.signalPort ?? 5060,
        body.signalPortLocal ?? 5060,
        body.gatewayGroups || "",
        body.memo || "",
        body.mbxId ?? 0,
        body.clearingCustomerId ?? 0,
      ]
    );

    // Create corresponding settings row with all provided fields
    try {
      await executeVos(
        `INSERT INTO e_gatewayroutingsetting (gatewayrouting_id, callincallerprefixesallow, callincallerprefixes,
          callincalleeprefixesallow, callincalleeprefixes, callinforwardprefixes,
          callerblacklistpolicy, calleeblacklistpolicy,
          rewriterulesincallee, rewriterulesincaller, denycallercallee,
          scheduledcapacity, scheduledpriority, scheduledcallinprefixes, scheduledrewriterulesin,
          sipcodecs, h323codecs, timeoutinvite, timeoutringing)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nextId,
          body.callerPrefixesAllow ?? 1, body.callerPrefixes || "",
          body.calleePrefixesAllow ?? 1, body.calleePrefixes || "",
          body.forwardingPrefixes || "",
          body.callerBlacklistPolicy ?? 0, body.calleeBlacklistPolicy ?? 0,
          body.rewriteRulesInCaller || "", body.rewriteRulesInCallee || "",
          body.denyCallerCallee || "",
          body.scheduledCapacity || "", body.scheduledPriority || "",
          body.scheduledCallinPrefixes || "", body.scheduledRewriteRulesIn || "",
          body.sipCodecs || "", body.h323Codecs || "",
          body.timeoutInvite ?? 30, body.timeoutRinging ?? 60,
        ]
      );
    } catch (settingsErr) {
      // Clean up the gateway if settings can't be created
      try { await executeVos("DELETE FROM e_gatewayrouting WHERE id = ?", [nextId]); } catch {}
      return NextResponse.json({ error: "Gateway created but settings initialization failed — rolled back" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: nextId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create routing gateway" }, { status: 500 });
  }
}
