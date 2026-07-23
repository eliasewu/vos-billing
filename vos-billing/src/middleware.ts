import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Must match the secret used in lib/auth.ts exactly
const rawSecret = process.env.JWT_SECRET || "";
if (!rawSecret) {
  console.warn("[middleware] JWT_SECRET not set — auth will fail until configured");
}
const JWT_SECRET = new TextEncoder().encode(rawSecret);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /dashboard routes — the root page and login handle their own auth
  // Skip internal Next.js RSC requests (they carry no cookies and shouldn't redirect)
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Skip RSC protocol requests — they're internal Next.js prefetch/navigation requests
  const isRscRequest = request.headers.get("rsc") === "1" || request.nextUrl.searchParams.has("_rsc");
  if (isRscRequest) {
    return NextResponse.next();
  }

  const token = request.cookies.get("vos_session")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token invalid or expired — clear it and redirect
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("vos_session");
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
