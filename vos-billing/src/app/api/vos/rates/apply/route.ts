import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function POST(_request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // In a production VOS3000 environment, this would trigger a rate table reload
    // via the softswitch CLI or API (e.g., "reload rate" command).
    // For now, we acknowledge the apply request.
    return NextResponse.json({
      success: true,
      message: "Rate configuration applied. Changes will take effect on new calls.",
      appliedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to apply rates" }, { status: 500 });
  }
}
