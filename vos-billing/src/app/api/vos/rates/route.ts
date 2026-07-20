import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

// ─── GET: List rate groups or rates within a group ───

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const groupId = request.nextUrl.searchParams.get("group_id");
    const search = request.nextUrl.searchParams.get("search") || "";

    // Cross-group prefix search
    if (search) {
      const rows = await queryVos<Record<string, unknown>>(
        `SELECT r.id, r.feeprefix, r.areacode, r.fee, r.tax, r.period, r.type, r.locktype,
          g.id AS group_id, g.name AS group_name,
          a.location AS area_name
        FROM e_feerate r
        INNER JOIN e_feerategroup g ON r.feerategroup_id = g.id
        LEFT JOIN e_areacode a ON r.areacode = a.areacode
        WHERE r.feeprefix LIKE ?
        ORDER BY g.name, r.feeprefix
        LIMIT 100`, [`%${search}%`]
      );
      const results = rows.map((r) => ({
        id: Number(r.id), prefix: String(r.feeprefix||""), areacode: String(r.areacode||""),
        fee: Number(r.fee)||0, tax: Number(r.tax)||0, period: Number(r.period)||0,
        type: Number(r.type)||0, locktype: Number(r.locktype)||0,
        group_name: String(r.group_name||""), group_id: Number(r.group_id),
        area_name: String(r.area_name||""),
      }));
      return NextResponse.json({ results });
    }

    if (groupId) {
      const rows = await queryVos<Record<string, unknown>>(
        `SELECT r.id, r.feeprefix, r.areacode, r.locktype, r.fee, r.tax, 
          r.period, r.ivrfee, r.ivrperiod, r.type, r.feerategroup_id,
          COALESCE(g.fakeminute, 60) AS fakeminute,
          g.id AS group_id, g.name AS group_name, 
          g.privilege, g.isprivate, g.memo AS group_memo,
          a.location AS area_name
        FROM e_feerate r
        INNER JOIN e_feerategroup g ON r.feerategroup_id = g.id
        LEFT JOIN e_areacode a ON r.areacode = a.areacode
        WHERE r.feerategroup_id = ?
        ORDER BY r.feeprefix ASC`, [parseInt(groupId)]
      );
      const rates = rows.map((r) => ({
        id: Number(r.id), prefix: String(r.feeprefix||""), areacode: String(r.areacode||""),
        locktype: Number(r.locktype)||0, fee: Number(r.fee)||0, tax: Number(r.tax)||0,
        period: Number(r.period)||0, ivrfee: Number(r.ivrfee)||0, ivrperiod: Number(r.ivrperiod)||0,
        type: Number(r.type)||0, feerategroup_id: Number(r.feerategroup_id),
        group_name: String(r.group_name||""), privilege: Number(r.privilege)||0,
        fakeminute: Number(r.fakeminute)||60, isprivate: Number(r.isprivate)||0,
        group_memo: String(r.group_memo||""),
        area_name: String(r.area_name||""),
      }));
      return NextResponse.json({ rates });
    }

    const groups = await queryVos<Record<string, unknown>>(
      `SELECT g.id, g.name, g.privilege, g.fakeminute, g.isprivate, g.memo, g.user_id,
        u.username AS creator_name,
        COUNT(r.id) AS rate_count, MIN(r.fee) AS min_rate, MAX(r.fee) AS max_rate,
        COALESCE(acct.cnt, 0) AS using_accounts
      FROM e_feerategroup g
      LEFT JOIN e_feerate r ON r.feerategroup_id = g.id
      LEFT JOIN e_user u ON g.user_id = u.id
      LEFT JOIN (
        SELECT feerategroup_id, COUNT(*) AS cnt
        FROM e_customer WHERE feerategroup_id > 0
        GROUP BY feerategroup_id
      ) acct ON g.id = acct.feerategroup_id
      GROUP BY g.id, g.name, g.privilege, g.fakeminute, g.isprivate, g.memo, g.user_id, u.username, acct.cnt
      ORDER BY g.name ASC`
    );
    const rateGroups = groups.map((g) => ({
      id: Number(g.id), name: String(g.name||""), privilege: Number(g.privilege)||0,
      fakeminute: Number(g.fakeminute)||60, isprivate: Number(g.isprivate)||0,
      memo: String(g.memo||""), user_id: Number(g.user_id)||0,
      creator_name: String(g.creator_name||""),
      using_accounts: Number(g.using_accounts)||0,
      rate_count: Number(g.rate_count)||0, min_rate: Number(g.min_rate)||0, max_rate: Number(g.max_rate)||0,
    }));
    return NextResponse.json({ rateGroups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, rateGroups: [], rates: [] });
  }
}

// ─── PUT: Update rate or group ───

export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, group_id } = body;

    if (group_id) {
      const fields: Record<string,string> = { name:"name", fakeminute:"fakeminute", isprivate:"isprivate", memo:"memo" };
      const updates: string[] = []; const values: (string|number)[] = [];
      for (const [col,key] of Object.entries(fields)) {
        if (body[key] !== undefined) { updates.push(`${col}=?`); values.push(body[key]); }
      }
      if (!updates.length) return NextResponse.json({ error:"No fields" }, { status:400 });
      values.push(Number(group_id));
      await executeVos(`UPDATE e_feerategroup SET ${updates.join(",")} WHERE id=?`, values);
      return NextResponse.json({ success:true, group_id, updated:updates.length });
    }

    if (!id) return NextResponse.json({ error:"ID required" }, { status:400 });
    const fields: Record<string,string> = {
      feeprefix:"prefix", areacode:"areacode", fee:"fee", tax:"tax", period:"period",
      ivrfee:"ivrfee", ivrperiod:"ivrperiod", type:"type", locktype:"locktype",
      feerategroup_id:"feerategroup_id",
    };
    const updates: string[] = []; const values: (string|number)[] = [];
    for (const [col,key] of Object.entries(fields)) {
      if (body[key] !== undefined) { updates.push(`${col}=?`); values.push(body[key]); }
    }
    if (!updates.length) return NextResponse.json({ error:"No fields" }, { status:400 });
    values.push(Number(id));
    await executeVos(`UPDATE e_feerate SET ${updates.join(",")} WHERE id=?`, values);
    return NextResponse.json({ success:true, id, updated:updates.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error:msg }, { status:500 });
  }
}

// ─── POST: Create new rate ───

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { feerategroup_id, prefix, areacode, fee, tax, period, ivrfee, ivrperiod, type, locktype } = body;

    if (!feerategroup_id) return NextResponse.json({ error: "Rate group ID is required" }, { status: 400 });
    if (!prefix) return NextResponse.json({ error: "Prefix is required" }, { status: 400 });

    const result = await executeVos(
      `INSERT INTO e_feerate (feerategroup_id, feeprefix, areacode, locktype, fee, tax, period, ivrfee, ivrperiod, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(feerategroup_id), String(prefix), String(areacode||""), Number(locktype)||0,
        Number(fee)||0, Number(tax)||0, Number(period)||0,
        Number(ivrfee)||0, Number(ivrperiod)||0, Number(type)||0,
      ]
    );

    return NextResponse.json({
      success: true,
      id: (result as { insertId?: number }).insertId,
      message: `Rate ${prefix} created`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE: Remove rate ───

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Rate ID is required" }, { status: 400 });

    const result = await executeVos("DELETE FROM e_feerate WHERE id = ?", [Number(id)]);
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) return NextResponse.json({ error: "Rate not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: `Rate ${id} deleted` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
