// Update prefix database with real-world phone number prefixes
// Run: npx tsx src/scripts/update-real-prefixes.ts
import mysql from "mysql2/promise";

const p = mysql.createPool({
  host: process.env.VOS_DB_HOST || "127.0.0.1",
  user: process.env.VOS_DB_USER || "root",
  password: process.env.VOS_DB_PASSWORD || "",
  database: process.env.VOS_DB_NAME || "vos3000",
});

const PREFIX_MAP: Record<string, Record<string, string>> = {
  // ========== BANGLADESH ==========
  Bangladesh: {
    "Grameenphone": "88017",
    "GrameenPhone": "88017",
    "Robi": "88018",
    "Robi/Aktel": "88018",
    "Banglalink": "88019",
    "Orascom/Banglalink": "88019",
    "Teletalk": "88015",
    "TeleTalk": "88015",
    "Airtel/Warid": "88016",
    "Citycell": "88011",
  },

  // ========== INDIA ==========
  India: {
    "Airtel": "9198",
    "Vodafone Idea (Vi)": "9198",
    "Reliance Jio": "9170",
    "BSNL": "9194",
  },

  // ========== PAKISTAN ==========
  Pakistan: {
    "Jazz": "9230",
    "Telenor PK": "9234",
    "Zong": "9231",
    "Ufone": "9233",
  },

  // ========== UNITED KINGDOM ==========
  "United Kingdom": {
    "EE": "4479",
    "O2": "4477",
    "Vodafone UK": "4478",
    "Three": "4473",
  },

  // ========== SAUDI ARABIA ==========
  "Saudi Arabia": {
    "STC": "96650",
    "Mobily": "96654",
    "Zain KSA": "96659",
  },

  // ========== UAE ==========
  UAE: {
    "Etisalat": "97150",
    "du": "97155",
  },

  // ========== NIGERIA ==========
  Nigeria: {
    "MTN NG": "23480",
    "Airtel NG": "23480",
    "Globacom": "23480",
    "9mobile": "23480",
  },

  // ========== EGYPT ==========
  Egypt: {
    "Vodafone EG": "2010",
    "Orange EG": "2012",
    "Etisalat Masr": "2011",
    "WE": "2015",
  },

  // ========== TURKEY ==========
  Turkey: {
    "Turkcell": "9053",
    "Vodafone TR": "9054",
    "Turk Telekom": "9055",
  },

  // ========== INDONESIA ==========
  Indonesia: {
    "Telkomsel": "6281",
    "XL Axiata": "6281",
    "Indosat": "6281",
    "Smartfren": "6288",
  },

  // ========== MALAYSIA ==========
  Malaysia: {
    "Maxis": "6012",
    "CelcomDigi": "6013",
    "U Mobile": "6018",
    "Unifi Mobile": "6011",
  },

  // ========== PHILIPPINES ==========
  Philippines: {
    "Globe": "6391",
    "Smart": "6391",
    "DITO": "6399",
  },

  // ========== THAILAND ==========
  Thailand: {
    "AIS": "668",
    "TrueMove": "668",
    "DTAC": "668",
  },

  // ========== VIETNAM ==========
  Vietnam: {
    "Viettel": "849",
    "Vinaphone": "849",
    "Mobifone": "849",
  },

  // ========== BRAZIL ==========
  Brazil: {
    "Vivo": "5511",
    "Claro": "5511",
    "TIM Brasil": "5511",
    "Oi": "5511",
  },

  // ========== SOUTH AFRICA ==========
  "South Africa": {
    "Vodacom": "2782",
    "MTN SA": "2783",
    "Cell C": "2784",
    "Telkom Mobile": "2781",
  },

  // ========== KENYA ==========
  Kenya: {
    "Safaricom": "2547",
    "Airtel KE": "2547",
    "Telkom KE": "2547",
  },

  // ========== NEPAL ==========
  Nepal: {
    "Ncell": "97798",
    "Nepal Telecom": "97798",
  },

  // ========== SRI LANKA ==========
  "Sri Lanka": {
    "Dialog": "9477",
    "Mobitel": "9471",
    "Hutch": "9478",
  },

  // ========== AFGHANISTAN ==========
  Afghanistan: {
    "AWCC": "9370",
    "Roshan": "9379",
    "MTN AF": "9377",
    "Etisalat AF": "9378",
  },

  // ========== QATAR ==========
  Qatar: {
    "Ooredoo": "9745",
    "Vodafone QA": "9747",
  },

  // ========== KUWAIT ==========
  Kuwait: {
    "Zain": "9659",
    "Ooredoo KW": "9655",
    "STC KW": "9656",
  },

  // ========== OMAN ==========
  Oman: {
    "Omantel": "9689",
    "Ooredoo OM": "9689",
    "Vodafone OM": "9687",
  },

  // ========== MOROCCO ==========
  Morocco: {
    "Maroc Telecom": "2126",
    "Orange MA": "2126",
    "Inwi": "2126",
  },

  // ========== JORDAN ==========
  Jordan: {
    "Zain JO": "9627",
    "Orange JO": "9627",
    "Umniah": "9627",
  },

  // ========== SINGAPORE ==========
  Singapore: {
    "Singtel": "659",
    "StarHub": "659",
    "M1": "659",
    "SIMBA": "658",
  },

  // ========== HONG KONG ==========
  "Hong Kong": {
    "CMHK": "8529",
    "CSL": "8529",
    "3 HK": "8526",
    "SmarTone": "8529",
  },

  // ========== AUSTRALIA ==========
  Australia: {
    "Telstra": "614",
    "Optus": "614",
    "Vodafone AU": "614",
  },

  // ========== MYANMAR ==========
  Myanmar: {
    "MPT": "959",
    "Ooredoo MM": "959",
    "Telenor MM": "959",
  },

  // ========== CAMBODIA ==========
  Cambodia: {
    "Metfone": "8559",
    "Smart Axiata": "8559",
    "Cellcard": "8551",
  },
};

async function main() {
  console.log("🔌 Fetching current MCC/MNC + prefix data...");

  const [allMccmnc] = await p.execute(
    "SELECT id, country, operator, mcc, mnc FROM e_mccmnc"
  ) as any;

  interface Update { id: number; prefix: string; country: string; operator: string }
  const updates: Update[] = [];
  let matched = 0;

  for (const row of allMccmnc) {
    const countryMap = PREFIX_MAP[row.country];
    if (!countryMap) continue;

    for (const [opPattern, prefixValue] of Object.entries(countryMap)) {
      if (row.operator === opPattern || row.operator.toLowerCase() === opPattern.toLowerCase()) {
        updates.push({
          id: row.id,
          prefix: prefixValue,
          country: row.country,
          operator: opPattern,
        });
        matched++;
        break;
      }
    }
  }

  console.log(`📍 Matched ${matched} operators with real prefixes across ${Object.keys(PREFIX_MAP).length} countries`);

  // Batch update prefixes using INSERT ... ON DUPLICATE KEY UPDATE
  const BATCH = 100;
  let updated = 0;
  let created = 0;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const params: any[] = [];
    for (const u of batch) {
      params.push(u.id, u.prefix, u.country, u.operator, `Real prefix (was auto-generated)`);
    }

    await p.execute(
      `INSERT INTO e_prefix (mccmnc_id, prefix, country, operator, memo) VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE prefix = VALUES(prefix), memo = VALUES(memo)`,
      params
    );

    updated += batch.length;
  }

  console.log(`✅ Updated ${updated} prefix entries`);

  // Show Bangladesh results
  console.log("\n=== 🇧🇩 Bangladesh Results ===");
  const [bd] = await p.execute(
    `SELECT m.operator, m.mcc, m.mnc, pf.prefix, pf.memo
     FROM e_mccmnc m
     LEFT JOIN e_prefix pf ON pf.mccmnc_id = m.id
     WHERE m.country = 'Bangladesh'
     ORDER BY m.id`
  ) as any;
  console.table(bd);

  // Show some sample updates
  console.log("\n=== 📱 Sample Updated Prefixes ===");
  const [sample] = await p.execute(
    `SELECT pf.country, pf.operator, pf.prefix, m.mcc, m.mnc
     FROM e_prefix pf
     JOIN e_mccmnc m ON m.id = pf.mccmnc_id
     WHERE pf.memo = 'Real prefix (was auto-generated)'
     ORDER BY pf.country, pf.operator LIMIT 20`
  ) as any;
  console.table(sample);

  console.log(`\n✅ Done! ${matched} operators updated with real phone prefixes.`);
  await p.end();
}

main().catch(console.error);
