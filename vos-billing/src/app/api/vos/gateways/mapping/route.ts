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
      c.name AS customer_name, c.account AS customer_account, c.money AS customer_balance,
      s.calloutcallerprefixesallow, s.calloutcallerprefixes,
      s.calloutcalleeprefixesallow, s.calloutcalleeprefixes,
      s.rewriterulesoutcallee, s.rewriterulesoutcaller,
      s.callerblacklistpolicy, s.calleeblacklistpolicy,
      s.calloutroutinggateways,
      s.sipcodecs, s.h323codecs,
      s.dtmfreceivemethod, s.dtmfsendmethodsip,
      s.mediacheckdirection,
      s.timeoutcallproceeding,
      s.maxcalldurationlower, s.maxcalldurationupper,
      s.scheduledcalloutprefixes, s.scheduledrewriterulesout, s.scheduledcapacity
      FROM e_gatewaymapping m
      LEFT JOIN e_customer c ON m.customer_id = c.id
      LEFT JOIN e_gatewaymappingsetting s ON m.id = s.gatewaymapping_id
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
      calloutCallerPrefixesAllow: r.calloutcallerprefixesallow ?? 1,
      calloutCallerPrefixes: r.calloutcallerprefixes || "",
      calloutCalleePrefixesAllow: r.calloutcalleeprefixesallow ?? 1,
      calloutCalleePrefixes: r.calloutcalleeprefixes || "",
      rewriteRulesOutCallee: r.rewriterulesoutcallee || "",
      rewriteRulesOutCaller: r.rewriterulesoutcaller || "",
      callerBlacklistPolicy: r.callerblacklistpolicy ?? 0,
      calleeBlacklistPolicy: r.calleeblacklistpolicy ?? 0,
      calloutRoutingGateways: r.calloutroutinggateways || "",
      sipCodecs: r.sipcodecs || "",
      h323Codecs: r.h323codecs || "",
      dtmfReceiveMethod: r.dtmfreceivemethod ?? 0,
      dtmfSendMethodSip: r.dtmfsendmethodsip ?? 0,
      mediaCheckDirection: r.mediacheckdirection ?? 0,
      timeoutCallProceeding: r.timeoutcallproceeding ?? 30,
      maxCallDurationLower: r.maxcalldurationlower ?? 0,
      maxCallDurationUpper: r.maxcalldurationupper ?? 0,
      scheduledCalloutPrefixes: r.scheduledcalloutprefixes || "",
      scheduledRewriteRulesOut: r.scheduledrewriterulesout || "",
      scheduledCapacity: r.scheduledcapacity || "",
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

    // Create corresponding settings row with all provided fields
    try {
      await executeVos(
        `INSERT INTO e_gatewaymappingsetting (gatewaymapping_id, calloutcallerprefixesallow, calloutcallerprefixes,
          calloutcalleeprefixesallow, calloutcalleeprefixes,
          rewriterulesoutcallee, rewriterulesoutcaller,
          callerblacklistpolicy, calleeblacklistpolicy,
          calloutroutinggateways,
          sipcodecs, h323codecs, dtmfreceivemethod, dtmfsendmethodsip,
          mediacheckdirection, timeoutcallproceeding,
          maxcalldurationlower, maxcalldurationupper,
          scheduledcalloutprefixes, scheduledrewriterulesout, scheduledcapacity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nextId,
          body.calloutCallerPrefixesAllow ?? 1, body.calloutCallerPrefixes || "",
          body.calloutCalleePrefixesAllow ?? 1, body.calloutCalleePrefixes || "",
          body.rewriteRulesOutCallee || "", body.rewriteRulesOutCaller || "",
          body.callerBlacklistPolicy ?? 0, body.calleeBlacklistPolicy ?? 0,
          body.calloutRoutingGateways || "",
          body.sipCodecs || "", body.h323Codecs || "",
          body.dtmfReceiveMethod ?? 0, body.dtmfSendMethodSip ?? 0,
          body.mediaCheckDirection ?? 0, body.timeoutCallProceeding ?? 30,
          body.maxCallDurationLower ?? 0, body.maxCallDurationUpper ?? 0,
          body.scheduledCalloutPrefixes || "", body.scheduledRewriteRulesOut || "",
          body.scheduledCapacity || "",
        ]
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
