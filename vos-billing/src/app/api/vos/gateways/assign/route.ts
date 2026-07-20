import { NextRequest, NextResponse } from "next/server";
import { executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

const MAPPING_TABLE = "e_gatewaymapping";
const ROUTING_TABLE = "e_gatewayrouting";

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { customer_id, gateway_ids, type } = body;

    if (!customer_id || !gateway_ids || !Array.isArray(gateway_ids)) {
      return NextResponse.json({ error: "customer_id and gateway_ids[] are required" }, { status: 400 });
    }

    const table = type === "routing" ? ROUTING_TABLE : MAPPING_TABLE;
    const idField = type === "routing" ? "clearingcustomer_id" : "customer_id";

    // Unassign all gateways from this customer first
    await executeVos(
      `UPDATE ${table} SET ${idField} = 0 WHERE ${idField} = ?`,
      [Number(customer_id)]
    );

    // Batch assign selected gateways
    if (gateway_ids.length > 0) {
      const placeholders = gateway_ids.map(() => "?").join(", ");
      await executeVos(
        `UPDATE ${table} SET ${idField} = ? WHERE id IN (${placeholders})`,
        [Number(customer_id), ...gateway_ids.map(Number)]
      );
    }

    return NextResponse.json({ success: true, assigned: gateway_ids.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to assign gateways" }, { status: 500 });
  }
}
