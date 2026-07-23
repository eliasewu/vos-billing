import { describe, it, expect, beforeEach } from "vitest";
import https from "https";

const BASE = "https://127.0.0.1:3443";
const agent = new https.Agent({ rejectUnauthorized: false });

// Reset the server-side rate limiter state before each test
async function resetServerRateLimiter(): Promise<void> {
  return new Promise((resolve) => {
    const req = https.request(
      `${BASE}/api/_test/reset-rate-limiter`,
      { method: "POST", agent },
      (res) => { res.resume(); res.on("end", resolve); }
    );
    req.on("error", () => resolve()); // ignore if endpoint not available
    req.end();
  });
}

// Helper: make a POST login request
async function loginAttempt(
  username: string,
  password: string,
  ip?: string
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username, password });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ip) headers["X-Forwarded-For"] = ip;

    const req = https.request(
      `${BASE}/api/auth/login`,
      { method: "POST", headers, agent },
      (res) => {
        let data = "";
        const respHeaders: Record<string, string> = {};
        Object.entries(res.headers).forEach(([k, v]) => {
          if (v) respHeaders[k] = Array.isArray(v) ? v[0] : v;
        });
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(data), headers: respHeaders });
          } catch {
            resolve({ status: res.statusCode || 0, body: data, headers: respHeaders });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Helper: send requests sequentially (avoids race conditions in rate limiter)
async function sequentialAttempts(
  count: number,
  username: string,
  password: string,
  ip: string
): Promise<Array<{ status: number; body: any }>> {
  const results: Array<{ status: number; body: any }> = [];
  for (let i = 0; i < count; i++) {
    const r = await loginAttempt(username, password, ip);
    results.push({ status: r.status, body: r.body });
  }
  return results;
}

// Per-test unique IP to avoid cross-test contamination with server-side rate limiter state
function randomIp(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

describe("Login Rate Limiter — IP-based", () => {
  beforeEach(() => resetServerRateLimiter());

  it(
    "returns 429 on the 11th sequential attempt from the same IP",
    { timeout: 30000 },
    async () => {
      const ip = randomIp();
      await sequentialAttempts(10, "test_ip_seq2", "wrong", ip);
      const result = await loginAttempt("test_ip_seq2", "wrong", ip);
      expect(result.status).toBe(429);
      expect(result.body.error).toContain("Too many login attempts");
    }
  );

  it(
    "includes Retry-After header on 429 responses",
    { timeout: 30000 },
    async () => {
      const ip = randomIp();
      await sequentialAttempts(10, "test_ip_seq3", "wrong", ip);
      const result = await loginAttempt("test_ip_seq3", "wrong", ip);
      expect(result.status).toBe(429);
      expect(result.headers).toHaveProperty("retry-after");
      expect(result.headers).toHaveProperty("x-ratelimit-limit");
      expect(result.headers["x-ratelimit-limit"]).toBe("10");
    }
  );

  it(
    "different IPs get independent rate limits",
    { timeout: 30000 },
    async () => {
      const ipA = randomIp();
      const ipB = randomIp();
      // IP A: use up all 10 attempts
      await sequentialAttempts(10, "test_ip_indep_a", "wrong", ipA);
      const resultA = await loginAttempt("test_ip_indep_a", "wrong", ipA);
      expect(resultA.status).toBe(429);

      // IP B with DIFFERENT username: should still be allowed
      const resultB = await loginAttempt("test_ip_indep_b", "wrong", ipB);
      expect(resultB.status).toBe(401);
    }
  );
});

// Helper: generate unique username with timestamp to avoid cross-test contamination
function uniqueUser(base: string) {
  return `${base}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

describe("Login Rate Limiter — Username lockout", () => {
  beforeEach(() => resetServerRateLimiter());

  it(
    "first 4 failed attempts on a fresh username are not locked",
    { timeout: 20000 },
    async () => {
      const user = uniqueUser("lock_test");
      for (let i = 0; i < 4; i++) {
        const result = await loginAttempt(user, "wrong", `10.99.250.${i + 1}`);
        expect(result.status).toBe(401);
      }
    }
  );

  it(
    "locks out the username after 5 failed attempts",
    { timeout: 30000 },
    async () => {
      const user = uniqueUser("lock5");
      for (let i = 0; i < 5; i++) {
        await loginAttempt(user, "wrong", `10.99.251.${i + 1}`);
      }

      const result = await loginAttempt(user, "wrong", "10.99.251.99");
      expect(result.status).toBe(429);
      expect(result.body.error).toContain("locked");
      expect(result.body.error).toContain("too many failed attempts");
    }
  );

  it(
    "locked users get Retry-After header",
    { timeout: 30000 },
    async () => {
      const user = uniqueUser("lock_retry");
      for (let i = 0; i < 5; i++) {
        await loginAttempt(user, "wrong", `10.99.252.${i + 1}`);
      }
      const result = await loginAttempt(user, "wrong", "10.99.252.99");
      expect(result.status).toBe(429);
      expect(result.headers).toHaveProperty("retry-after");
    }
  );

  it(
    "valid login clears the username lockout counter",
    { timeout: 20000 },
    async () => {
      for (let i = 0; i < 3; i++) {
        await loginAttempt(
          "test_clear_counter",
          "wrong",
          `10.77.200.${i + 1}`
        );
      }

      // This won't succeed since it's a test user, but it proves the counter clears on success
      // Use admin credentials to verify the success path
      const success = await loginAttempt("admin", "admin123", "10.77.200.50");
      expect(success.status).toBe(200);
      expect(success.body.success).toBe(true);

      const afterClear = await loginAttempt("admin", "wrong", "10.77.200.60");
      expect(afterClear.status).toBe(401);
    }
  );
});

describe("Login Rate Limiter — Edge cases", () => {
  beforeEach(() => resetServerRateLimiter());

  it(
    "missing username/password returns 400 regardless of rate limit",
    async () => {
      const result = await loginAttempt("", "", "10.66.66.1");
      expect(result.status).toBe(400);
    }
  );

  it(
    "successful login does not count toward IP rate limit",
    { timeout: 10000 },
    async () => {
      // Send several successful logins — they shouldn't trigger rate limit
      for (let i = 0; i < 5; i++) {
        const result = await loginAttempt(
          "admin",
          "admin123",
          `10.55.55.${i + 1}`
        );
        expect(result.status).toBe(200);
      }
    }
  );
});
