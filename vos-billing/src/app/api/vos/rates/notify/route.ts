import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { sendRateEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { customerId, type, rates } = body;

    if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });

    // Get customer email
    const [cust] = await queryVos<any>("SELECT name, email, alarmemail FROM e_customer WHERE id = ?", [customerId]);
    const customerName = (cust as any)?.name || "Customer";
    const email = (cust as any)?.email || (cust as any)?.alarmemail || "";

    if (!email) {
      return NextResponse.json({ success: false, message: `No email address found for ${customerName}. Add email in Account → General Account.` });
    }

    const result = await sendRateEmail(email, type || "client", customerName, rates || []);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
