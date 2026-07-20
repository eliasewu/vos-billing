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

    // Support partial update for status toggle only
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.status !== undefined) {
      fields.push("status = ?");
      values.push(Number(body.status));
    }
    if (body.money !== undefined) {
      fields.push("money = ?");
      values.push(Number(body.money));
    }
    if (body.limitmoney !== undefined) {
      fields.push("limitmoney = ?");
      values.push(Number(body.limitmoney));
    }
    if (body.name !== undefined) {
      fields.push("name = ?");
      values.push(String(body.name));
    }
    if (body.account !== undefined) {
      fields.push("account = ?");
      values.push(String(body.account));
    }
    if (body.type !== undefined) {
      fields.push("type = ?");
      values.push(Number(body.type));
    }
    if (body.feerateGroupId !== undefined) {
      fields.push("feerategroup_id = ?");
      values.push(Number(body.feerateGroupId));
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(parseInt(id));
    await executeVos(
      `UPDATE e_customer SET ${fields.join(", ")}, lastupdatetime = UNIX_TIMESTAMP() WHERE id = ?`,
      values
    );

    // Return updated account
    const rows = await queryVos<any>("SELECT id, account, name, money, limitmoney, status, type FROM e_customer WHERE id = ?", [parseInt(id)]);
    return NextResponse.json({ success: true, account: rows[0] || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 500 });
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
    await executeVos("DELETE FROM e_customer WHERE id = ?", [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
