import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT g.*, COUNT(p.id) AS pkg_count FROM e_packagegroup g LEFT JOIN e_package p ON g.id=p.packagegroup_id GROUP BY g.id ORDER BY g.id");
    return NextResponse.json({ groups: (rows as any[]).map(r => ({ id: r.id, name: r.name, memo: r.memo, privilege: r.privilege, pkgCount: r.pkg_count })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    await executeVos("INSERT INTO e_packagegroup (name, memo, privilege) VALUES (?,?,?)", [body.name, body.memo||"", body.privilege||0]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_packagegroup WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
