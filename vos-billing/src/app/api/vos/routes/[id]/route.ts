import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

const ROUTE_TABLES = ["e_route", "route", "e_routing", "routing"];

async function findRouteTable(): Promise<string | null> {
  for (const table of ROUTE_TABLES) {
    try {
      await queryVos(`SELECT 1 FROM ${table} LIMIT 1`);
      return table;
    } catch {
      continue;
    }
  }
  return null;
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
    const table = await findRouteTable();
    if (!table) {
      return NextResponse.json({ error: "Route table not found" }, { status: 500 });
    }

    const body = await request.json();
    
    await executeVos(
      `UPDATE ${table} SET 
        route_name = ?, gateway_group_id = ?, prefix = ?, priority = ?, status = ?
       WHERE id = ?`,
      [
        body.route_name,
        body.gateway_group_id,
        body.prefix,
        body.priority,
        body.status,
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
    const table = await findRouteTable();
    if (!table) {
      return NextResponse.json({ error: "Route table not found" }, { status: 500 });
    }

    await executeVos(`DELETE FROM ${table} WHERE id = ?`, [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
