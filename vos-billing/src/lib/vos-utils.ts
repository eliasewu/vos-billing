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

/** Generate a CDR partition table name for a given date */
export function cdrPartition(d: Date): string {
  return "e_cdr_" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}

/** Generate CDR partition names for the last N days (excluding today since partitions lag 1 day) */
export function cdrPartitionsForLastNDays(n: number): string[] {
  const parts: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    parts.push(cdrPartition(d));
  }
  return parts;
}

/** Probe partition tables to find which ones actually exist */
export async function findExistingCdrPartitions(
  queryVos: (sql: string) => Promise<any>,
  partitions: string[]
): Promise<string[]> {
  const existing: string[] = [];
  for (const tbl of partitions) {
    try {
      await queryVos(`SELECT 1 FROM ${tbl} LIMIT 1`);
      existing.push(tbl);
    } catch { continue; }
  }
  return existing;
}
