import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT pp.*, p.name AS package_name, pg.name AS group_name FROM e_package_product pp LEFT JOIN e_package p ON pp.package_id=p.id LEFT JOIN e_packagegroup pg ON p.packagegroup_id=pg.id ORDER BY pp.id");
    return NextResponse.json({ products: (rows as any[]).map(r => ({ id: r.id, packageId: r.package_id, productType: r.product_type, freeDuration: r.free_duration, periodRate: r.period_rate, packageName: r.package_name, groupName: r.group_name })) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
