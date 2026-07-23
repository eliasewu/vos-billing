import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import * as fs from "fs";

interface CsvRow {
  country: string;
  operator: string;
  mcc: string;
  mnc: string;
  prefix: string;
  memo: string;
  actions: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const cleaned = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const lines = cleaned.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toUpperCase());
  const countryIdx = headers.indexOf("COUNTRY");
  const operatorIdx = headers.indexOf("OPERATOR");
  const mccIdx = headers.indexOf("MCC");
  const mncIdx = headers.indexOf("MNC");
  const prefixIdx = headers.indexOf("PREFIX");
  const memoIdx = headers.indexOf("MEMO");
  const actionsIdx = headers.indexOf("ACTIONS");

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: CsvRow = {
      country: countryIdx >= 0 ? (values[countryIdx] || "") : "",
      operator: operatorIdx >= 0 ? (values[operatorIdx] || "") : "",
      mcc: mccIdx >= 0 ? (values[mccIdx] || "") : "",
      mnc: mncIdx >= 0 ? (values[mncIdx] || "") : "",
      prefix: prefixIdx >= 0 ? (values[prefixIdx] || "") : "",
      memo: memoIdx >= 0 ? (values[memoIdx] || "") : "",
      actions: actionsIdx >= 0 ? (values[actionsIdx] || "") : "",
    };
    if (!row.country || !row.mcc) continue;
    if (row.country.startsWith("MCC-") || row.country === "International") continue;
    rows.push(row);
  }
  return rows;
}

/** Helper to send an SSE event through the stream controller */
function sse(controller: ReadableStreamDefaultController, data: unknown) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST() {
  const user = await verifySession();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const csvPath = "/root/SASSMCC.csv";
  try {
    fs.accessSync(csvPath, fs.constants.R_OK);
  } catch {
    return new Response(JSON.stringify({ error: `CSV file not found at ${csvPath}` }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // --- Setup phase ---
        sse(controller, { phase: "setup", message: "Preparing database tables..." });

        await executeVos(`CREATE TABLE IF NOT EXISTS e_mccmnc (
          id INT AUTO_INCREMENT PRIMARY KEY,
          country VARCHAR(100) NOT NULL,
          operator VARCHAR(150) NOT NULL DEFAULT '',
          mcc VARCHAR(10) NOT NULL DEFAULT '',
          mnc VARCHAR(10) NOT NULL DEFAULT '',
          INDEX idx_country (country),
          INDEX idx_mcc (mcc)
        )`);

        try {
          await executeVos(
            `DELETE n1 FROM e_mccmnc n1
             JOIN e_mccmnc n2 ON n1.mcc = n2.mcc AND n1.mnc = n2.mnc AND n1.operator = n2.operator
             WHERE n1.id > n2.id`
          );
        } catch { /* no duplicates */ }

        try {
          await executeVos("ALTER TABLE e_mccmnc ADD UNIQUE KEY uk_mcc_mnc_operator (mcc, mnc, operator)");
        } catch { /* already exists */ }

        await executeVos(`CREATE TABLE IF NOT EXISTS e_prefix (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mccmnc_id INT NOT NULL DEFAULT 0,
          prefix VARCHAR(50) NOT NULL DEFAULT '',
          country VARCHAR(100) NOT NULL DEFAULT '',
          operator VARCHAR(200) NOT NULL DEFAULT '',
          memo VARCHAR(500) NOT NULL DEFAULT '',
          INDEX idx_country (country),
          UNIQUE KEY uk_mccmnc_id (mccmnc_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8`);

        try {
          await executeVos("ALTER TABLE e_prefix ADD UNIQUE KEY uk_mccmnc_id (mccmnc_id)");
        } catch { /* already exists */ }

        sse(controller, { phase: "setup", message: "Parsing CSV file...", phaseDone: true });

        const rows = parseCSV(csvPath);
        sse(controller, { phase: "parse", totalRows: rows.length, message: `Parsed ${rows.length} rows`, phaseDone: true });

        // --- Phase 1: Batch upsert MCC/MNC ---
        const BATCH_SIZE = 100;
        let phase1Errors = 0;
        const totalBatches1 = Math.ceil(rows.length / BATCH_SIZE);

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const placeholders = batch.map(() => "(?, ?, ?, ?)").join(", ");
          const params: string[] = [];
          for (const row of batch) params.push(row.country, row.operator, row.mcc, row.mnc);

          try {
            await executeVos(
              `INSERT INTO e_mccmnc (country, operator, mcc, mnc) VALUES ${placeholders}
               ON DUPLICATE KEY UPDATE country = VALUES(country), operator = VALUES(operator)`,
              params
            );
          } catch {
            phase1Errors += batch.length;
          }

          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          sse(controller, {
            phase: "phase1",
            label: "Importing MCC/MNC operators",
            current: Math.min(i + BATCH_SIZE, rows.length),
            total: rows.length,
            batchNum,
            totalBatches: totalBatches1,
          });
        }

        // --- Phase 2: Load data ---
        sse(controller, { phase: "phase2", label: "Loading existing data...", message: "Querying database..." });

        const allMccmnc = await queryVos<any>("SELECT id, country, operator, mcc, mnc FROM e_mccmnc ORDER BY id");
        const existingPrefixMap = new Map<number, { prefix: string; memo: string }>();
        const allPrefixes = await queryVos<any>("SELECT mccmnc_id, prefix, memo FROM e_prefix");
        for (const p of allPrefixes) {
          existingPrefixMap.set(Number(p.mccmnc_id), { prefix: String(p.prefix || ""), memo: String(p.memo || "") });
        }

        const mccmncLookup = new Map<string, number>();
        for (const m of allMccmnc) {
          mccmncLookup.set(`${m.mcc}|${m.mnc}|${m.operator}`, Number(m.id));
        }

        sse(controller, {
          phase: "phase2",
          label: "Loaded database data",
          mccmncTotal: allMccmnc.length,
          existingPrefixes: allPrefixes.length,
          phaseDone: true,
        });

        // --- Phase 3: Build prefix batches ---
        sse(controller, { phase: "phase3-prep", label: "Building prefix batch...", message: "Comparing CSV with existing data..." });

        let prefixCreated = 0;
        let prefixUpdated = 0;
        let prefixSkipped = 0;
        const prefixBatch: { mccmncId: number; prefix: string; country: string; operator: string; memo: string; isNew: boolean }[] = [];

        for (const row of rows) {
          const key = `${row.mcc}|${row.mnc}|${row.operator}`;
          const mccmncId = mccmncLookup.get(key);
          if (!mccmncId) continue;

          const prefixValue = row.prefix || `${row.mcc}${row.mnc}`;
          const memo = row.memo ? `${row.memo} (from CSV)` : "Imported from SASSMCC.csv";

          const existing = existingPrefixMap.get(mccmncId);
          if (existing) {
            if (existing.prefix !== prefixValue || existing.memo !== memo) {
              prefixBatch.push({ mccmncId, prefix: prefixValue, country: row.country, operator: row.operator, memo, isNew: false });
            } else {
              prefixSkipped++;
            }
          } else {
            prefixBatch.push({ mccmncId, prefix: prefixValue, country: row.country, operator: row.operator, memo, isNew: true });
          }
        }

        sse(controller, {
          phase: "phase3-prep",
          label: "Prefix batch ready",
          toCreateOrUpdate: prefixBatch.length,
          skipped: prefixSkipped,
          phaseDone: true,
        });

        // --- Phase 3: Execute prefix upserts ---
        const totalBatches3 = Math.ceil(prefixBatch.length / BATCH_SIZE);
        const errors: string[] = [];

        for (let i = 0; i < prefixBatch.length; i += BATCH_SIZE) {
          const batch = prefixBatch.slice(i, i + BATCH_SIZE);
          try {
            const ph = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
            const p: (string | number)[] = [];
            for (const x of batch) p.push(x.mccmncId, x.prefix, x.country, x.operator, x.memo);
            await executeVos(
              `INSERT INTO e_prefix (mccmnc_id, prefix, country, operator, memo) VALUES ${ph}
               ON DUPLICATE KEY UPDATE prefix = VALUES(prefix), memo = VALUES(memo), country = VALUES(country), operator = VALUES(operator)`,
              p
            );
            for (const x of batch) {
              if (x.isNew) prefixCreated++;
              else prefixUpdated++;
            }
          } catch (err) {
            errors.push(err instanceof Error ? err.message : "Failed");
          }

          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          sse(controller, {
            phase: "phase3",
            label: "Importing prefixes",
            current: Math.min(i + BATCH_SIZE, prefixBatch.length),
            total: prefixBatch.length,
            batchNum,
            totalBatches: totalBatches3,
            created: prefixCreated,
            updated: prefixUpdated,
          });
        }

        // --- Final result ---
        sse(controller, {
          done: true,
          total: rows.length,
          mccmncTotal: allMccmnc.length,
          prefixCreated,
          prefixUpdated,
          prefixSkipped,
          phase1Errors,
          errors: errors.slice(0, 20),
        });

        controller.close();
      } catch (error) {
        sse(controller, {
          error: error instanceof Error ? error.message : "CSV import failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
