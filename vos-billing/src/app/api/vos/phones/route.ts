import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>("SELECT p.*, c.customer_name FROM e_phone p LEFT JOIN e_customer c ON p.customer_id=c.id ORDER BY p.id");
    return NextResponse.json({ phones: (rows as any[]).map(r => ({ id: r.id, e164: r.e164, capacity: r.capacity, callLevel: r.calllevel, status: r.locktype, customerName: r.customer_name||null, customerId: r.customer_id||0, type: r.type||0, addtime: r.addtime||0, memo: r.memo||"" })) });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    
    // Bulk creation: numbers array
    if (b.numbers && Array.isArray(b.numbers)) {
      const customerId = b.customerId || 0;
      const capacity = b.capacity || 2;
      const callLevel = b.callLevel || 0;
      const password = b.password || "";
      const results: { e164: string; id: number; error?: string }[] = [];
      
      for (const e164 of b.numbers) {
        try {
          const [maxRow] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_phone");
          const nextId = Number(maxRow?.next_id || 1);
          await executeVos(
            "INSERT INTO e_phone (id, e164, password, capacity, calllevel, locktype, customer_id) VALUES (?,?,?,?,?,?,?)",
            [nextId, String(e164), password, capacity, callLevel, 0, customerId]
          );
          results.push({ e164: String(e164), id: nextId });
        } catch (err) {
          results.push({ e164: String(e164), id: 0, error: err instanceof Error ? err.message : "Failed" });
        }
      }
      return NextResponse.json({ success: true, results, total: b.numbers.length, succeeded: results.filter(r => !r.error).length });
    }
    
    // Single creation
    const [maxRow] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_phone");
    const nextId = Number(maxRow?.next_id || 1);
    await executeVos("INSERT INTO e_phone (id, e164, password, capacity, calllevel, locktype, customer_id) VALUES (?,?,?,?,?,?,?)", [nextId, b.e164||"", b.password||"", b.capacity||2, b.callLevel||0, 0, b.customerId||0]);
    return NextResponse.json({ success: true, id: nextId });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); }
}

// PUT: Update phone record
export async function PATCH(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    if (!b.id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const fields: string[] = [];
    const values: (string | number)[] = [];
    const fieldMap: Record<string, string> = {
      e164: "e164", password: "password", capacity: "capacity",
      callLevel: "calllevel", status: "locktype", customerId: "customer_id",
      type: "type", memo: "memo",
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (b[key] !== undefined && b[key] !== "") { fields.push(`${col} = ?`); values.push(b[key]); }
    }
    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    values.push(Number(b.id));
    await executeVos(`UPDATE e_phone SET ${fields.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ success: true, id: b.id });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 500 }); }
}

// PUT: Deduct bill from customer accounts based on CDR usage
export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    const body = await request.json();
    const { customerId, amount, memo } = body;
    
    if (!customerId || !amount) {
      return NextResponse.json({ error: "customerId and amount are required" }, { status: 400 });
    }
    
    const deductionAmount = Math.abs(Number(amount));
    
    // Get current customer balance
    const [customer] = await queryVos<any>("SELECT money FROM e_customer WHERE id = ?", [customerId]);
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    
    const currentBalance = Number(customer.money || 0);
    const newBalance = currentBalance - deductionAmount;
    
    // Update customer balance
    await executeVos("UPDATE e_customer SET money = ? WHERE id = ?", [newBalance, customerId]);
    
    // Log deduction
    try {
      await executeVos(
        "INSERT INTO e_billing (customer_id, bill_date, total_calls, total_duration, total_fee, status, memo) VALUES (?, CURDATE(), 0, 0, ?, 1, ?)",
        [customerId, deductionAmount, memo || "Manual deduction from phone operation"]
      );
    } catch { /* billing table may not exist */ }
    
    return NextResponse.json({
      success: true,
      customerId,
      previousBalance: currentBalance,
      deduction: deductionAmount,
      newBalance,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Deduction failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_phone WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); }
}
