import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

// ─── Rate Limiter for login ───

interface RateEntry {
  count: number;
  resetAt: number;
}

const ipRateMap = new Map<string, RateEntry>();
const usernameFailMap = new Map<string, { count: number; lastFail: number; lockUntil: number }>();

const MAX_ATTEMPTS_PER_IP = 10;       // Max 10 login attempts per IP per minute
const MAX_FAILURES_PER_USER = 5;       // Max 5 failed attempts per username before lockout
const IP_WINDOW_MS = 60_000;           // 1 minute window for IP
const USER_LOCKOUT_MS = 300_000;       // 5 minute lockout per username after 5 failures
const CLEANUP_INTERVAL_MS = 300_000;   // Clean stale entries every 5 min

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of ipRateMap) { if (now > entry.resetAt) ipRateMap.delete(key); }
    for (const [user, entry] of usernameFailMap) {
      if (now > entry.lockUntil && now - entry.lastFail > USER_LOCKOUT_MS) usernameFailMap.delete(user);
    }
  }, CLEANUP_INTERVAL_MS);
  if (cleanupTimer && "unref" in cleanupTimer) cleanupTimer.unref();
}

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";
}

function checkIpRate(ip: string): { allowed: boolean; retryAfter?: number } {
  ensureCleanup();
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= MAX_ATTEMPTS_PER_IP) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  entry.count++;
  return { allowed: true };
}

function checkUsernameRate(username: string): { allowed: boolean; retryAfter?: number } {
  ensureCleanup();
  const now = Date.now();
  const entry = usernameFailMap.get(username);
  if (!entry) return { allowed: true };
  // If locked out
  if (now < entry.lockUntil) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockUntil - now) / 1000) };
  }
  // If lockout expired, reset
  if (now - entry.lastFail > USER_LOCKOUT_MS) {
    usernameFailMap.delete(username);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFailedAttempt(username: string) {
  const now = Date.now();
  const entry = usernameFailMap.get(username);
  if (!entry) {
    usernameFailMap.set(username, { count: 1, lastFail: now, lockUntil: 0 });
    return;
  }
  entry.count++;
  entry.lastFail = now;
  if (entry.count >= MAX_FAILURES_PER_USER) {
    // Progressive lockout: multiply lockout by number of times locked out
    const lockoutMultiplier = Math.min(Math.floor(entry.count / MAX_FAILURES_PER_USER), 6);
    entry.lockUntil = now + USER_LOCKOUT_MS * lockoutMultiplier;
  }
}

function clearFailedAttempts(username: string) {
  usernameFailMap.delete(username);
}

// ─── Test helper: reset all rate limiter state ───
export function resetRateLimiter() {
  ipRateMap.clear();
  usernameFailMap.clear();
}

// ─── Route Handler ───

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // 1. IP-based rate limiting
  const ipCheck = checkIpRate(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${ipCheck.retryAfter} seconds.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(ipCheck.retryAfter ?? 60),
          "X-RateLimit-Limit": String(MAX_ATTEMPTS_PER_IP),
        },
      }
    );
  }

  try {
    const { username, password, rememberMe, loginType } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    const normalizedUser = String(username).trim().slice(0, 100);

    // 2. Username-based rate limiting (credential stuffing detection)
    const userCheck = checkUsernameRate(normalizedUser);
    if (!userCheck.allowed) {
      return NextResponse.json(
        { error: `Account temporarily locked due to too many failed attempts. Try again in ${userCheck.retryAfter} seconds.` },
        {
          status: 429,
          headers: { "Retry-After": String(userCheck.retryAfter ?? 300) },
        }
      );
    }

    const user = await authenticateUser(normalizedUser, password);

    if (!user) {
      recordFailedAttempt(normalizedUser);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Successful login — clear failure history
    clearFailedAttempts(normalizedUser);

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
