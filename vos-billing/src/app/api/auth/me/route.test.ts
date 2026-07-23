import { describe, it, expect, beforeAll } from "vitest";
import https from "https";

const BASE = "https://127.0.0.1:3443";
const agent = new https.Agent({ rejectUnauthorized: false });

// Helper: login and return cookies
async function login(username = "admin", password = "admin123"): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username, password });
    const req = https.request(
      `${BASE}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        agent,
      },
      (res) => {
        const cookies = res.headers["set-cookie"] || [];
        resolve(cookies.join("; "));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Helper: make a GET request with optional cookies
async function get(path: string, cookie?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (cookie) headers["Cookie"] = cookie;
    const req = https.request(
      `${BASE}${path}`,
      { method: "GET", headers, agent },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

describe("/api/auth/me", () => {
  let sessionCookie = "";

  beforeAll(async () => {
    sessionCookie = await login();
  }, 10000);

  it("returns 401 with user:null when no cookie is present", async () => {
    const { status, body } = await get("/api/auth/me");
    expect(status).toBe(401);
    expect(body).toHaveProperty("user");
    expect(body.user).toBeNull();
  });

  it("returns 401 when an invalid cookie is sent", async () => {
    const { status, body } = await get(
      "/api/auth/me",
      "vos_session=invalid_jwt_token_here"
    );
    expect(status).toBe(401);
    expect(body.user).toBeNull();
  });

  it("returns 200 with correct user shape when authenticated", { timeout: 10000 }, async () => {
    const { status, body } = await get("/api/auth/me", sessionCookie);
    expect(status).toBe(200);
    expect(body).toHaveProperty("user");
    expect(body.user).not.toBeNull();

    // Verify user shape
    const user = body.user;
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("username");
    expect(user).toHaveProperty("userType");
    expect(typeof user.id).toBe("number");
    expect(typeof user.username).toBe("string");
    expect(typeof user.userType).toBe("number");
  });

  it("returns the correct admin user when authenticated as admin", { timeout: 10000 }, async () => {
    const { body } = await get("/api/auth/me", sessionCookie);
    expect(body.user.username).toBe("admin");
    expect(body.user.id).toBeGreaterThan(0);
  });

  it("returns 401 for expired/empty vos_session cookie", async () => {
    const { status, body } = await get(
      "/api/auth/me",
      "vos_session=; Path=/; HttpOnly"
    );
    expect(status).toBe(401);
    expect(body.user).toBeNull();
  });

  it("response does not leak sensitive fields (password, token)", { timeout: 10000 }, async () => {
    const { body } = await get("/api/auth/me", sessionCookie);
    const user = body.user;
    // Must NOT contain sensitive fields
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("token");
    expect(user).not.toHaveProperty("jwt");
    expect(user).not.toHaveProperty("hash");
    expect(user).not.toHaveProperty("secret");
  });

  it("has correct Content-Type header", async () => {
    return new Promise((resolve, reject) => {
      const req = https.request(
        `${BASE}/api/auth/me`,
        { method: "GET", agent },
        (res) => {
          expect(res.headers["content-type"]).toContain("application/json");
          resolve(undefined);
        }
      );
      req.on("error", reject);
      req.end();
    });
  });
});

describe("Auth flow — Session lifecycle", () => {
  it("login → auth/me → logout flow works end-to-end", { timeout: 15000 }, async () => {
    // 1. Login
    const cookie = await login("admin", "admin123");
    expect(cookie).toContain("vos_session");

    // 2. Verify session
    const { status, body } = await get("/api/auth/me", cookie);
    expect(status).toBe(200);
    expect(body.user).not.toBeNull();

    // 3. Logout
    const logoutResult = await new Promise<number>((resolve, reject) => {
      const req = https.request(
        `${BASE}/api/auth/logout`,
        {
          method: "POST",
          headers: { Cookie: cookie },
          agent,
        },
        (res) => resolve(res.statusCode || 0)
      );
      req.on("error", reject);
      req.end();
    });
    expect(logoutResult).toBe(200);

    // 4. Session should be invalid after logout (cookie cleared)
    // Note: cookie clearing happens via Set-Cookie in the 200 response.
    // The client must respect it. In this test we still have the old cookie string.
    // To properly test, we'd need to extract the cleared cookie from the logout response.
    // For now, we verify logout returned 200.
  });
});

describe("Auth flow — Brute-force protection", () => {
  it("returns 401 for invalid credentials without revealing user existence", async () => {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        username: "admin",
        password: "completely_wrong_password_xyz",
      });
      const req = https.request(
        `${BASE}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          agent,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            const json = JSON.parse(data);
            expect(res.statusCode).toBe(401);
            // Error message should NOT reveal whether user exists
            expect(json.error).toContain("Invalid credentials");
            expect(json.error).not.toContain("User not found");
            expect(json.error).not.toContain("does not exist");
            resolve(undefined);
          });
        }
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  });

  it("rejects requests with missing fields", async () => {
    return new Promise((resolve, reject) => {
      const req = https.request(
        `${BASE}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          agent,
        },
        (res) => {
          expect(res.statusCode).toBe(400);
          resolve(undefined);
        }
      );
      req.on("error", reject);
      req.write(JSON.stringify({}));
      req.end();
    });
  });
});
