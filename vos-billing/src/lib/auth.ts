import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { queryVos, executeVos } from "./vos-db";
import crypto from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "vos3000-web-platform-secret-key-change-me"
);

export interface AuthUser {
  id: number;
  username: string;
  userType: number;
  loginType?: "admin" | "customer";
}

// VOS3000 uses MD5 or SHA-512 password hashing depending on version
function md5Hash(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

function sha512Hash(str: string): string {
  return crypto.createHash("sha512").update(str).digest("hex");
}

// Some VOS3000 versions use a double-MD5 or salted hash
function doubleMd5Hash(str: string): string {
  return md5Hash(md5Hash(str));
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthUser | null> {
  try {
    // VOS3000 table names can vary, try common ones
    const tables = ["e_user", "e_sysuser", "sysuser", "user", "admin"];
    
    for (const table of tables) {
      try {
        const hashedPasswordMd5 = md5Hash(password);
        const hashedPasswordSha512 = sha512Hash(password);
        const hashedPasswordDoubleMd5 = doubleMd5Hash(password);
        // VOS3000 e_user uses 'loginname' and 'locktype' (0=active, 1=locked)
        // Also try 'username' field which some versions use
        // Check expiretime: 0 = never expires, otherwise must be in the future
        // Try multiple hash formats: plaintext, MD5, SHA-512, double MD5
        // Note: VOS3000 e_user uses 'locktype' (0=active, 1=locked), no 'status' column
        // Different VOS versions may use different column names - we handle e_user primarily
        const users = await queryVos<Record<string, unknown>>(
          `SELECT * FROM ${table} WHERE (loginname = ? OR username = ?) AND (password = ? OR password = ? OR password = ? OR password = ?) AND (locktype = 0 OR locktype IS NULL) AND (expiretime = 0 OR expiretime IS NULL OR expiretime > UNIX_TIMESTAMP(NOW())) LIMIT 1`,
          [username, username, password, hashedPasswordMd5, hashedPasswordSha512, hashedPasswordDoubleMd5]
        );

        if (users.length > 0) {
          const user = users[0] as Record<string, unknown>;
          // Update last login
          try {
            await executeVos(
              `UPDATE ${table} SET lastlogin = UNIX_TIMESTAMP(NOW()) WHERE id = ?`,
              [user.id as number]
            );
          } catch {
            // Ignore update errors
          }
          return {
            id: user.id as number,
            username: (user.loginname as string) || (user.username as string) || username,
            userType: (user.level as number) || (user.user_type as number) || 0,
          };
        }
      } catch {
        // Table doesn't exist, try next
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export async function createSession(user: AuthUser, rememberMe = false): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    userType: user.userType,
    loginType: user.loginType || "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? "30d" : "24h")
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

export async function setSessionCookie(token: string, rememberMe = false) {
  const cookieStore = await cookies();
  cookieStore.set("vos_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days or 24 hours
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("vos_session");
}
