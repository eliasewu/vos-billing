import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT id, name, capacity, memo FROM e_gatewaygroup ORDER BY name");
    return NextResponse.json({ groups: (rows as any[]).map(r=>({id:r.id,name:r.name,capacity:r.capacity,memo:r.memo})) });
  } catch(e:any){ return NextResponse.json({error:e?.message,groups:[]},{status:500}); }
}
