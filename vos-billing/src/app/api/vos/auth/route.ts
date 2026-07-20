import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT a.*, c.name AS customer_name FROM e_account_auth a LEFT JOIN e_customer c ON a.customer_id=c.id ORDER BY a.id");
    return NextResponse.json({ auths: (rows as any[]).map(r => ({ id: r.id, customerId: r.customer_id, username: r.username, webAccess: r.web_access, memo: r.memo, customerName: r.customer_name })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const loginUser = await verifySession();
  if (!loginUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    await executeVos("INSERT INTO e_account_auth (customer_id, username, password, web_access, memo) VALUES (?,?,MD5(?),?,?)", [b.customerId||0, b.username||"", b.password||"pass123", b.webAccess??1, b.memo||""]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  const loginUser = await verifySession();
  if (!loginUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.webAccess !== undefined) { fields.push("web_access = ?"); values.push(Number(body.webAccess)); }
    if (body.username !== undefined) { fields.push("username = ?"); values.push(String(body.username)); }

    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    values.push(Number(id));
    await executeVos(`UPDATE e_account_auth SET ${fields.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const loginUser = await verifySession();
  if (!loginUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_account_auth WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
