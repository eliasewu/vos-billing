import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

// GET: list customers for payment dropdown + recent payment history
export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "customers";

    if (mode === "history") {
      const customerId = searchParams.get("customer_id") || "";
      let where = "";
      const params: (string | number)[] = [];
      if (customerId) {
        where = " WHERE customeraccount = ?";
        params.push(customerId);
      }
      const sql = `SELECT id, customeraccount, customername, paymoney, customermoney, time, memo, paytype, type, loginname
        FROM e_payhistory ${where} ORDER BY id DESC LIMIT 100`;
      const rows = await queryVos<any[]>(sql, params);
      return NextResponse.json({
        history: rows.map((r: any) => ({
          id: r.id,
          customerAccount: r.customeraccount,
          customerName: r.customername,
          payMoney: Number(r.paymoney || 0),
          customerMoney: Number(r.customermoney || 0),
          time: r.time,
          memo: r.memo,
          payType: r.paytype,
          type: r.type,
          loginName: r.loginname,
        })),
      });
    }

    // Default: list customers
    const rows = await queryVos<any[]>(
      "SELECT id, account, name, money, limitmoney FROM e_customer ORDER BY name"
    );
    return NextResponse.json({
      customers: rows.map((r: any) => ({
        id: r.id,
        account: r.account,
        name: r.name,
        money: Number(r.money || 0),
        limitMoney: Number(r.limitmoney || 0),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

// POST: add or deduct balance
export async function POST(request: NextRequest) {
  const loginUser = await verifySession();
  if (!loginUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customerAccount, amount, memo, payType } = body;

    if (!customerAccount || !amount) {
      return NextResponse.json({ error: "Customer account and amount are required" }, { status: 400 });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount === 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Update customer balance atomically (no race condition)
    await executeVos(
      "UPDATE e_customer SET money = money + ?, lastupdatetime = ? WHERE account = ?",
      [payAmount, Math.floor(Date.now() / 1000), customerAccount]
    );

    // Get updated balance
    const rows = await queryVos<any>(
      "SELECT account, name, money FROM e_customer WHERE account = ?",
      [customerAccount]
    );
    const customer = rows[0] as any;

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const currentMoney = Number(customer.money || 0);
    const newMoney = currentMoney;
    const now = Math.floor(Date.now() / 1000);

    // Insert payment history
    await executeVos(
      `INSERT INTO e_payhistory (customeraccount, customername, paymoney, customermoney, time, memo, paytype, type, loginname)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerAccount,
        customer.name,
        payAmount,
        newMoney,
        now,
        memo || "",
        payType || 0,
        payAmount >= 0 ? 1 : 2, // 1=topup, 2=deduct
        loginUser.username || "admin",
      ]
    );

    return NextResponse.json({
      success: true,
      customerAccount,
      customerName: customer.name,
      previousBalance: currentMoney,
      newBalance: newMoney,
      amount: payAmount,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Payment failed" }, { status: 500 });
  }
}
