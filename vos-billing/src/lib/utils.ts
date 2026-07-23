/**
 * Deep-recursive sanitizer that strips Buffer-like objects ({type:"Buffer",data:[...]})
 * from any JSON value BEFORE serialization. Prevents React error #31.
 * mysql2 may return Buffer objects that slip past vos-db's sanitizeRow().
 */
export function deepSanitize(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
  if (Buffer.isBuffer(val)) return Array.from(val as Buffer).map(b => String.fromCharCode(b)).join("");
  if (Array.isArray(val)) return val.map(deepSanitize);
  if (typeof val === "object") {
    // Detect {type:"Buffer", data:[...]} shape and convert to string
    const obj = val as Record<string, unknown>;
    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
      try {
        return String.fromCharCode(...(obj.data as number[]));
      } catch {
        return Buffer.from(obj.data as number[]).toString("utf-8");
      }
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deepSanitize(v);
    }
    return out;
  }
  return val;
}

/**
 * Safely extract an error string from an API response error field.
 * Prevents React error #31: "Objects are not valid as a React child"
 * when an API returns error as an object like {type, data} instead of a string.
 */
export function safeErrorString(err: unknown, fallback = "An error occurred"): string {
  if (typeof err === "string") return err;
  if (!err || typeof err !== "object") return fallback;
  const e = err as Record<string, unknown>;
  // Common API error shapes: {type, data}, {type, message}, {message}, {error}
  if (typeof e.data === "string") return e.data;
  if (typeof e.message === "string") return e.message;
  if (typeof e.error === "string") return e.error;
  if (typeof e.type === "string" && Object.keys(e).length <= 2) {
    // Bare {type, data} with non-string data — stringify the data
    try { return JSON.stringify(e); } catch { return fallback; }
  }
  try {
    return typeof err === "object" ? JSON.stringify(err) : String(err);
  } catch {
    return fallback;
  }
}
