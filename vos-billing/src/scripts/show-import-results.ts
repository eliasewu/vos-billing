import mysql from "mysql2/promise";

const p = mysql.createPool({ host: "127.0.0.1", user: "root", password: "", database: "vos3000" });

(async () => {
  // Totals
  const [c] = await p.execute("SELECT COUNT(*) as cnt FROM e_mccmnc") as any;
  const [d] = await p.execute("SELECT COUNT(*) as cnt FROM e_prefix") as any;

  // Sample data
  const [samples] = await p.execute(
    "SELECT p.id, p.country, p.operator, p.prefix, p.memo, m.mcc, m.mnc FROM e_prefix p JOIN e_mccmnc m ON m.id = p.mccmnc_id ORDER BY p.id LIMIT 10"
  ) as any;

  // Countries count
  const [countries] = await p.execute(
    "SELECT country, COUNT(*) as cnt FROM e_prefix GROUP BY country ORDER BY cnt DESC LIMIT 15"
  ) as any;

  // Updated prefixes
  const [updated] = await p.execute(
    "SELECT p.id, p.country, p.operator, p.prefix, p.memo FROM e_prefix p WHERE p.memo LIKE '%from SASSMCC%' ORDER BY p.id LIMIT 10"
  ) as any;

  console.log(JSON.stringify({
    totals: { mccmnc: c[0].cnt, prefixes: d[0].cnt },
    samples: samples.slice(0, 5),
    topCountries: countries,
    recentlyImported: updated.slice(0, 5),
  }, null, 2));

  await p.end();
})();
