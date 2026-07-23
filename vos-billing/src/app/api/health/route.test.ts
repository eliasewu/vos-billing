import { describe, it, expect } from "vitest";
import https from "https";

const BASE = "https://127.0.0.1:3443";
const agent = new https.Agent({ rejectUnauthorized: false });

interface HealthResponse {
  status: string;
  timestamp: string;
  database: {
    connected: boolean;
    version: string | null;
    error: string | null;
  };
  uptime: number;
}

// Helper: GET the health endpoint
async function getHealth(): Promise<{
  status: number;
  body: HealthResponse;
  headers: Record<string, string>;
}> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `${BASE}/api/health`,
      { method: "GET", agent },
      (res) => {
        let data = "";
        const respHeaders: Record<string, string> = {};
        Object.entries(res.headers).forEach(([k, v]) => {
          if (v) respHeaders[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
        });
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 0,
              body: JSON.parse(data),
              headers: respHeaders,
            });
          } catch {
            resolve({
              status: res.statusCode || 0,
              body: { status: "error", timestamp: "", database: { connected: false, version: null, error: "Parse failed" }, uptime: 0 },
              headers: respHeaders,
            });
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

describe("Health Endpoint — /api/health", () => {
  it("returns HTTP 200 when the database is reachable", { timeout: 10000 }, async () => {
    const result = await getHealth();
    expect(result.status).toBe(200);
  });

  it("returns correct response shape with status 'healthy'", { timeout: 10000 }, async () => {
    const result = await getHealth();
    expect(result.body.status).toBe("healthy");
  });

  it("returns database.connected = true", { timeout: 10000 }, async () => {
    const result = await getHealth();
    expect(result.body.database.connected).toBe(true);
  });

  it("returns a non-empty database version string", { timeout: 10000 }, async () => {
    const result = await getHealth();
    expect(result.body.database.version).toBeTruthy();
    expect(typeof result.body.database.version).toBe("string");
  });

  it("returns database.error = null when healthy", { timeout: 10000 }, async () => {
    const result = await getHealth();
    expect(result.body.database.error).toBeNull();
  });

  it("returns a positive uptime in seconds", { timeout: 10000 }, async () => {
    const result = await getHealth();
    expect(result.body.uptime).toBeGreaterThan(0);
    expect(typeof result.body.uptime).toBe("number");
  });

  it("returns a valid ISO-8601 timestamp", { timeout: 10000 }, async () => {
    const result = await getHealth();
    const parsed = new Date(result.body.timestamp);
    expect(parsed.getTime()).toBeGreaterThan(0);
    expect(parsed.toISOString()).toBe(result.body.timestamp);
  });

  it("returns Content-Type application/json", { timeout: 10000 }, async () => {
    const result = await getHealth();
    expect(result.headers["content-type"]).toContain("application/json");
  });
});
