import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT r.*, gr.name AS gateway_name FROM e_route r LEFT JOIN e_gatewayrouting gr ON r.gateway_id=gr.id ORDER BY r.priority, r.id");
    return NextResponse.json({ routes: (rows as any[]).map(r => ({ id: r.id, prefix: r.prefix, routeName: r.route_name, gatewayId: r.gateway_id, gatewayName: r.gateway_name, priority: r.priority, rewritePrefix: r.rewrite_prefix, stripDigits: r.strip_digits, prependDigits: r.prepend_digits, status: r.status, memo: r.memo })) });
  } catch { return NextResponse.json({ error: "Failed", routes: [] }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    await executeVos("INSERT INTO e_route (prefix, route_name, gateway_id, priority, rewrite_prefix, strip_digits, prepend_digits, status, memo) VALUES (?,?,?,?,?,?,?,?,?)", [b.prefix||"", b.routeName||"", b.gatewayId||0, b.priority||0, b.rewritePrefix||"", b.stripDigits||0, b.prependDigits||"", b.status??0, b.memo||""]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_route WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
