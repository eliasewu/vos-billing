import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rates, rateGroups, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const groupId = request.nextUrl.searchParams.get("groupId");

  if (groupId) {
    const rows = await db
      .select()
      .from(rates)
      .where(eq(rates.rateGroupId, parseInt(groupId)))
      .orderBy(rates.prefix);
    return NextResponse.json(rows);
  }

  // Return rate groups with account info
  const groups = await db
    .select({
      id: rateGroups.id,
      accountId: rateGroups.accountId,
      accountName: accounts.name,
      accountType: accounts.accountType,
      name: rateGroups.name,
      description: rateGroups.description,
      effectiveDate: rateGroups.effectiveDate,
      syncStatus: rateGroups.syncStatus,
      createdAt: rateGroups.createdAt,
    })
    .from(rateGroups)
    .innerJoin(accounts, eq(rateGroups.accountId, accounts.id))
    .orderBy(rateGroups.createdAt);

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.rateGroupId) {
    // Adding individual rates
    const inserted = await db
      .insert(rates)
      .values({
        rateGroupId: body.rateGroupId,
        prefix: body.prefix,
        destination: body.destination,
        ratePerMin: body.ratePerMin,
        connectCharge: body.connectCharge || "0",
        minDuration: body.minDuration || 1,
        increment: body.increment || 1,
      })
      .returning();
    return NextResponse.json(inserted[0], { status: 201 });
  }

  // Creating a rate group
  const inserted = await db
    .insert(rateGroups)
    .values({
      accountId: body.accountId,
      name: body.name,
      description: body.description,
    })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
