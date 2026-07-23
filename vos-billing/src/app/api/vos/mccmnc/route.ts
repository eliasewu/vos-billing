import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

async function ensureMccmncTable(): Promise<void> {
  try {
    await executeVos(`CREATE TABLE IF NOT EXISTS e_mccmnc (
      id INT AUTO_INCREMENT PRIMARY KEY,
      country VARCHAR(100) NOT NULL,
      operator VARCHAR(150) NOT NULL DEFAULT '',
      mcc VARCHAR(10) NOT NULL DEFAULT '',
      mnc VARCHAR(10) NOT NULL DEFAULT '',
      INDEX idx_country (country),
      INDEX idx_mcc (mcc)
    )`);
  } catch { /* table may already exist */ }
}

// GET: list all MCC/MNC entries with optional filters
export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureMccmncTable();

    const search = request.nextUrl.searchParams.get("search") || "";
    const country = request.nextUrl.searchParams.get("country") || "";

    let sql = "SELECT id, country, operator, mcc, mnc FROM e_mccmnc WHERE 1=1";
    const params: (string | number)[] = [];

    if (search) { sql += " AND (country LIKE ? OR operator LIKE ? OR mcc LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (country) { sql += " AND country = ?"; params.push(country); }

    sql += " ORDER BY country ASC, operator ASC LIMIT 50000";
    const rows = await queryVos<any>(sql, params);

    const countries = [...new Set((rows as any[]).map(r => r.country))].sort();
    return NextResponse.json({
      entries: (rows as any[]).map(r => ({ id: r.id, country: r.country, operator: r.operator, mcc: r.mcc, mnc: r.mnc })),
      countries,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load MCC/MNC data", entries: [], countries: [] }, { status: 500 });
  }
}

// POST: add new MCC/MNC entry
export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureMccmncTable();
    const body = await request.json();

    // Bulk import
    if (body.entries && Array.isArray(body.entries)) {
      let ok = 0;
      for (const e of body.entries) {
        try {
          await executeVos(
            "INSERT INTO e_mccmnc (country, operator, mcc, mnc) VALUES (?,?,?,?)",
            [e.country || "", e.operator || "", String(e.mcc || ""), String(e.mnc || "")]
          );
          ok++;
        } catch { /* skip duplicates */ }
      }
      return NextResponse.json({ success: true, imported: ok, total: body.entries.length });
    }

    // Single
    const { country, operator, mcc, mnc } = body;
    if (!country || !mcc) return NextResponse.json({ error: "Country and MCC required" }, { status: 400 });
    await executeVos("INSERT INTO e_mccmnc (country, operator, mcc, mnc) VALUES (?,?,?,?)", [country, operator || "", String(mcc), String(mnc || "")]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed to add entry" }, { status: 500 }); }
}

// DELETE
export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureMccmncTable();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_mccmnc WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed to delete" }, { status: 500 }); }
}
