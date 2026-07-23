import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await verifySession();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        userType: user.userType,
      },
    });
  } catch (error) {
    // Covers unexpected failures: VOS3000 DB unreachable, crypto errors, JWT corruption
    console.error("[auth/me] Session verification failed:", error);
    return NextResponse.json(
      { user: null, error: "Session verification failed" },
      { status: 500 }
    );
  }
}
