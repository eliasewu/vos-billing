// Import area prefixes from /root/Areaname.csv into VOS3000 e_areacode
// Run with: npx tsx src/scripts/import-areaname-csv.ts

import fs from "fs";
import mysql from "mysql2/promise";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim()); // last field (may be empty)
  return result;
}

async function main() {
  const pool = mysql.createPool({
    host: process.env.VOS_DB_HOST || "127.0.0.1",
    port: parseInt(process.env.VOS_DB_PORT || "3306"),
    user: process.env.VOS_DB_USER || "root",
    password: process.env.VOS_DB_PASSWORD || "",
    database: process.env.VOS_DB_NAME || "vos3000",
    waitForConnections: true,
    connectionLimit: 5,
  });

  console.log("📖 Reading /root/Areaname.csv...");
  const content = fs.readFileSync("/root/Areaname.csv", "utf8");
  const lines = content.split("\n").filter(l => l.trim());
  console.log(`   ${lines.length} total lines`);

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.trim());
  console.log(`📋 Columns: ${header.join(" | ")}`);

  const areaNameIdx = header.findIndex(h => h.toLowerCase().includes("area name"));
  const areaPrefixIdx = header.findIndex(h => h.toLowerCase().includes("area prefix"));
  const initBillingIdx = header.findIndex(h => h.toLowerCase().includes("initial billing"));
  const incrBillingIdx = header.findIndex(h => h.toLowerCase().includes("incremental billing"));

  if (areaNameIdx === -1 || areaPrefixIdx === -1) {
    console.error("❌ Required columns not found. Need 'Area name' and 'Area Prefix'.");
    await pool.end();
    process.exit(1);
  }

  // Extract unique area prefix → {name, initialBilling, incrementalBilling} mappings
  // Strategy: prefer longer names for the same prefix (more specific, e.g., operator name)
  const areaMap = new Map<string, { name: string; initBill: number; incrBill: number }>();
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const prefix = fields[areaPrefixIdx] || "";
    const name = fields[areaNameIdx] || "";
    const initBill = parseFloat(fields[initBillingIdx] || "1") || 1;
    const incrBill = parseFloat(fields[incrBillingIdx] || "1") || 1;
    if (prefix && name) {
      const existing = areaMap.get(prefix);
      if (!existing || name.length > existing.name.length) {
        areaMap.set(prefix, { name, initBill, incrBill });
      }
    }
  }

  console.log(`🔍 Found ${areaMap.size} unique area prefixes from ${lines.length - 1} data rows`);

  // Show samples
  const samples = [...areaMap.entries()].slice(0, 15);
  console.log("📋 Sample entries:");
  samples.forEach(([code, v]) => console.log(`  ${code} → ${v.name} (init: ${v.initBill}, incr: ${v.incrBill})`));

  // Import into e_areacode
  console.log("\n💾 Importing into e_areacode...");
  let imported = 0;
  let updated = 0;
  let failed = 0;
  const batchSize = 500;
  const entries = [...areaMap.entries()];

  const conn = await pool.getConnection();
  try {
    for (let batch = 0; batch < entries.length; batch += batchSize) {
      const chunk = entries.slice(batch, batch + batchSize);
      // Build batch INSERT ... ON DUPLICATE KEY UPDATE
      const values: string[] = [];
      const params: string[] = [];
      for (const [areacode, v] of chunk) {
        values.push("(?, ?, ?, ?)");
        params.push(areacode, v.name, String(v.initBill), String(v.incrBill));
      }
      try {
        const sql = `INSERT INTO e_areacode (areacode, location, initial_billing, incremental_billing) VALUES ${values.join(", ")} ON DUPLICATE KEY UPDATE location = VALUES(location), initial_billing = VALUES(initial_billing), incremental_billing = VALUES(incremental_billing)`;
        const [result] = await conn.execute(sql, params) as any;
        // affectedRows: 1 per new insert, 2 per update (in MySQL)
        const affected = result.affectedRows || 0;
        const infoMsg = result.info || "";
        // Count: "Records: N  Duplicates: M  Warnings: W"
        const recordsMatch = infoMsg.match(/Records:\s*(\d+)/);
        const dupMatch = infoMsg.match(/Duplicates:\s*(\d+)/);
        if (recordsMatch) {
          const records = parseInt(recordsMatch[1]);
          const duplicates = dupMatch ? parseInt(dupMatch[1]) : 0;
          imported += records - duplicates;
          updated += duplicates;
        } else {
          imported += affected;
        }

        const pct = Math.round((batch + chunk.length) / entries.length * 100);
        if (batch % (batchSize * 10) === 0 || batch + chunk.length >= entries.length) {
          console.log(`   ${pct}% — ${imported + updated} processed (${imported} new, ${updated} updated)`);
        }
      } catch (err: any) {
        failed += chunk.length;
        if (failed <= chunk.length) console.error(`  ❌ Batch failed: ${err.message}`);
      }
    }
  } finally {
    conn.release();
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   ${imported} new area codes inserted`);
  console.log(`   ${updated} existing area codes updated`);
  if (failed > 0) console.log(`   ${failed} failed`);

  // Verify
  const [rows] = await pool.execute("SELECT COUNT(*) AS cnt FROM e_areacode") as any;
  console.log(`   Total rows in e_areacode: ${rows[0].cnt}`);

  await pool.end();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
