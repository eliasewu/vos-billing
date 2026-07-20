import { NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";

const START_TIME = Date.now();

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  let healthy = true;

  // 1. VOS3000 MySQL check
  try {
    const t0 = Date.now();
    await queryVos("SELECT 1 AS ok");
    checks.vosDb = { status: "ok", latencyMs: Date.now() - t0 };
  } catch (error) {
    healthy = false;
    checks.vosDb = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // 2. App runtime info
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
  const uptime =
    uptimeSeconds < 60
      ? `${uptimeSeconds}s`
      : uptimeSeconds < 3600
        ? `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`
        : `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;

  const status = healthy ? "healthy" : "degraded";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      uptimeSeconds,
      version: process.env.npm_package_version || "1.0.0",
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
