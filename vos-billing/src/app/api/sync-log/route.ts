import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncLog } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select()
    .from(syncLog)
    .orderBy(desc(syncLog.createdAt))
    .limit(100);
  return NextResponse.json(rows);
}
