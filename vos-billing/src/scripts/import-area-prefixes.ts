// Import area prefixes from Excel into VOS3000 e_areacode
// Run with: npx tsx src/scripts/import-area-prefixes.ts

import * as XLSX from "xlsx";
import mysql from "mysql2/promise";

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

  console.log("📖 Reading /root/a2z.xlsx...");
  const wb = XLSX.readFile("/root/a2z.xlsx");
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

  // Find column indices from header
  const header = data[0];
  const areaPrefixIdx = header.findIndex((h: string) => h && h.toString().toLowerCase().includes("area prefix"));
  const areaNameIdx = header.findIndex((h: string) => h && h.toString().toLowerCase().includes("area name"));

  if (areaPrefixIdx === -1 || areaNameIdx === -1) {
    console.error("❌ Could not find 'Area prefix' or 'Area name' columns in header:", header);
    await pool.end();
    process.exit(1);
  }

  console.log(`📋 Found columns: "${header[areaPrefixIdx]}" at index ${areaPrefixIdx}, "${header[areaNameIdx]}" at index ${areaNameIdx}`);

  // Extract unique area prefix → area name mappings
  const areaMap = new Map<string, string>();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const prefix = String(row[areaPrefixIdx] || "").trim();
    const name = String(row[areaNameIdx] || "").trim();
    if (prefix && name) {
      // Keep the first name encountered (or longest name could be better)
      const existing = areaMap.get(prefix);
      if (!existing || name.length > existing.length) {
        areaMap.set(prefix, name);
      }
    }
  }

  console.log(`🔍 Found ${areaMap.size} unique area prefixes from ${data.length - 1} rows`);

  // Show some samples
  const samples = [...areaMap.entries()].slice(0, 10);
  console.log("📋 Sample entries:");
  samples.forEach(([code, name]) => console.log(`  ${code} → ${name}`));

  // Import into e_areacode
  console.log("\n💾 Importing into e_areacode...");
  let imported = 0;
  let updated = 0;
  let failed = 0;

  const conn = await pool.getConnection();
  try {
    for (const [areacode, location] of areaMap) {
      try {
        const [result] = await conn.execute(
          `INSERT INTO e_areacode (areacode, location) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE location = VALUES(location)`,
          [areacode, location]
        ) as any;
        if (result.affectedRows === 1) imported++;
        else if (result.affectedRows === 2) updated++;
      } catch {
        failed++;
        if (failed <= 5) console.error(`  ❌ Failed: ${areacode} → ${location}`);
      }
    }
  } finally {
    conn.release();
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   ${imported} new area codes inserted`);
  console.log(`   ${updated} existing area codes updated`);
  if (failed > 0) console.log(`   ${failed} failed`);

  await pool.end();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
