import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession, hashGuiPassword } from "@/lib/auth";

// Rate limiter: max 5 requests per minute per IP for sensitive operations
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_CLEANUP_INTERVAL = 300000; // Clean up stale entries every 5 min

// Periodic cleanup of stale entries
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanupRunning() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
  }, RATE_LIMIT_CLEANUP_INTERVAL);
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref(); // Don't keep process alive
  }
}

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";
}

function checkRateLimit(ip: string, maxRequests = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW): boolean {
  ensureCleanupRunning();
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await queryVos<any>(
      "SELECT id, loginname, username, level, locktype, expiretime, lastlogin, lastmodifypassword, createduser_id, memo, limitmacs, macs, user_privilege_id FROM e_user ORDER BY id"
    );
    return NextResponse.json({
      users: (rows as any[]).map(r => ({
        id: r.id,
        loginName: r.loginname,
        userName: r.username,
        level: r.level,
        lockType: r.locktype,
        expireTime: r.expiretime,
        lastLogin: r.lastlogin,
        lastModifyPassword: r.lastmodifypassword,
        createdUserId: r.createduser_id,
        memo: r.memo || "",
        limitMacs: r.limitmacs,
        macs: r.macs || "",
        privilegeId: r.user_privilege_id || 0,
      })),
    });
  } catch (e: any) { return NextResponse.json({ error: e?.message, users: [] }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const b = await request.json();
    if (!b.loginName) return NextResponse.json({ error: "Login name required" }, { status: 400 });

    // Sanitize inputs
    const loginName = String(b.loginName).trim().slice(0, 100);
    const userName = String(b.userName || "").trim().slice(0, 255);
    const password = String(b.password || "pass123");

    // Hash with bcrypt for GUI-managed users
    const hashedPassword = await hashGuiPassword(password);

    const result = await executeVos(
      "INSERT INTO e_user (loginname, username, password, level, locktype, expiretime, memo, limitmacs, macs, user_privilege_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [loginName, userName, hashedPassword, Number(b.level) || 0, Number(b.lockType) ?? 0, Number(b.expireTime) || 0, String(b.memo || "").slice(0, 255), Number(b.limitMacs) || 0, String(b.macs || "").slice(0, 500), Number(b.privilegeId) || 0]
    );
    return NextResponse.json({ success: true, id: (result as any).insertId });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const b = await request.json();
    if (!b.id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const fields: string[] = [];
    const values: (string | number)[] = [];
    if (b.loginName !== undefined) { fields.push("loginname = ?"); values.push(String(b.loginName).trim().slice(0, 100)); }
    if (b.userName !== undefined) { fields.push("username = ?"); values.push(String(b.userName).trim().slice(0, 255)); }
    if (b.password && String(b.password).trim()) {
      const hashedPassword = await hashGuiPassword(String(b.password));
      fields.push("password = ?");
      values.push(hashedPassword);
    }
    if (b.level !== undefined) { fields.push("level = ?"); values.push(Number(b.level)); }
    if (b.lockType !== undefined) { fields.push("locktype = ?"); values.push(Number(b.lockType)); }
    if (b.expireTime !== undefined) { fields.push("expiretime = ?"); values.push(Number(b.expireTime)); }
    if (b.memo !== undefined) { fields.push("memo = ?"); values.push(String(b.memo).slice(0, 255)); }
    if (b.limitMacs !== undefined) { fields.push("limitmacs = ?"); values.push(Number(b.limitMacs)); }
    if (b.macs !== undefined) { fields.push("macs = ?"); values.push(String(b.macs).slice(0, 500)); }
    if (b.privilegeId !== undefined) { fields.push("user_privilege_id = ?"); values.push(Number(b.privilegeId)); }
    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    values.push(Number(b.id));
    await executeVos(`UPDATE e_user SET ${fields.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    // Prevent self-deletion
    if (Number(id) === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
    }
    await executeVos("DELETE FROM e_user WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
