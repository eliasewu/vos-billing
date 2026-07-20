import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";

    let where = "";
    const params: (string | number)[] = [];

    if (search) {
      where += " WHERE (c.name LIKE ? OR c.account LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type) {
      where += where ? " AND c.type = ?" : " WHERE c.type = ?";
      params.push(parseInt(type));
    }

    const sql = `SELECT c.id, c.account, c.name, c.money, c.limitmoney, c.type, c.status,
      c.starttime, c.lastupdatetime, c.feerategroup_id, c.feerategroupprivate_id,
      g1.name AS feerate_group_name, g2.name AS feerate_group_private_name
      FROM e_customer c
      LEFT JOIN e_feerategroup g1 ON c.feerategroup_id = g1.id
      LEFT JOIN e_feerategroup g2 ON c.feerategroupprivate_id = g2.id
      ${where}
      ORDER BY c.id DESC`;

    const rows = await queryVos<any[]>(sql, params);

    const accounts = rows.map((r: any) => ({
      id: r.id,
      account: r.account,
      name: r.name,
      money: Number(r.money || 0),
      limitmoney: Number(r.limitmoney || 0),
      type: r.type,
      status: r.status,
      starttime: r.starttime,
      lastupdatetime: r.lastupdatetime,
      feerateGroupId: r.feerategroup_id || 0,
      feerateGroupName: r.feerate_group_name || null,
      feerateGroupPrivateName: r.feerate_group_private_name || null,
    }));

    return NextResponse.json({ accounts });
  } catch (e: any) {
    const message = e?.message || "Failed to fetch accounts";
    return NextResponse.json({ error: message, accounts: [] }, { status: 500 });
  }
}
