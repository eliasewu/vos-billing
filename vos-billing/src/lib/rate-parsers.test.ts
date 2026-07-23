import { describe, it, expect } from "vitest";
import { parseCSV, parseExcel, EXCEL_FIELD_MAP } from "@/lib/rate-parsers";
import * as XLSX from "xlsx";

// Helper: create an XLSX ArrayBuffer from a 2D array of values
function makeXlsxBuffer(headers: string[], rows: string[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Rates");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

// ─────────────────────────────────────────────────
// parseCSV Tests
// ─────────────────────────────────────────────────

describe("parseCSV", () => {
  it("parses a basic CSV with all columns", () => {
    const result = parseCSV("prefix,areacode,fee,tax,period,type\n2000,91,0.017,0.0,60,0\n3000,44,0.02,0.05,30,1");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      prefix: "2000", areacode: "91", fee: "0.017", tax: "0.0", period: "60", type: "0",
    });
    expect(result.rows[1]).toEqual({
      prefix: "3000", areacode: "44", fee: "0.02", tax: "0.05", period: "30", type: "1",
    });
  });

  it("parses a CSV with only the required prefix column", () => {
    const result = parseCSV("prefix\n2000\n3000");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[0].fee).toBe("0.001");   // default
    expect(result.rows[0].period).toBe("60");    // default
    expect(result.rows[0].tax).toBe("0");        // default
    expect(result.rows[0].type).toBe("0");       // default
  });

  it("strips surrounding quotes from individual fields", () => {
    // Note: naive comma-split does NOT handle quoted commas within fields.
    // VOS rate prefixes don't contain commas, so full CSV quoting is unnecessary.
    const result = parseCSV('prefix,areacode,fee\n"2000",91,0.017\n3000,44,0.02');
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[0].areacode).toBe("91");
  });

  it("handles CRLF (Windows) line endings", () => {
    const result = parseCSV("prefix,fee\r\n2000,0.017\r\n3000,0.02");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows).toHaveLength(2);
  });

  it("returns error for empty string", () => {
    const result = parseCSV("");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("header");
    }
  });

  it("returns error for single-line CSV (header only, no data)", () => {
    const result = parseCSV("prefix,fee");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("header");
    }
  });

  it("returns error when no prefix column found", () => {
    const result = parseCSV("fee,tax,period\n0.017,0.0,60");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("prefix");
    }
  });

  it("auto-detects fee column via 'rate' header", () => {
    const result = parseCSV("prefix,rate\n2000,0.017");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].fee).toBe("0.017");
  });

  it("auto-detects fee column via 'price' header", () => {
    const result = parseCSV("prefix,price\n2000,0.017");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].fee).toBe("0.017");
  });

  it("auto-detects period column via 'billing' header", () => {
    const result = parseCSV("prefix,billing\n2000,60");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].period).toBe("60");
  });

  it("auto-detects period column via 'cycle' header", () => {
    const result = parseCSV("prefix,cycle\n2000,30");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].period).toBe("30");
  });

  it("skips rows with empty prefix", () => {
    const result = parseCSV("prefix,fee\n2000,0.017\n,0.02\n3000,0.03");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map(r => r.prefix)).toEqual(["2000", "3000"]);
  });

  it("returns error when ALL rows have empty prefix", () => {
    const result = parseCSV("prefix,fee\n,0.017\n,0.02");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("No valid");
    }
  });

  it("trims whitespace from values", () => {
    const result = parseCSV("prefix , fee\n 2000 , 0.017 ");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[0].fee).toBe("0.017");
  });

  it("handles header with spaces and special characters", () => {
    // The CSV parser strips non-alpha-comma chars from header
    const result = parseCSV("Prefix Name, Fee ($)\n2000,0.017");
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[0].fee).toBe("0.017");
  });
});

// ─────────────────────────────────────────────────
// parseExcel Tests
// ─────────────────────────────────────────────────

describe("parseExcel", () => {
  it("parses an Excel file with friendly headers (matching /root/rate.xls structure)", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix", "Area prefix", "Billing rate", "Billing cycle", "Tax rate", "Section rate", "Lock type", "Rate type"],
      [
        ["2000", "91", "0.017", "60", "0.0", "0", "No lock", "Domestic"],
        ["3000", "91", "0.0172", "60", "0.0", "0", "No lock", "Domestic"],
        ["4000", "44", "0.03", "30", "0.05", "0.01", "Locked", "Domestic"],
        ["5000", "1", "0.005", "6", "0.0", "0", "No lock", "Flat rate"],
      ]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");

    expect(result.rows).toHaveLength(4);
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[0].areacode).toBe("91");
    expect(result.rows[0].fee).toBe("0.017");
    expect(result.rows[0].period).toBe("60");
    expect(result.rows[0].type).toBe("0");

    // Row with "Locked" → locktype=1 (not currently in CsvRow output, but verified in parse)
    expect(result.rows[2].prefix).toBe("4000");

    // Row with "Flat rate" → type="1"
    expect(result.rows[3].prefix).toBe("5000");
    expect(result.rows[3].type).toBe("1");
    expect(result.rows[3].period).toBe("6");
  });

  it("parses Excel with VOS-native column names", () => {
    const buf = makeXlsxBuffer(
      ["feeprefix", "areacode", "fee", "period", "type", "locktype"],
      [["2000", "91", "0.017", "60", "0", "0"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].prefix).toBe("2000");
  });

  it("parses Excel with alternative header names", () => {
    const buf = makeXlsxBuffer(
      ["Prefix", "Area Code", "Rate", "Cycle", "Tax", "Type"],
      [["2000", "91", "0.02", "30", "0.05", "0"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].fee).toBe("0.02");
    expect(result.rows[0].period).toBe("30");
    expect(result.rows[0].tax).toBe("0.05");
  });

  it("skips rows with empty prefix", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix", "fee"],
      [
        ["2000", "0.017"],
        ["", "0.05"],       // empty prefix → skipped
        ["3000", "0.03"],
        ["   ", "0.01"],    // whitespace-only prefix → skipped
      ]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map(r => r.prefix)).toEqual(["2000", "3000"]);
  });

  it("returns error when all rows have empty prefix", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix", "fee"],
      [["", "0.017"], ["", "0.02"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("No valid data rows");
    }
  });

  it("returns error for corrupted or non-Excel data", () => {
    const emptyBuf = new ArrayBuffer(0);
    const result = parseExcel(emptyBuf);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      // xlsx behavior varies by version: may throw ("Failed to read"),
      // produce an empty workbook ("no sheets"), or a 0-1 row sheet ("header row")
      const hasValidError =
        result.error.includes("Failed to read") ||
        result.error.includes("no sheets") ||
        result.error.includes("header row");
      expect(hasValidError).toBe(true);
    }
  });

  it("returns error when no prefix column found", () => {
    const buf = makeXlsxBuffer(
      ["Some column", "Fee", "Period"],
      [["test", "0.017", "60"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("prefix");
    }
  });

  it("returns error for single-row Excel (header only)", () => {
    const buf = makeXlsxBuffer(["Rate prefix", "fee"], []);
    const result = parseExcel(buf);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("header");
    }
  });

  it("applies defaults for missing optional columns", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix"],     // only prefix column
      [["2000"], ["3000"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].fee).toBe("0.001");
    expect(result.rows[0].period).toBe("60");
    expect(result.rows[0].tax).toBe("0");
    expect(result.rows[0].type).toBe("0");
    expect(result.rows[0].areacode).toBe("");
  });

  it("handles Infinity values in fee column gracefully", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix", "fee"],
      [["2000", "Infinity"], ["3000", "NaN"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    // Non-finite numbers fall back to "0.001"
    expect(result.rows[0].fee).toBe("0.001");
    expect(result.rows[1].fee).toBe("0.001");
  });

  it("handles large numeric fee values correctly", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix", "fee"],
      [["2000", "0.000001"], ["3000", "999.999999"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].fee).toBe("0.000001");
    expect(result.rows[1].fee).toBe("999.999999");
  });

  it("handles whitespace in header names", () => {
    const buf = makeXlsxBuffer(
      ["  Rate prefix  ", "   Fee  ", "  Billing cycle "],
      [["2000", "0.017", "60"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[0].fee).toBe("0.017");
  });

  it("maps rate type text to numbers correctly", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix", "Rate type"],
      [
        ["2001", "Domestic"],
        ["2002", "Standard"],
        ["2003", "std"],
        ["2004", "Flat"],
        ["2005", "flat rate"],
        ["2006", "Tiered"],
        ["2007", "Premium"],
        ["2008", "Special"],
        ["2009", "unknown-type"],
      ]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows.map(r => r.type)).toEqual([
      "0", // Domestic
      "0", // Standard
      "0", // std
      "1", // Flat
      "1", // flat rate
      "2", // Tiered
      "3", // Premium
      "3", // Special
      "0", // unknown → default 0
    ]);
  });

  // ─── Edge case: empty cells as actual NaN from SheetJS ───
  it("falls back to defaults when cells are empty (undefined/NaN)", () => {
    // SheetJS represents truly empty cells as undefined in header:1 mode.
    // Simulate by passing rows with sparse arrays (missing indices = undefined).
    // Use (null as unknown as string) to represent truly empty cells in test data.
    const buf = makeXlsxBuffer(
      ["Rate prefix", "fee", "tax", "period"],
      [
        ["2000", "0.017", "0.05", "60"],               // all present
        ["3000", null as unknown as string, null as unknown as string, null as unknown as string], // null → defaults
        ["4000", "", "", ""],                            // empty strings
      ]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows).toHaveLength(3);

    // Row 0: all values present
    expect(result.rows[0].fee).toBe("0.017");
    expect(result.rows[0].tax).toBe("0.05");
    expect(result.rows[0].period).toBe("60");

    // Row 1: null cells → defaults (fee=0.001, tax="0", period="60")
    expect(result.rows[1].fee).toBe("0.001");
    expect(result.rows[1].tax).toBe("0");
    expect(result.rows[1].period).toBe("60");

    // Row 2: empty string cells — fee falls to 0.001, tax/period stay as ""
    // because ?? only catches null/undefined, not empty strings
    expect(result.rows[2].fee).toBe("0.001");
    expect(result.rows[2].tax).toBe("");
    expect(result.rows[2].period).toBe("");
  });

  // ─── Edge case: zero fee is valid (should NOT fall back to default) ───
  it("preserves zero as a valid fee (does not fall back to 0.001)", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix", "fee"],
      [
        ["free-call", "0"],
        ["another", "0.0"],
        ["also-free", "0.000000"],
      ]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows).toHaveLength(3);
    // Zero is a valid fee — should NOT be replaced with 0.001
    for (const row of result.rows) {
      expect(row.fee).toBe("0");
    }
  });

  // ─── Edge case: negative fee values ───
  it("accepts negative fee values", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix", "fee"],
      [["rebate-1", "-0.005"], ["rebate-2", "-1.5"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].fee).toBe("-0.005");
    expect(result.rows[1].fee).toBe("-1.5");
  });

  // ─── Edge case: duplicate column headers (first one wins) ───
  it("uses the first matching header when columns are duplicated", () => {
    // Two "fee" columns — the first one should win
    const buf = makeXlsxBuffer(
      ["Rate prefix", "fee", "fee"],
      [["2000", "0.017", "0.999"]]   // first fee=0.017, second fee=0.999
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].fee).toBe("0.017");  // first column wins
  });

  // ─── Edge case: mixed-case header names ───
  it("handles mixed-case header names", () => {
    const buf = makeXlsxBuffer(
      ["Rate Prefix", "FEE", "Period"],
      [["2000", "0.017", "60"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[0].fee).toBe("0.017");
    expect(result.rows[0].period).toBe("60");
  });

  // ─── Edge case: large dataset (100 rows) ───
  it("handles large datasets without errors", () => {
    const headers = ["Rate prefix", "fee", "period"];
    const rows: string[][] = [];
    for (let i = 0; i < 100; i++) {
      rows.push([String(2000 + i), String(0.01 + i * 0.001), "60"]);
    }
    const buf = makeXlsxBuffer(headers, rows);
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows).toHaveLength(100);
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[99].prefix).toBe("2099");
  });

  // ─── Boundary: exactly 500 rows (max before bulk API returns error) ───
  it("parses exactly 500 rows — the max bulk import limit", () => {
    const headers = ["Rate prefix", "areacode", "Billing rate", "Billing cycle", "Tax rate", "Rate type"];
    const rows: string[][] = [];
    for (let i = 0; i < 500; i++) {
      rows.push([
        String(2000 + i % 9000),        // prefix — cycles for realism
        String(91 + Math.floor(i / 50)), // areacode — 10 groups of 50
        (0.01 + i * 0.0001).toFixed(6),     // fee — gradually increasing, no float drift
        String(i % 2 === 0 ? 60 : 6),    // period — alternating 60/6
        String(i % 3 === 0 ? 0 : 0.05),  // tax — some taxed
        i % 5 === 0 ? "Flat rate" : "Domestic", // type — mixed
      ]);
    }
    const buf = makeXlsxBuffer(headers, rows);
    const result = parseExcel(buf);

    // Must succeed with exactly 500 rows
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows).toHaveLength(500);

    // Spot-check first, last, and middle rows
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[0].areacode).toBe("91");
    expect(Number(result.rows[0].fee)).toBeCloseTo(0.01, 6);
    expect(result.rows[0].period).toBe("60");
    expect(result.rows[0].tax).toBe("0");
    expect(result.rows[0].type).toBe("1"); // Flat rate (i=0, 0%5==0)

    expect(result.rows[250].prefix).toBe("2250");
    expect(result.rows[250].areacode).toBe("96");
    expect(Number(result.rows[250].fee)).toBeCloseTo(0.035, 6);
    expect(result.rows[250].period).toBe("60");
    expect(result.rows[250].tax).toBe("0.05"); // i=250, 250%3==1 → taxed
    expect(result.rows[250].type).toBe("1"); // Flat rate (250%5==0)

    expect(result.rows[499].prefix).toBe("2499");
    expect(result.rows[499].areacode).toBe("100");
    expect(Number(result.rows[499].fee)).toBeCloseTo(0.0599, 6);
    expect(result.rows[499].period).toBe("6");
    expect(result.rows[499].type).toBe("0"); // Domestic (499%5==4)

    // Verify type mapping works at scale
    const flatCount = result.rows.filter(r => r.type === "1").length;
    expect(flatCount).toBe(100); // every 5th row (500/5)

    const domesticCount = result.rows.filter(r => r.type === "0").length;
    expect(domesticCount).toBe(400);

    // Verify all rows have required prefix
    expect(result.rows.every(r => r.prefix.length > 0)).toBe(true);
  });

  // ─── Edge case: header row with numeric values that don't match any field ───
  it("gracefully ignores unrecognized header columns", () => {
    const buf = makeXlsxBuffer(
      ["Rate prefix", "Some Custom Column", "Another One", "fee"],
      [["2000", "ignored1", "ignored2", "0.017"]]
    );
    const result = parseExcel(buf);
    expect("error" in result).toBe(false);
    if (!("rows" in result)) throw new Error("Expected rows");
    expect(result.rows[0].prefix).toBe("2000");
    expect(result.rows[0].fee).toBe("0.017");
  });
});

// ─────────────────────────────────────────────────
// EXCEL_FIELD_MAP Tests
// ─────────────────────────────────────────────────

describe("EXCEL_FIELD_MAP", () => {
  it("maps all expected header aliases", () => {
    expect(EXCEL_FIELD_MAP["rate prefix"]).toBe("prefix");
    expect(EXCEL_FIELD_MAP["prefix"]).toBe("prefix");
    expect(EXCEL_FIELD_MAP["feeprefix"]).toBe("prefix");
    expect(EXCEL_FIELD_MAP["billing rate"]).toBe("fee");
    expect(EXCEL_FIELD_MAP["rate"]).toBe("fee");
    expect(EXCEL_FIELD_MAP["price"]).toBe("fee");
    expect(EXCEL_FIELD_MAP["billing cycle"]).toBe("period");
    expect(EXCEL_FIELD_MAP["cycle"]).toBe("period");
    expect(EXCEL_FIELD_MAP["tax rate"]).toBe("tax");
    expect(EXCEL_FIELD_MAP["rate type"]).toBe("type");
    expect(EXCEL_FIELD_MAP["lock type"]).toBe("locktype");
    expect(EXCEL_FIELD_MAP["section rate"]).toBe("ivrfee");
  });

  it("all known output fields are covered by at least one header alias", () => {
    // Every CsvRow field should have at least one header that maps to it
    const requiredFields = ["prefix", "areacode", "fee", "tax", "period", "type"];
    const covered = new Set(Object.values(EXCEL_FIELD_MAP));
    for (const field of requiredFields) {
      expect(covered.has(field)).toBe(true);
    }
  });
});
