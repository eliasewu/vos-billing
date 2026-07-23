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
