import * as XLSX from "xlsx";
import mysql from "mysql2/promise";
import fs from "fs";

interface AreaRow {
  areaCode: string;
  countryName: string;
  areaName: string;
}

async function main() {
  // Read VOS DB config
  const conf = fs.readFileSync(
    "/home/kunshiweb/base/apache-tomcat/conf/webserver_parameter.conf",
    "utf8"
  );
  const host = "127.0.0.1";
  const user = (conf.match(/VOS_DB_USER=(.*)/) || [])[1] || "root";
  const pass = (conf.match(/VOS_DB_PASS=(.*)/) || [])[1] || "";
  const db = (conf.match(/VOS_DB_NAME=(.*)/) || [])[1] || "vos3000";

  console.log(`Connecting to ${db}@${host}...`);
  const conn = await mysql.createConnection({ host, user, password: pass, database: db });

  // Read XLSX
  console.log("Reading XLSX file...");
  const wb = XLSX.readFile("/root/Area_Code_Mapping_Update.xlsx");
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Parse rows (skip header row 0)
  const areas: AreaRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    const areaCode = String(row[1] || "").trim();
    const countryName = String(row[2] || "").trim();
    const areaName = String(row[3] || "").trim();
    if (areaCode && areaName) {
      areas.push({ areaCode, countryName, areaName });
    }
  }

  console.log(`Parsed ${areas.length} area entries from XLSX`);

  // Batch update
  let updated = 0;
  let notFound = 0;
  let unchanged = 0;
  const batchSize = 500;

  for (let i = 0; i < areas.length; i += batchSize) {
    const batch = areas.slice(i, i + batchSize);

    // Build CASE WHEN statement for bulk update
    const codes = batch.map(a => a.areaCode);
    const placeholders = codes.map(() => "?").join(",");

    // First, find which codes exist
    const [existing] = await conn.query<any[]>(
      `SELECT areacode FROM e_areacode WHERE areacode IN (${placeholders})`,
      codes
    );
    const existingCodes = new Set(existing.map((r: any) => String(r.areacode)));

    // Update each matching row
    for (const area of batch) {
      if (!existingCodes.has(area.areaCode)) {
        notFound++;
        continue;
      }

      // Build location as "CountryName - AreaName" if they differ, otherwise just area name
      const location =
        area.countryName && area.areaName !== area.countryName
          ? `${area.countryName} - ${area.areaName}`
          : area.areaName;

      await conn.query(
        "UPDATE e_areacode SET location = ? WHERE areacode = ?",
        [location, area.areaCode]
      );
      updated++;
    }

    if (i % 10000 === 0) {
      console.log(`Progress: ${i}/${areas.length} (${updated} updated, ${notFound} not found)`);
    }
  }

  console.log("");
  console.log("=== Import Complete ===");
  console.log(`Updated: ${updated}`);
  console.log(`Not found in DB: ${notFound}`);
  console.log(`Total XLSX rows: ${areas.length}`);

  // Show sample
  console.log("");
  console.log("=== Sample Updated Rows ===");
  const [samples] = await conn.query<any[]>(
    `SELECT areacode, location FROM e_areacode WHERE location LIKE '%Afghanistan%' LIMIT 5`
  );
  samples.forEach((r: any) => console.log(`${r.areacode} → ${r.location}`));

  await conn.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
