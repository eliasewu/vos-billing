import { NextResponse } from "next/server";
import { resetRateLimiter } from "../../auth/login/route";

export async function POST() {
  // Only allow in development/test environments
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  resetRateLimiter();
  return NextResponse.json({ success: true });
}
