import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemAlerts, accounts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id: systemAlerts.id,
      alertType: systemAlerts.alertType,
      severity: systemAlerts.severity,
      title: systemAlerts.title,
      message: systemAlerts.message,
      accountId: systemAlerts.accountId,
      accountName: accounts.name,
      acknowledged: systemAlerts.acknowledged,
      createdAt: systemAlerts.createdAt,
    })
    .from(systemAlerts)
    .leftJoin(accounts, eq(systemAlerts.accountId, accounts.id))
    .orderBy(desc(systemAlerts.createdAt));

  return NextResponse.json(rows);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const updated = await db
    .update(systemAlerts)
    .set({ acknowledged: true })
    .where(eq(systemAlerts.id, body.id))
    .returning();
  return NextResponse.json(updated[0]);
}
