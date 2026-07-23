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
        parseInt(id),
      ]
    );

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
