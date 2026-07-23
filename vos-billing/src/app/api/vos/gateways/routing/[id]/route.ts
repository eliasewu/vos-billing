import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
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

    // Update e_gatewayrouting (main table)
    await executeVos(
      `UPDATE e_gatewayrouting SET
        name = ?, prefix = ?, prefixstyle = ?, password = ?, customerpassword = ?,
        locktype = ?, calllevel = ?, capacity = ?, priority = ?, protocol = ?,
        remoteips = ?, rtpforwardtype = ?, gatewaygroups = ?, memo = ?, clearingcustomer_id = ?
       WHERE id = ?`,
      [
        body.name || "",
        body.prefix || "",
        body.prefixStyle ?? 0,
        body.password || "",
        body.customerPassword || "",
        body.lockType ?? 0,
        body.callLevel ?? 0,
        body.capacity ?? 30,
        body.priority ?? 1,
        body.protocol ?? 0,
        body.remoteIps || "",
        body.rtpForwardType ?? 0,
        body.gatewayGroups || "",
        body.memo || "",
        body.clearingCustomerId ?? 0,
        gwId,
      ]
    );

    // Update e_gatewayroutingsetting (routing rules, codecs, period settings)
    try {
      await executeVos(
        `UPDATE e_gatewayroutingsetting SET
          callincallerprefixesallow = ?, callincallerprefixes = ?,
          callincalleeprefixesallow = ?, callincalleeprefixes = ?,
          callinforwardprefixes = ?,
          callerblacklistpolicy = ?, calleeblacklistpolicy = ?,
          rewriterulesincallee = ?, rewriterulesincaller = ?,
          denycallercallee = ?,
          scheduledcapacity = ?, scheduledpriority = ?,
          scheduledcallinprefixes = ?, scheduledrewriterulesin = ?,
          sipcodecs = ?, h323codecs = ?,
          timeoutinvite = ?, timeoutringing = ?
         WHERE gatewayrouting_id = ?`,
        [
          body.callerPrefixesAllow ?? 0, body.callerPrefixes || "",
          body.calleePrefixesAllow ?? 0, body.calleePrefixes || "",
          body.forwardingPrefixes || "",
          body.callerBlacklistPolicy ?? 0, body.calleeBlacklistPolicy ?? 0,
          body.rewriteRulesInCallee || "", body.rewriteRulesInCaller || "",
          body.denyCallerCallee || "",
          body.scheduledCapacity || "", body.scheduledPriority || "",
          body.scheduledCallinPrefixes || "", body.scheduledRewriteRulesIn || "",
          body.sipCodecs || "", body.h323Codecs || "",
          body.timeoutInvite ?? 30, body.timeoutRinging ?? 60,
          gwId,
        ]
      );
    } catch (settingErr) {
      // If no settings row exists yet, insert one
      await executeVos(
        `INSERT INTO e_gatewayroutingsetting (gatewayrouting_id, callincallerprefixesallow, callincallerprefixes,
          callincalleeprefixesallow, callincalleeprefixes, callinforwardprefixes,
          callerblacklistpolicy, calleeblacklistpolicy,
          rewriterulesincallee, rewriterulesincaller, denycallercallee,
          scheduledcapacity, scheduledpriority, scheduledcallinprefixes, scheduledrewriterulesin,
          sipcodecs, h323codecs, timeoutinvite, timeoutringing)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [gwId,
          body.callerPrefixesAllow ?? 0, body.callerPrefixes || "",
          body.calleePrefixesAllow ?? 0, body.calleePrefixes || "",
          body.forwardingPrefixes || "",
          body.callerBlacklistPolicy ?? 0, body.calleeBlacklistPolicy ?? 0,
          body.rewriteRulesInCallee || "", body.rewriteRulesInCaller || "", body.denyCallerCallee || "",
          body.scheduledCapacity || "", body.scheduledPriority || "", body.scheduledCallinPrefixes || "", body.scheduledRewriteRulesIn || "",
          body.sipCodecs || "", body.h323Codecs || "",
          body.timeoutInvite ?? 30, body.timeoutRinging ?? 60,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update routing gateway" }, { status: 500 });
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
    await executeVos("DELETE FROM e_gatewayrouting WHERE id = ?", [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to delete routing gateway" }, { status: 500 });
  }
}
