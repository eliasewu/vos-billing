// Standalone CSV import script. Run with: npx tsx src/scripts/import-sassmcc.ts
import mysql from "mysql2/promise";
import * as fs from "fs";

// ---- CSV Parser (same as API route) ----

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

// ---- Main ----

const DB_CONFIG = {
  host: process.env.VOS_DB_HOST || "127.0.0.1",
  port: parseInt(process.env.VOS_DB_PORT || "3306"),
  user: process.env.VOS_DB_USER || "root",
  password: process.env.VOS_DB_PASSWORD || "",
  database: process.env.VOS_DB_NAME || "vos3000",
};

async function main() {
  console.log("🔌 Connecting to MySQL...");
  const pool = mysql.createPool(DB_CONFIG);

  try {
    const [version] = await pool.execute("SELECT VERSION() as v") as any;
    console.log(`✅ Connected. MySQL v${version[0].v}`);

    // Read CSV
    const csvPath = "/root/SASSMCC.csv";
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found: ${csvPath}`);
      process.exit(1);
    }
    const rows = parseCSV(csvPath);
    console.log(`📄 Parsed ${rows.length} rows from CSV`);

    // Ensure tables
    await pool.execute(`CREATE TABLE IF NOT EXISTS e_mccmnc (
      id INT AUTO_INCREMENT PRIMARY KEY,
      country VARCHAR(100) NOT NULL,
      operator VARCHAR(150) NOT NULL DEFAULT '',
      mcc VARCHAR(10) NOT NULL DEFAULT '',
      mnc VARCHAR(10) NOT NULL DEFAULT '',
      INDEX idx_country (country),
      INDEX idx_mcc (mcc)
    )`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS e_prefix (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mccmnc_id INT NOT NULL DEFAULT 0,
      prefix VARCHAR(50) NOT NULL DEFAULT '',
      country VARCHAR(100) NOT NULL DEFAULT '',
      operator VARCHAR(200) NOT NULL DEFAULT '',
      memo VARCHAR(500) NOT NULL DEFAULT '',
      INDEX idx_country (country),
      UNIQUE KEY uk_mccmnc_id (mccmnc_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8`);

    // Remove duplicates before adding unique constraint
    try {
      const [dupResult] = await pool.execute(
        `DELETE n1 FROM e_mccmnc n1
         JOIN e_mccmnc n2 ON n1.mcc = n2.mcc AND n1.mnc = n2.mnc AND n1.operator = n2.operator
         WHERE n1.id > n2.id`
      ) as any;
      if (dupResult.affectedRows > 0) console.log(`🧹 Removed ${dupResult.affectedRows} duplicate MCC/MNC rows`);
    } catch { /* no duplicates */ }

    try {
      await pool.execute("ALTER TABLE e_mccmnc ADD UNIQUE KEY uk_mcc_mnc_operator (mcc, mnc, operator)");
    } catch { /* already exists */ }

    try {
      await pool.execute("ALTER TABLE e_prefix ADD UNIQUE KEY uk_mccmnc_id (mccmnc_id)");
    } catch { /* already exists */ }

    // Phase 1: Batch upsert MCC/MNC
    console.log("📥 Phase 1: Importing MCC/MNC entries...");
    const BATCH = 100;
    let phase1Errors = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const placeholders = batch.map(() => "(?, ?, ?, ?)").join(", ");
      const params: string[] = [];
      for (const r of batch) params.push(r.country, r.operator, r.mcc, r.mnc);
      try {
        await pool.execute(
          `INSERT INTO e_mccmnc (country, operator, mcc, mnc) VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE country = VALUES(country), operator = VALUES(operator)`,
          params
        );
      } catch {
        phase1Errors += batch.length;
      }
      if ((i / BATCH) % 5 === 0 || i + BATCH >= rows.length) {
        process.stdout.write(`\r   Batch ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
      }
    }
    console.log(`\n   Done. Errors: ${phase1Errors}`);

    // Phase 2: Load all in bulk
    console.log("📥 Phase 2: Loading existing data...");
    const [allMccmnc] = await pool.execute("SELECT id, mcc, mnc, operator FROM e_mccmnc") as any;
    const [allPrefixes] = await pool.execute("SELECT mccmnc_id, prefix, memo FROM e_prefix") as any;

    const existingPrefixMap = new Map<number, { prefix: string; memo: string }>();
    for (const p of allPrefixes) {
      existingPrefixMap.set(Number(p.mccmnc_id), { prefix: String(p.prefix || ""), memo: String(p.memo || "") });
    }

    const mccmncLookup = new Map<string, number>();
    for (const m of allMccmnc) {
      mccmncLookup.set(`${m.mcc}|${m.mnc}|${m.operator}`, Number(m.id));
    }

    // Phase 3: Build prefix batches
    console.log("📥 Phase 3: Importing prefixes...");
    let prefixCreated = 0, prefixUpdated = 0, prefixSkipped = 0;
    const prefixBatch: any[] = [];
    for (const row of rows) {
      const key = `${row.mcc}|${row.mnc}|${row.operator}`;
      const mId = mccmncLookup.get(key);
      if (!mId) continue;
      const prefixValue = row.prefix || `${row.mcc}${row.mnc}`;
      const memo = row.memo ? `${row.memo} (from SASSMCC.csv)` : "Imported from SASSMCC.csv";
      const existing = existingPrefixMap.get(mId);
      if (existing) {
        if (existing.prefix !== prefixValue || existing.memo !== memo) {
          prefixBatch.push({ mccmncId: mId, prefix: prefixValue, country: row.country, operator: row.operator, memo, isNew: false });
        } else {
          prefixSkipped++;
        }
      } else {
        prefixBatch.push({ mccmncId: mId, prefix: prefixValue, country: row.country, operator: row.operator, memo, isNew: true });
      }
    }

    const prefixErrors: string[] = [];
    for (let i = 0; i < prefixBatch.length; i += BATCH) {
      const batch = prefixBatch.slice(i, i + BATCH);
      try {
        const ph = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
        const p: any[] = [];
        for (const x of batch) p.push(x.mccmncId, x.prefix, x.country, x.operator, x.memo);
        await pool.execute(
          `INSERT INTO e_prefix (mccmnc_id, prefix, country, operator, memo) VALUES ${ph}
           ON DUPLICATE KEY UPDATE prefix = VALUES(prefix), memo = VALUES(memo), country = VALUES(country), operator = VALUES(operator)`,
          p
        );
        for (const x of batch) {
          if (x.isNew) prefixCreated++;
          else prefixUpdated++;
        }
      } catch (err: any) {
        prefixErrors.push(err.message);
      }
      if ((i / BATCH) % 5 === 0 || i + BATCH >= prefixBatch.length) {
        process.stdout.write(`\r   Batch ${Math.min(i + BATCH, prefixBatch.length)}/${prefixBatch.length}`);
      }
    }

    console.log("\n");
    console.log("═══════════════════════════════════");
    console.log("   📊 IMPORT RESULTS");
    console.log("═══════════════════════════════════");
    console.log(`   CSV rows:        ${rows.length}`);
    console.log(`   MCC/MNC total:   ${allMccmnc.length}`);
    console.log(`   Prefix created:  ${prefixCreated}`);
    console.log(`   Prefix updated:  ${prefixUpdated}`);
    console.log(`   Prefix skipped:  ${prefixSkipped}`);
    console.log(`   Phase 1 errors:  ${phase1Errors}`);
    console.log(`   Prefix errors:   ${prefixErrors.length}`);
    if (prefixErrors.length > 0) {
      console.log(`   First errors:    ${prefixErrors.slice(0, 3).join(", ")}`);
    }
    console.log("═══════════════════════════════════");
    console.log("\n✅ Import complete!");
  } catch (err: any) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
