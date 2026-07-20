import { NextResponse } from "next/server";
import { testVosConnection } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await testVosConnection();
  return NextResponse.json(result);
}
