import { NextRequest, NextResponse } from "next/server";
import { executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const gwId = parseInt(id);

    await executeVos(
      `UPDATE e_gatewaymapping SET
        name = ?, password = ?, customerpassword = ?, locktype = ?, calllevel = ?,
        capacity = ?, priority = ?, registertype = ?, remoteips = ?, rtpforwardtype = ?,
        gatewaygroups = ?, routinggatewaygroups = ?, memo = ?, customer_id = ?, mbx_id = ?
       WHERE id = ?`,
      [
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
        gwId,
      ]
    );

    // Update e_gatewaymappingsetting
    try {
      await executeVos(
        `UPDATE e_gatewaymappingsetting SET
          calloutcallerprefixesallow = ?, calloutcallerprefixes = ?,
          calloutcalleeprefixesallow = ?, calloutcalleeprefixes = ?,
          rewriterulesoutcallee = ?, rewriterulesoutcaller = ?,
          callerblacklistpolicy = ?, calleeblacklistpolicy = ?,
          calloutroutinggateways = ?,
          sipcodecs = ?, h323codecs = ?,
          dtmfreceivemethod = ?, dtmfsendmethodsip = ?,
          mediacheckdirection = ?, timeoutcallproceeding = ?,
          maxcalldurationlower = ?, maxcalldurationupper = ?,
          scheduledcalloutprefixes = ?, scheduledrewriterulesout = ?, scheduledcapacity = ?
         WHERE gatewaymapping_id = ?`,
        [
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
          gwId,
        ]
      );
    } catch {
      await executeVos(
        `INSERT INTO e_gatewaymappingsetting (gatewaymapping_id, calloutcallerprefixesallow, calloutcallerprefixes,
          calloutcalleeprefixesallow, calloutcalleeprefixes,
          rewriterulesoutcallee, rewriterulesoutcaller,
          callerblacklistpolicy, calleeblacklistpolicy, calloutroutinggateways,
          sipcodecs, h323codecs, dtmfreceivemethod, dtmfsendmethodsip,
          mediacheckdirection, timeoutcallproceeding,
          maxcalldurationlower, maxcalldurationupper,
          scheduledcalloutprefixes, scheduledrewriterulesout, scheduledcapacity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [gwId,
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
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update mapping gateway" }, { status: 500 });
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
    await executeVos("DELETE FROM e_gatewaymapping WHERE id = ?", [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to delete mapping gateway" }, { status: 500 });
  }
}
