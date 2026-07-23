import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { queryVos, executeVos } from "./vos-db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

function getJwtSecret(): Uint8Array {
  // 1. Environment variable (set in production)
  if (process.env.JWT_SECRET) {
    return new TextEncoder().encode(process.env.JWT_SECRET);
  }
  // 2. Persistent file-based secret (survives restarts)
  const secretPath = path.join(process.cwd(), ".jwt_secret");
  try {
    const fromFile = fs.readFileSync(secretPath, "utf8").trim();
    if (fromFile.length >= 32) return new TextEncoder().encode(fromFile);
  } catch { /* file doesn't exist yet */ }
  // 3. Generate once and persist
  const newSecret = crypto.randomBytes(32).toString("hex");
  try { fs.writeFileSync(secretPath, newSecret, { mode: 0o600 }); } catch { /* read-only fs */ }
  console.warn("[auth] JWT_SECRET not set — auto-generated secret persisted to .jwt_secret");
  return new TextEncoder().encode(newSecret);
}

const JWT_SECRET = getJwtSecret();

const BCRYPT_ROUNDS = 12;

export interface AuthUser {
  id: number;
  username: string;
  userType: number;
  loginType?: "admin" | "customer";
}

// ─── Hashing: bcrypt first (GUI users), MD5 fallback (VOS3000) ───

function md5Hash(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

function sha512Hash(str: string): string {
  return crypto.createHash("sha512").update(str).digest("hex");
}

function doubleMd5Hash(str: string): string {
  return md5Hash(md5Hash(str));
}

export async function hashPasswordBcrypt(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPasswordBcrypt(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// ─── Authentication ───

// Whitelist of valid VOS3000 user tables (prevents SQL injection via table name)
const ALLOWED_USER_TABLES = ["e_user", "e_sysuser", "sysuser", "user", "admin"];

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthUser | null> {
  try {
    for (const table of ALLOWED_USER_TABLES) {
      try {
        // Get the user record first (don't interpolate table name more than needed — use validated table)
        const users = await queryVos<Record<string, unknown>>(
          `SELECT * FROM \`${table}\` WHERE (loginname = ? OR username = ?) AND (locktype = 0 OR locktype IS NULL) AND (expiretime = 0 OR expiretime IS NULL OR expiretime > UNIX_TIMESTAMP(NOW())) LIMIT 1`,
          [username, username]
        );

        if (users.length === 0) continue;
        const user = users[0] as Record<string, unknown>;
        const storedHash = String(user.password || "");

        // Step 1: Try bcrypt first (new GUI-created/managed users)
        if (storedHash.startsWith("$2")) {
          const bcryptMatch = await verifyPasswordBcrypt(password, storedHash);
          if (bcryptMatch) {
            await updateLastLogin(table, user.id as number);
            return buildAuthUser(user, username);
          }
          // bcrypt hash didn't match — try MD5 as fallback for dual-hash users
        }

        // Step 2: Try MD5 (VOS3000 native)
        const hashedMd5 = md5Hash(password);
        const hashedSha512 = sha512Hash(password);
        const hashedDoubleMd5 = doubleMd5Hash(password);

        if (
          storedHash === password ||
          storedHash === hashedMd5 ||
          storedHash === hashedSha512 ||
          storedHash === hashedDoubleMd5
        ) {
          await updateLastLogin(table, user.id as number);
          return buildAuthUser(user, username);
        }

        return null;
      } catch {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

async function updateLastLogin(table: string, id: number) {
  try {
    await executeVos(
      `UPDATE \`${table}\` SET lastlogin = UNIX_TIMESTAMP(NOW()) WHERE id = ?`,
      [id]
    );
  } catch {
    // Ignore update errors
  }
}

function buildAuthUser(user: Record<string, unknown>, fallbackUsername: string): AuthUser {
  return {
    id: user.id as number,
    username: (user.loginname as string) || (user.username as string) || fallbackUsername,
    userType: (user.level as number) || (user.user_type as number) || 0,
  };
}

// ─── JWT Session ───

export async function createSession(user: AuthUser, rememberMe = false): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    userType: user.userType,
    loginType: user.loginType || "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? "7d" : "8h")   // Reduced from 30d/24h
    .setJti(crypto.randomUUID())                      // Unique token ID for revocation
    .sign(JWT_SECRET);

  return token;
}

export async function verifySession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_session")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as number,
      username: payload.username as string,
      userType: payload.userType as number,
      loginType: (payload.loginType === "customer" ? "customer" : "admin") as "admin" | "customer",
    };
  } catch {
    return null;
  }
}

// ─── Cookie Management ───

export async function setSessionCookie(token: string, rememberMe = false) {
  const cookieStore = await cookies();
  cookieStore.set("vos_session", token, {
    httpOnly: true,
    secure: true,                                   // Always secure (HTTPS only)
    sameSite: "strict",                              // CSRF protection
    maxAge: rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 8,  // 7 days or 8 hours
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  // Delete with same options to ensure proper removal
  cookieStore.set("vos_session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  cookieStore.delete("vos_session");
}

// ─── Password Management for GUI ───

/** Hash a password with bcrypt — for storing in VOS3000 e_user.password */
export async function hashGuiPassword(password: string): Promise<string> {
  return hashPasswordBcrypt(password);
}
