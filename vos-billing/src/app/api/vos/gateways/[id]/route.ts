import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

const GATEWAY_TABLES = ["e_gateway", "gateway", "e_gw", "gw"];

async function findGatewayTable(): Promise<string | null> {
  for (const table of GATEWAY_TABLES) {
    try {
      await queryVos(`SELECT 1 FROM ${table} LIMIT 1`);
      return table;
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const table = await findGatewayTable();
    if (!table) {
      return NextResponse.json({ error: "Gateway table not found" }, { status: 500 });
    }

    const gateways = await queryVos(`SELECT * FROM ${table} WHERE id = ?`, [parseInt(id)]);
    if (gateways.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ gateway: gateways[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const table = await findGatewayTable();
    if (!table) {
      return NextResponse.json({ error: "Gateway table not found" }, { status: 500 });
    }

    const body = await request.json();
    
    await executeVos(
      `UPDATE ${table} SET 
        gateway_name = ?, gateway_type = ?, ip_addr = ?, port = ?, protocol = ?,
        prefix = ?, max_calls = ?, status = ?, customer_id = ?, remark = ?
       WHERE id = ?`,
      [
        body.gateway_name,
        body.gateway_type,
        body.ip_addr,
        body.port,
        body.protocol,
        body.prefix || "",
        body.max_calls,
        body.status,
        body.customer_id,
        body.remark || "",
        parseInt(id),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const table = await findGatewayTable();
    if (!table) {
      return NextResponse.json({ error: "Gateway table not found" }, { status: 500 });
    }

    await executeVos(`DELETE FROM ${table} WHERE id = ?`, [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
