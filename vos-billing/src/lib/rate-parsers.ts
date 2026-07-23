import * as XLSX from "xlsx";

export interface CsvRow {
  prefix: string;
  areacode: string;
  fee: string;
  tax: string;
  period: string;
  type: string;
}

export interface ParseSuccess {
  rows: CsvRow[];
}

export interface ParseError {
  error: string;
}

export type ParseResult = ParseSuccess | ParseError;

// ─── Excel column name → CsvRow field mapping ───
export const EXCEL_FIELD_MAP: Record<string, string> = {
  "rate prefix": "prefix",
  "prefix": "prefix",
  "feeprefix": "prefix",
  "area prefix": "areacode",
  "area code": "areacode",
  "areacode": "areacode",
  "code": "areacode",
  "billing rate": "fee",
  "rate(minute)": "fee",
  "rate": "fee",
  "fee": "fee",
  "price": "fee",
  "billing cycle": "period",
  "cycle": "period",
  "period": "period",
  "tax rate": "tax",
  "tax": "tax",
  "rate type": "type",
  "type": "type",
  "lock type": "locktype",
  "locktype": "locktype",
  "section rate": "ivrfee",
  "ivrfee": "ivrfee",
};

const TYPE_MAP: Record<string, string> = {
  domestic: "0",
  standard: "0",
  std: "0",
  flat: "1",
  "flat rate": "1",
  tiered: "2",
  premium: "3",
  special: "3",
};

/**
 * Parse an Excel (.xls/.xlsx) file buffer into CsvRow[].
 * Columns are auto-detected by header name using EXCEL_FIELD_MAP.
 * Text values like "Domestic", "Flat rate", "No lock", "Locked" are mapped to numbers.
 * Rows with empty prefix are silently skipped.
 */
export function parseExcel(data: ArrayBuffer): ParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, { type: "array" });
  } catch {
    return { error: "Failed to read Excel file — it may be corrupted or in an unsupported format" };
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { error: "Excel file has no sheets" };
  }

  const sh = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<string[]>(sh, { header: 1 });

  if (json.length < 2) {
    return { error: "File must have a header row and at least one data row" };
  }

  const headers = (json[0] as string[]).map((h) => String(h ?? "").trim().toLowerCase());

  // Build column index map
  const colMap: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const mapped = EXCEL_FIELD_MAP[headers[i]];
    if (mapped && !(mapped in colMap)) {
      colMap[mapped] = i;
    }
  }

  if (!("prefix" in colMap)) {
    return { error: `Could not find a 'prefix' column in the file. Detected headers: ${headers.join(", ") || "none"}` };
  }

  const rows: CsvRow[] = [];
  const locktypeIdx = headers.findIndex((h) => h.includes("lock"));
  const typeIdx = headers.findIndex((h) => h === "rate type");

  for (let i = 1; i < json.length; i++) {
    const row = json[i] as string[];
    const prefix = String(row[colMap["prefix"]] ?? "").trim();
    if (!prefix) continue;

    // NOTE: locktype is computed from Excel text ("Locked"/"No lock") but
    // CsvRow has no locktype field. Lock status from Excel imports is silently
    // discarded — all imported rates default to Active (locktype=0) in the DB.
    let locktype = "0";
    if (locktypeIdx >= 0) {
      const lv = String(row[locktypeIdx] ?? "").trim().toLowerCase();
      if (lv === "locked" || lv === "lock" || lv === "1") locktype = "1";
    }

    // Map rate type text → number
    let type = "0";
    if (typeIdx >= 0) {
      const tv = String(row[typeIdx] ?? "").trim().toLowerCase();
      type = TYPE_MAP[tv] || "0";
    }

    // Parse fee: convert to number, fall back to 0.001
    const rawFee = row[colMap["fee"]];
    const feeNum = rawFee !== undefined && rawFee !== null && rawFee !== ""
      ? Number(rawFee)
      : NaN;
    const fee = isFinite(feeNum) ? String(feeNum) : "0.001";

    rows.push({
      prefix,
      areacode: String(row[colMap["areacode"]] ?? "").trim(),
      fee,
      tax: String(row[colMap["tax"]] ?? "0"),
      period: String(row[colMap["period"]] ?? "60"),
      type,
    });
  }

  if (rows.length === 0) {
    return { error: "No valid data rows found — all rows have empty prefix" };
  }

  return { rows };
}

/**
 * Parse a CSV string into CsvRow[].
 * Columns are auto-detected by header name (e.g. "prefix", "fee", "tax").
 * Supports quoted values and both \r\n and \n line endings.
 */
export function parseCSV(text: string): ParseResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { error: "CSV must have a header row and at least one data row" };
  }

  const header = lines[0]
    .toLowerCase()
    .replace(/[^a-z,]/g, "")
    .split(",");

  const prefixIdx = header.findIndex((h) => h.includes("prefix"));
  const areaIdx = header.findIndex((h) => h.includes("area") || h.includes("code"));
  const feeIdx = header.findIndex((h) => h.includes("fee") || h.includes("rate") || h.includes("price"));
  const taxIdx = header.findIndex((h) => h.includes("tax"));
  const periodIdx = header.findIndex((h) => h.includes("period") || h.includes("cycle") || h.includes("billing"));
  const typeIdx = header.findIndex((h) => h.includes("type"));

  if (prefixIdx === -1) {
    return { error: "CSV must have a 'prefix' column" };
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""));

    if (cols.length > 0 && cols[prefixIdx]) {
      rows.push({
        prefix: cols[prefixIdx],
        areacode: areaIdx >= 0 ? (cols[areaIdx] || "") : "",
        fee: feeIdx >= 0 ? (cols[feeIdx] || "0.001") : "0.001",
        tax: taxIdx >= 0 ? (cols[taxIdx] || "0") : "0",
        period: periodIdx >= 0 ? (cols[periodIdx] || "60") : "60",
        type: typeIdx >= 0 ? (cols[typeIdx] || "0") : "0",
      });
    }
  }

  if (rows.length === 0) {
    return { error: "No valid data rows found in CSV" };
  }

  return { rows };
}
