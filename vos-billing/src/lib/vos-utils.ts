/** Map VOS3000 endreason codes to frontend status labels */
export function mapEndreason(code: string | null): string {
  if (!code) return "unknown";
  const c = code.trim().toUpperCase();
  if (c === "200" || c === "NORMAL_CLEARING" || c === "ANSWER" || c === "ANSWERED") return "answered";
  if (c === "486" || c === "BUSY" || c === "USER_BUSY") return "busy";
  if (c === "408" || c === "NO_ANSWER" || c === "NOANSWER" || c === "REQUEST_TIMEOUT") return "no_answer";
  if (c === "487" || c === "CANCEL" || c === "CANCELLED" || c === "REQUEST_TERMINATED") return "cancelled";
  return "failed";
}
