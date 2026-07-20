import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT a.*, COALESCE(pa.name,'') AS parent_name FROM e_agent a LEFT JOIN e_agent pa ON a.parent_id=pa.id ORDER BY a.id");
    return NextResponse.json({ agents: (rows as any[]).map(r => ({ id: r.id, name: r.name, account: r.account, money: r.money, limitMoney: r.limitmoney, rate: r.rate, status: r.status, parentId: r.parent_id, parentName: r.parent_name, memo: r.memo })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    if (!b.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    await executeVos("INSERT INTO e_agent (name, account, password, money, limitmoney, rate, status, parent_id, memo) VALUES (?,?,MD5(?),?,?,?,?,?,?)", [b.name, b.account||"", b.password||"agent123", b.money||0, b.limitMoney||0, b.rate||0, b.status??0, b.parentId||0, b.memo||""]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.status !== undefined) { fields.push("status = ?"); values.push(Number(body.status)); }
    if (body.money !== undefined) { fields.push("money = ?"); values.push(Number(body.money)); }
    if (body.limitMoney !== undefined) { fields.push("limitmoney = ?"); values.push(Number(body.limitMoney)); }
    if (body.name !== undefined) { fields.push("name = ?"); values.push(String(body.name)); }

    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    values.push(Number(id));
    await executeVos(`UPDATE e_agent SET ${fields.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_agent WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
