import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await queryVos<any>(
      "SELECT areacode, location FROM e_areacode ORDER BY location"
    );

    const areacodes = rows.map(r => ({
      areacode: String(r.areacode || ""),
      location: String(r.location || ""),
    }));

    // Build country name → areacode map (normalize: trim, lowercase key)
    const countryMap: Record<string, string> = {};
    for (const a of areacodes) {
      if (a.location && a.areacode) {
        countryMap[a.location.trim().toLowerCase()] = a.areacode;
      }
    }

    return NextResponse.json({ areacodes, countryMap });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch areacodes", areacodes: [], countryMap: {} },
      { status: 500 }
    );
  }
}
