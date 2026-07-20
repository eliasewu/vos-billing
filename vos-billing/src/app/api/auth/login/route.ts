import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password, rememberMe, loginType } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    const user = await authenticateUser(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createSession({ ...user, loginType: loginType || "admin" }, !!rememberMe);
    await setSessionCookie(token, !!rememberMe);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        userType: user.userType,
        loginType: loginType || "admin",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
