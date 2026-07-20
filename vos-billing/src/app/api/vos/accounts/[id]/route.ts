import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();

    // Support partial update for status toggle and field edits
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.status !== undefined) {
      fields.push("status = ?");
      values.push(Number(body.status));
    }
    if (body.money !== undefined) {
      fields.push("money = ?");
      values.push(Number(body.money));
    }
    if (body.limitmoney !== undefined) {
      fields.push("limitmoney = ?");
      values.push(Number(body.limitmoney));
    }
    if (body.name !== undefined) {
      fields.push("name = ?");
      values.push(String(body.name));
    }
    if (body.account !== undefined) {
      fields.push("account = ?");
      values.push(String(body.account));
    }
    if (body.type !== undefined) {
      fields.push("type = ?");
      values.push(Number(body.type));
    }
    if (body.feerateGroupId !== undefined) {
      fields.push("feerategroup_id = ?");
      values.push(Number(body.feerateGroupId));
    }
    if (body.email !== undefined) {
      fields.push("alarmemail = ?");
      values.push(String(body.email));
    }

    // Contact details: build memo JSON merging with existing
    const hasContact = body.phone !== undefined || body.company !== undefined || body.address !== undefined ||
        body.bankAccount !== undefined || body.cc !== undefined || body.bcc !== undefined;
    if (hasContact) {
      const contactVals = [body.phone, body.company, body.address, body.bankAccount, body.cc, body.bcc]
        .map(v => v !== undefined ? String(v).trim() : "");
      const hasNonEmpty = contactVals.some(v => v !== "");
      
      if (hasNonEmpty) {
        const existing = await queryVos<any>("SELECT memo FROM e_customer WHERE id = ?", [parseInt(id)]);
        const raw = existing[0]?.memo || "";
        let memo: Record<string, string> = {};
        let isJson = false;
        try { if (raw) { memo = JSON.parse(raw); isJson = true; } } catch {}
        // Preserve plain text memo as remark
        if (!isJson && raw.trim()) memo = { remark: raw.trim() };
        if (body.phone !== undefined) memo.phone = String(body.phone);
        if (body.company !== undefined) memo.company = String(body.company);
        if (body.address !== undefined) memo.address = String(body.address);
        if (body.bankAccount !== undefined) memo.bankAccount = String(body.bankAccount);
        if (body.cc !== undefined) memo.cc = String(body.cc);
        if (body.bcc !== undefined) memo.bcc = String(body.bcc);
        // Clean up empty keys
        Object.keys(memo).forEach(k => { if (!memo[k]) delete memo[k]; });
        fields.push("memo = ?");
        values.push(JSON.stringify(memo));
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(parseInt(id));
    await executeVos(
      `UPDATE e_customer SET ${fields.join(", ")}, lastupdatetime = UNIX_TIMESTAMP() WHERE id = ?`,
      values
    );

    // Return updated account
    const rows = await queryVos<any>("SELECT id, account, name, money, limitmoney, status, type FROM e_customer WHERE id = ?", [parseInt(id)]);
    return NextResponse.json({ success: true, account: rows[0] || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    await executeVos("DELETE FROM e_customer WHERE id = ?", [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
