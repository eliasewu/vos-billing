import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const type = request.nextUrl.searchParams.get("type"); // 0=General, 1=Clearing

    let sql = `SELECT id, customer_id, account, name, money, status, 
              limitmoney, todayconsumption, feerategroup_id, 
              feerategroupprivate_id, locktype, memo, alarmemail
              FROM e_customer WHERE locktype = 0`;
    const params: (string | number)[] = [];

    if (type === "1") {
      // Clearing type: filtered by having a feerategroupprivate_id set
      sql += ` AND feerategroupprivate_id > 0 ORDER BY id DESC`;
    } else if (type === "0") {
      // General type
      sql += ` ORDER BY id DESC`;
    } else {
      sql += ` ORDER BY id DESC`;
    }

    const rows = await queryVos<Record<string, unknown>>(sql, params);

    const customers = rows.map((row) => {
      const isClearing = (Number(row.feerategroupprivate_id) || 0) > 0;
      // VOS: status=0 means active, frontend expects status=1 for active
      const vosStatus = Number(row.status) || 0;
      return {
        id: row.id,
        customer_name: row.name || row.account,
        customer_type: isClearing ? 1 : 0,
        status: vosStatus === 0 ? 1 : 0,  // invert: VOS 0=active → frontend 1=active
        balance: Number(row.money) || 0,
        credit: Number(row.limitmoney) || 0,
        creditLimit: Number(row.limitmoney) || 0,
        contact_name: "",
        contact_phone: "",
        contact_email: (row.alarmemail as string) || "",
        create_time: "",
        remark: (row.memo as string) || "",
        feerategroup_id: Number(row.feerategroup_id) || 0,
        feerategroupprivate_id: Number(row.feerategroupprivate_id) || 0,
      };
    });

    return NextResponse.json({ customers, table: "e_customer" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, customers: [] });
  }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // VOS3000 e_customer.id is NOT auto-increment — manually get next ID
    const [maxRow] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_customer");
    const nextId = Number(maxRow?.next_id || 1);

    const result = await executeVos(
      `INSERT INTO e_customer (id, customer_id, account, name, status, money, limitmoney, memo, type, locktype)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextId,
        nextId,
        body.account || body.customer_name || "",
        body.name || body.customer_name || "",
        body.status ?? 0,
        body.balance || 0,
        body.creditLimit || 0,
        body.remark || "",
        body.customer_type ?? 0,
        0, // locktype=0 unlocked
      ]
    );

    return NextResponse.json({ success: true, id: nextId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    // Also clean up associated clearing account
    await executeVos("DELETE FROM e_clearing_account WHERE customer_id = ?", [id]);
    await executeVos("DELETE FROM e_customer WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch(e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
