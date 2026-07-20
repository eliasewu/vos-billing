import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>(
      "SELECT g.id, g.name, g.fakeminute, g.isprivate, g.memo, COUNT(r.id) AS rate_count FROM e_feerategroup g LEFT JOIN e_feerate r ON g.id = r.feerategroup_id GROUP BY g.id ORDER BY g.name"
    );
    return NextResponse.json({
      groups: (rows as any[]).map((r: any) => ({ id: r.id, name: r.name, fakeMinute: r.fakeminute, isPrivate: r.isprivate, memo: r.memo, rateCount: r.rate_count })),
    });
  } catch (e: any) { return NextResponse.json({ error: e?.message, groups: [] }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: "Group name is required" }, { status: 400 });

    const result = await executeVos(
      "INSERT INTO e_feerategroup (name, fakeminute, isprivate, memo) VALUES (?, ?, ?, ?)",
      [body.name, body.fakeMinute || 60, body.isPrivate || 0, body.memo || ""]
    );

    const rows = await queryVos<any>("SELECT id, name, fakeminute, isprivate, memo FROM e_feerategroup WHERE id = ?", [(result as any).insertId]);
    return NextResponse.json({ success: true, group: rows[0] || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create group" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "Group ID is required" }, { status: 400 });

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.name !== undefined) { fields.push("name = ?"); values.push(String(body.name)); }
    if (body.fakeMinute !== undefined) { fields.push("fakeminute = ?"); values.push(Number(body.fakeMinute)); }
    if (body.isPrivate !== undefined) { fields.push("isprivate = ?"); values.push(Number(body.isPrivate)); }
    if (body.memo !== undefined) { fields.push("memo = ?"); values.push(String(body.memo)); }

    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    values.push(Number(body.id));
    await executeVos(`UPDATE e_feerategroup SET ${fields.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Group ID is required" }, { status: 400 });

    // Delete all rates in this group first
    await executeVos("DELETE FROM e_feerate WHERE feerategroup_id = ?", [Number(id)]);
    await executeVos("DELETE FROM e_feerategroup WHERE id = ?", [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete group" }, { status: 500 });
  }
}
