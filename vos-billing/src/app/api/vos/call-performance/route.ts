import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

function datePartition(d: Date): string {
  return (
    "e_cdr_" +
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}

function lastNDays(n: number): string[] {
  const partitions: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    partitions.push(datePartition(d));
  }
  return partitions;
}

export async function GET(_request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const days = 14; // 2-week window
    const partitions = lastNDays(days);

    // Check which partitions actually exist
    const existingTables: string[] = [];
    for (const tbl of partitions) {
      try {
        await queryVos(`SELECT 1 FROM ${tbl} LIMIT 1`);
        existingTables.push(tbl);
      } catch {
        continue;
      }
    }

    // If no CDR partitions, try generic CDR table
    const useTables =
      existingTables.length > 0
        ? existingTables
        : await tryGenericCdrTable();

    const tables = useTables.length > 0 ? useTables : [];

    // Total stats across all tables
    let totalCalls = 0;
    let successCalls = 0;
    let failedCalls = 0;
    let totalDuration = 0;
    let oldestTime = Date.now() / 1000;
    let newestTime = 0;

    for (const tbl of tables) {
      try {
        const [row] = (await queryVos<any>(
          `SELECT 
            COUNT(*) AS cnt,
            SUM(CASE WHEN callstatus = 1 OR callstatus = 'answered' OR endreason IS NULL OR endreason = 0 OR endreason = '' THEN 1 ELSE 0 END) AS success,
            SUM(CASE WHEN NOT (callstatus = 1 OR callstatus = 'answered' OR endreason IS NULL OR endreason = 0 OR endreason = '') THEN 1 ELSE 0 END) AS fail,
            COALESCE(SUM(callduration), 0) AS dur,
            COALESCE(MIN(begintime), UNIX_TIMESTAMP()) AS min_time,
            COALESCE(MAX(begintime), 0) AS max_time
          FROM ${tbl}`
        )) as any[];
        totalCalls += Number(row?.cnt || 0);
        successCalls += Number(row?.success || 0);
        failedCalls += Number(row?.fail || 0);
        totalDuration += Number(row?.dur || 0);
        if (row?.min_time && row.min_time < oldestTime) oldestTime = row.min_time;
        if (row?.max_time && row.max_time > newestTime) newestTime = row.max_time;
      } catch {
        continue;
      }
    }

    const periodSeconds =
      tables.length > 0 && newestTime > oldestTime
        ? newestTime - oldestTime
        : days * 86400;

    const cps = periodSeconds > 0 ? parseFloat((totalCalls / periodSeconds).toFixed(2)) : 0;
    const avgDuration =
      totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    const concurrent =
      periodSeconds > 0 && avgDuration > 0
        ? Math.round((totalCalls * avgDuration) / periodSeconds)
        : 0;
    const asr =
      totalCalls > 0
        ? parseFloat(((successCalls / totalCalls) * 100).toFixed(1))
        : 0;

    // Daily breakdown
    const daily: Array<{
      date: string;
      calls: number;
      success: number;
      duration: number;
      asr: number;
    }> = [];

    for (const tbl of tables) {
      try {
        const [row] = (await queryVos<any>(
          `SELECT 
            COUNT(*) AS cnt,
            SUM(CASE WHEN callstatus = 1 OR callstatus = 'answered' OR endreason IS NULL OR endreason = 0 OR endreason = '' THEN 1 ELSE 0 END) AS success,
            COALESCE(SUM(callduration), 0) AS dur
          FROM ${tbl}`
        )) as any[];
        const dateStr = tbl.slice(-8); // YYYYMMDD
        const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        const calls = Number(row?.cnt || 0);
        const success = Number(row?.success || 0);
        daily.push({
          date,
          calls,
          success,
          duration: Number(row?.dur || 0),
          asr: calls > 0 ? parseFloat(((success / calls) * 100).toFixed(1)) : 0,
        });
      } catch {
        continue;
      }
    }
    daily.reverse(); // oldest → newest

    // Hourly breakdown (last 24 hours only, from first available table)
    const hourly: Array<{ hour: number; calls: number; success: number; asr: number }> = [];
    if (tables.length > 0) {
      const latestTable = tables[0]; // newest partition (tables built newest-first)
      for (let h = 0; h < 24; h++) {
        try {
          const [row] = (await queryVos<any>(
            `SELECT 
              COUNT(*) AS cnt,
              SUM(CASE WHEN callstatus = 1 OR callstatus = 'answered' OR endreason IS NULL OR endreason = 0 OR endreason = '' THEN 1 ELSE 0 END) AS success
            FROM ${latestTable}
            WHERE HOUR(FROM_UNIXTIME(begintime)) = ${h}`
          )) as any[];
          const calls = Number(row?.cnt || 0);
          const success = Number(row?.success || 0);
          hourly.push({
            hour: h,
            calls,
            success,
            asr: calls > 0 ? parseFloat(((success / calls) * 100).toFixed(1)) : 0,
          });
        } catch {
          hourly.push({ hour: h, calls: 0, success: 0, asr: 0 });
        }
      }
    }

    // Peak hour
    const peakHour =
      hourly.length > 0
        ? hourly.reduce((max, h) => (h.calls > max.calls ? h : max), hourly[0])
        : null;

    // Fail reasons breakdown
    const failReasons: Array<{ reason: string; count: number }> = [];
    if (tables.length > 0 && failedCalls > 0) {
      for (const tbl of tables.slice(0, 3)) {
        try {
          const rows = (await queryVos<any>(
            `SELECT endreason, COUNT(*) AS cnt FROM ${tbl}
             WHERE NOT (callstatus = 1 OR callstatus = 'answered' OR endreason IS NULL OR endreason = 0 OR endreason = '')
             GROUP BY endreason ORDER BY cnt DESC LIMIT 8`
          )) as any[];
          for (const r of rows) {
            const reason = String(r.endreason || "Unknown");
            const count = Number(r.cnt || 0);
            const existing = failReasons.find((f) => f.reason === reason);
            if (existing) existing.count += count;
            else failReasons.push({ reason, count });
          }
        } catch {
          continue;
        }
      }
      failReasons.sort((a, b) => b.count - a.count);
    }

    // SCD (Success Call Distribution) - duration buckets for successful calls
    const scd: Array<{ label: string; count: number; percentage: number }> = [
      { label: "0-10s", count: 0, percentage: 0 },
      { label: "11-30s", count: 0, percentage: 0 },
      { label: "31-60s", count: 0, percentage: 0 },
      { label: "1-2m", count: 0, percentage: 0 },
      { label: "2-5m", count: 0, percentage: 0 },
      { label: "5-10m", count: 0, percentage: 0 },
      { label: "10m+", count: 0, percentage: 0 },
    ];
    if (tables.length > 0 && successCalls > 0) {
      for (const tbl of tables.slice(0, 3)) {
        try {
          const [row] = (await queryVos<any>(
            `SELECT
              SUM(CASE WHEN callduration BETWEEN 0 AND 10 THEN 1 ELSE 0 END) AS v0,
              SUM(CASE WHEN callduration BETWEEN 11 AND 30 THEN 1 ELSE 0 END) AS v1,
              SUM(CASE WHEN callduration BETWEEN 31 AND 60 THEN 1 ELSE 0 END) AS v2,
              SUM(CASE WHEN callduration BETWEEN 61 AND 120 THEN 1 ELSE 0 END) AS v3,
              SUM(CASE WHEN callduration BETWEEN 121 AND 300 THEN 1 ELSE 0 END) AS v4,
              SUM(CASE WHEN callduration BETWEEN 301 AND 600 THEN 1 ELSE 0 END) AS v5,
              SUM(CASE WHEN callduration >= 601 THEN 1 ELSE 0 END) AS v6
            FROM ${tbl}
            WHERE (callstatus = 1 OR callstatus = 'answered' OR endreason IS NULL OR endreason = 0 OR endreason = '')`
          )) as any[];
          if (row) {
            scd[0].count += Number(row.v0 || 0);
            scd[1].count += Number(row.v1 || 0);
            scd[2].count += Number(row.v2 || 0);
            scd[3].count += Number(row.v3 || 0);
            scd[4].count += Number(row.v4 || 0);
            scd[5].count += Number(row.v5 || 0);
            scd[6].count += Number(row.v6 || 0);
          }
        } catch { continue; }
      }
      for (const b of scd) {
        b.percentage = successCalls > 0 ? parseFloat(((b.count / successCalls) * 100).toFixed(1)) : 0;
      }
    }

    // Total minutes breakdown
    const totalMinutes = Math.round(totalDuration / 60);

    return NextResponse.json({
      summary: {
        totalCalls,
        successCalls,
        failedCalls,
        totalDuration,
        avgDuration,
        asr,
        cps,
        concurrent,
        periodDays: tables.length || 0,
        periodSeconds,
      },
      daily,
      hourly,
      peakHour,
      scd,
      failReasons: failReasons.slice(0, 8),
      tables: tables.length,
      totalMinutes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function tryGenericCdrTable(): Promise<string[]> {
  const fallbacks = ["e_cdr", "cdr", "e_call", "call_history", "e_cdr_all"];
  for (const tbl of fallbacks) {
    try {
      await queryVos(`SELECT 1 FROM ${tbl} LIMIT 1`);
      return [tbl];
    } catch {
      continue;
    }
  }
  return [];
}
