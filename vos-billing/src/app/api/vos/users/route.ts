import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import crypto from "crypto";

function md5(s: string) { return crypto.createHash("md5").update(s).digest("hex"); }

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
  try {
    const b = await request.json();
    if (!b.loginName) return NextResponse.json({ error: "Login name required" }, { status: 400 });
    const result = await executeVos(
      "INSERT INTO e_user (loginname, username, password, level, locktype, expiretime, memo, limitmacs, macs, user_privilege_id) VALUES (?,?,MD5(?),?,?,?,?,?,?,?)",
      [b.loginName, b.userName || "", b.password || "pass123", b.level || 0, b.lockType ?? 0, b.expireTime || 0, b.memo || "", b.limitMacs || 0, b.macs || "", b.privilegeId || 0]
    );
    return NextResponse.json({ success: true, id: (result as any).insertId });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    if (!b.id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const fields: string[] = [];
    const values: (string | number)[] = [];
    if (b.loginName !== undefined) { fields.push("loginname = ?"); values.push(String(b.loginName)); }
    if (b.userName !== undefined) { fields.push("username = ?"); values.push(String(b.userName)); }
    if (b.password && b.password.trim()) { fields.push("password = MD5(?)"); values.push(String(b.password)); }
    if (b.level !== undefined) { fields.push("level = ?"); values.push(Number(b.level)); }
    if (b.lockType !== undefined) { fields.push("locktype = ?"); values.push(Number(b.lockType)); }
    if (b.expireTime !== undefined) { fields.push("expiretime = ?"); values.push(Number(b.expireTime)); }
    if (b.memo !== undefined) { fields.push("memo = ?"); values.push(String(b.memo)); }
    if (b.limitMacs !== undefined) { fields.push("limitmacs = ?"); values.push(Number(b.limitMacs)); }
    if (b.macs !== undefined) { fields.push("macs = ?"); values.push(String(b.macs)); }
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
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await executeVos("DELETE FROM e_user WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
