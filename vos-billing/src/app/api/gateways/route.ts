import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gateways, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const accountId = request.nextUrl.searchParams.get("accountId");

  let query = db
    .select({
      id: gateways.id,
      accountId: gateways.accountId,
      accountName: accounts.name,
      name: gateways.name,
      gatewayType: gateways.gatewayType,
      protocol: gateways.protocol,
      ipAddress: gateways.ipAddress,
      port: gateways.port,
      prefix: gateways.prefix,
      maxChannels: gateways.maxChannels,
      enabled: gateways.enabled,
      vosGatewayId: gateways.vosGatewayId,
      syncStatus: gateways.syncStatus,
      createdAt: gateways.createdAt,
    })
    .from(gateways)
    .innerJoin(accounts, eq(gateways.accountId, accounts.id))
    .$dynamic();

  if (type) {
    query = query.where(eq(gateways.gatewayType, type as "mapping" | "routing"));
  }
  if (accountId) {
    query = query.where(eq(gateways.accountId, parseInt(accountId)));
  }

  const rows = await query;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const inserted = await db
    .insert(gateways)
    .values({
      accountId: body.accountId,
      name: body.name,
      gatewayType: body.gatewayType,
      protocol: body.protocol || "SIP",
      ipAddress: body.ipAddress,
      port: body.port || 5060,
      prefix: body.prefix,
      maxChannels: body.maxChannels || 30,
      enabled: body.enabled ?? true,
    })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
