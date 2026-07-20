import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

const CUSTOMER_TABLES = ["e_customer", "customer", "e_account", "account"];

async function findCustomerTable(): Promise<string | null> {
  for (const table of CUSTOMER_TABLES) {
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
    const table = await findCustomerTable();
    if (!table) {
      return NextResponse.json({ error: "Customer table not found" }, { status: 500 });
    }

    const customers = await queryVos(`SELECT * FROM ${table} WHERE id = ?`, [parseInt(id)]);
    if (customers.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ customer: customers[0] });
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
    const table = await findCustomerTable();
    if (!table) {
      return NextResponse.json({ error: "Customer table not found" }, { status: 500 });
    }

    const body = await request.json();
    
    await executeVos(
      `UPDATE ${table} SET 
        name = ?, money = ?, limitmoney = ?, status = ?, memo = ?
       WHERE id = ?`,
      [
        body.name || body.customer_name || "",
        body.balance || 0,
        body.creditLimit || body.credit || 0,
        body.status ?? 0,
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
    const table = await findCustomerTable();
    if (!table) {
      return NextResponse.json({ error: "Customer table not found" }, { status: 500 });
    }

    await executeVos(`DELETE FROM ${table} WHERE id = ?`, [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
