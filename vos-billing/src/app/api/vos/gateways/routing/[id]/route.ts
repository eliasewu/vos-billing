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

    await executeVos(
      `UPDATE e_gatewayrouting SET
        name = ?, prefix = ?, prefixstyle = ?, password = ?, customerpassword = ?,
        locktype = ?, calllevel = ?, capacity = ?, priority = ?, protocol = ?,
        remoteips = ?, gatewaygroups = ?, memo = ?, clearingcustomer_id = ?
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
        body.gatewayGroups || "",
        body.memo || "",
        body.clearingCustomerId ?? 0,
        parseInt(id),
      ]
    );

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
