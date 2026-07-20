import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const rows = type
    ? await db
        .select()
        .from(accounts)
        .where(eq(accounts.accountType, type as "client" | "supplier"))
        .orderBy(accounts.createdAt)
    : await db.select().from(accounts).orderBy(accounts.createdAt);

  // Cast numeric fields from strings to numbers
  const result = rows.map((row) => ({
    ...row,
    balance: Number(row.balance),
    creditLimit: Number(row.creditLimit),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const inserted = await db
    .insert(accounts)
    .values({
      name: body.name,
      accountType: body.accountType,
      status: body.status || "active",
      company: body.company,
      email: body.email,
      phone: body.phone,
      balance: body.balance || "0",
      creditLimit: body.creditLimit || "0",
      currency: body.currency || "USD",
      notes: body.notes,
    })
    .returning();

  // Log the sync attempt
  await db.execute(
    sql`INSERT INTO sync_log (entity_type, entity_id, operation, status, request)
        VALUES ('account', ${inserted[0].id}, 'create', 'pending',
                ${JSON.stringify({ type: body.accountType === "client" ? "General" : "Clearing", name: body.name })})`
  );

  return NextResponse.json(inserted[0], { status: 201 });
}
