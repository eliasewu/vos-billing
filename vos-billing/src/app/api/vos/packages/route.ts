import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get("group_id");
    let sql = "SELECT p.*, g.name AS group_name FROM e_package p LEFT JOIN e_packagegroup g ON p.packagegroup_id=g.id";
    const params: any[] = [];
    if (groupId) { sql += " WHERE p.packagegroup_id = ?"; params.push(groupId); }
    sql += " ORDER BY p.id";
    const rows = await queryVos<any>(sql, params);
    return NextResponse.json({ packages: (rows as any[]).map(r => ({ id: r.id, packagegroupId: r.packagegroup_id, name: r.name, fee: r.fee, period: r.period, memo: r.memo, groupName: r.group_name })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
