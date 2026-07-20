import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: { id: user.id, username: user.username, userType: user.userType, loginType: user.loginType },
  });
}
