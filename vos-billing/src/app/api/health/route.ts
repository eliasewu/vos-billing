import { NextResponse } from "next/server";
import { testVosConnection } from "@/lib/vos-db";

export async function GET() {
  const db = await testVosConnection();

  const status = db.connected ? "healthy" : "unhealthy";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      database: {
        connected: db.connected,
        version: db.version || null,
        error: db.error || null,
      },
      uptime: process.uptime(),
    },
    {
      status: db.connected ? 200 : 503,
    }
  );
}
