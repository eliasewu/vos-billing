import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

// GET: list all area prefixes from VOS3000 e_areacode with rate usage count
export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const search = request.nextUrl.searchParams.get("search") || "";
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") || "1"));
    const limit = Math.min(1000, Math.max(10, parseInt(request.nextUrl.searchParams.get("limit") || "100")));
    const offset = (page - 1) * limit;

    // WHERE clause for filtering
    let whereClause = "WHERE 1=1";
    const params: string[] = [];
    if (search) {
      whereClause += " AND (a.areacode LIKE ? OR a.location LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Count total (for pagination)
    const countSql = `SELECT COUNT(*) AS total FROM e_areacode a ${whereClause}`;
    const countRows = await queryVos<{ total: number }>(countSql, params);
    const total = Number(countRows[0]?.total ?? 0);

    // Paginated query
    let sql = `SELECT a.areacode, a.location,
               COALESCE(a.initial_billing, 1) AS initial_billing,
               COALESCE(a.incremental_billing, 1) AS incremental_billing,
               COALESCE(r.cnt, 0) AS rate_count
               FROM e_areacode a
               LEFT JOIN (
                 SELECT areacode, COUNT(*) AS cnt
                 FROM e_feerate
                 WHERE areacode IS NOT NULL AND areacode != ''
                 GROUP BY areacode
               ) r ON r.areacode = a.areacode
               ${whereClause}
               ORDER BY a.areacode ASC LIMIT ? OFFSET ?`;
    params.push(String(limit), String(offset));
    const rows = await queryVos<Record<string, unknown>>(sql, params);

    const prefixes = rows.map(r => ({
      areacode: String(r.areacode || ""),
      location: String(r.location || ""),
      initialBilling: Number(r.initial_billing || 1),
      incrementalBilling: Number(r.incremental_billing || 1),
      rateCount: Number(r.rate_count || 0),
    }));

    return NextResponse.json({ prefixes, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load area prefixes", prefixes: [] },
      { status: 500 }
    );
  }
}

// POST: add a new area prefix or bulk CSV import
export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Bulk CSV import
    if (body.csv_import && Array.isArray(body.rows)) {
      const rows: Array<{ areacode: string; location: string; initialBilling?: number; incrementalBilling?: number }> = body.rows;
      if (rows.length === 0) return NextResponse.json({ error: "No rows provided" }, { status: 400 });
      if (rows.length > 50000) return NextResponse.json({ error: "Max 50000 rows per import" }, { status: 400 });

      let imported = 0;
      let failed = 0;
      for (const row of rows) {
        const ac = String(row.areacode || "").trim();
        const loc = String(row.location || "").trim();
        if (!ac || !loc) { failed++; continue; }
        const initBill = Number(row.initialBilling ?? 1);
        const incrBill = Number(row.incrementalBilling ?? 1);
        try {
          await executeVos(
            `INSERT INTO e_areacode (areacode, location, initial_billing, incremental_billing) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE location = VALUES(location), initial_billing = VALUES(initial_billing), incremental_billing = VALUES(incremental_billing)`,
            [ac, loc, initBill, incrBill]
          );
          imported++;
        } catch {
          failed++;
        }
      }
      return NextResponse.json({ success: true, imported, failed, total: rows.length });
    }

    const { areacode, location, initialBilling, incrementalBilling } = body;

    if (!areacode) return NextResponse.json({ error: "Area code is required" }, { status: 400 });
    if (!location) return NextResponse.json({ error: "Country/Location name is required" }, { status: 400 });

    const initBill = initialBilling !== undefined ? Number(initialBilling) : 1;
    const incrBill = incrementalBilling !== undefined ? Number(incrementalBilling) : 1;

    // Upsert: insert or update
    await executeVos(
      `INSERT INTO e_areacode (areacode, location, initial_billing, incremental_billing) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE location = VALUES(location), initial_billing = VALUES(initial_billing), incremental_billing = VALUES(incremental_billing)`,
      [String(areacode), String(location), initBill, incrBill]
    );

    return NextResponse.json({ success: true, areacode, location, initialBilling: initBill, incrementalBilling: incrBill });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add area prefix" },
      { status: 500 }
    );
  }
}

// PUT: update an area prefix location
export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { areacode, location, initialBilling, incrementalBilling } = body;

    if (!areacode) return NextResponse.json({ error: "Area code is required" }, { status: 400 });
    if (!location) return NextResponse.json({ error: "Location name is required" }, { status: 400 });

    // Check if exists
    const existing = await queryVos<any>("SELECT areacode FROM e_areacode WHERE areacode = ?", [String(areacode)]);
    if ((existing as any[]).length === 0) {
      return NextResponse.json({ error: "Area code not found" }, { status: 404 });
    }

    const fields: string[] = ["location = ?"];
    const params: any[] = [String(location)];

    if (initialBilling !== undefined) {
      fields.push("initial_billing = ?");
      params.push(Number(initialBilling));
    }
    if (incrementalBilling !== undefined) {
      fields.push("incremental_billing = ?");
      params.push(Number(incrementalBilling));
    }

    params.push(String(areacode));

    await executeVos(
      `UPDATE e_areacode SET ${fields.join(", ")} WHERE areacode = ?`,
      params
    );

    return NextResponse.json({ success: true, areacode, location });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update area prefix" },
      { status: 500 }
    );
  }
}

// DELETE: remove an area prefix
export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const areacode = request.nextUrl.searchParams.get("areacode");
    if (!areacode) return NextResponse.json({ error: "Area code is required" }, { status: 400 });

    await executeVos("DELETE FROM e_areacode WHERE areacode = ?", [String(areacode)]);
    return NextResponse.json({ success: true, areacode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete area prefix" },
      { status: 500 }
    );
  }
}
