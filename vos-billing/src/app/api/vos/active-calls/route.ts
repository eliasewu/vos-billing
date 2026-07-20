import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

const ACTIVE_CALL_TABLES = [
  "e_active_call",
  "active_call",
  "e_activecall",
  "activecall",
  "e_current_call",
  "current_call",
];

async function findActiveCallTable(): Promise<string | null> {
  for (const table of ACTIVE_CALL_TABLES) {
    try {
      await queryVos(`SELECT 1 FROM ${table} LIMIT 1`);
      return table;
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(_request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const table = await findActiveCallTable();
    if (!table) {
      return NextResponse.json({ 
        error: "Active call table not found", 
        activeCalls: [],
        note: "No active call table found. The table may be named differently in your VOS3000 installation."
      });
    }

    const activeCalls = await queryVos(`SELECT * FROM ${table} ORDER BY start_time DESC`);
    
    // Get summary stats
    const totalCalls = activeCalls.length;

    return NextResponse.json({ 
      activeCalls, 
      table,
      stats: {
        totalCalls,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, activeCalls: [] });
  }
}
