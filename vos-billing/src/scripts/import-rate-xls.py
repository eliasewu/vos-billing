#!/usr/bin/env python3
"""Import rate.xls into e_feerate via /api/vos/rates/bulk (or MySQL fallback).

Usage: python3 import-rate-xls.py [--group-id N] [--dry-run]
"""

import sys, json, subprocess

try:
    import xlrd
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "xlrd", "-q"])
    import xlrd

# ─── Config ───
XLS_PATH = "/root/rate.xls"
API_URL = "http://localhost:3000/api/vos/rates/bulk"
GROUP_ID = 0

# ─── Column mapping (Excel header → bulk API field) ───
FIELD_MAP = {
    "rate prefix": "prefix", "prefix": "prefix",
    "area prefix": "areacode", "areacode": "areacode",
    "billing rate": "fee", "rate(minute)": "fee", "fee": "fee",
    "billing cycle": "period", "period": "period",
    "tax rate": "tax", "tax": "tax",
    "section rate": "ivrfee", "ivrfee": "ivrfee",
    "rate type": "type", "type": "type",
    "lock type": "locktype",
}


def parse_xls(path):
    """Parse XLS and return list of rate dicts ready for the bulk API."""
    wb = xlrd.open_workbook(path)
    sh = wb.sheet_by_index(0)
    headers = [str(sh.cell_value(0, c)).strip().lower() for c in range(sh.ncols)]

    col_map = {}
    for i, h in enumerate(headers):
        for xls_h, api_f in FIELD_MAP.items():
            if xls_h in h and api_f not in col_map:
                col_map[api_f] = i

    if "prefix" not in col_map:
        print("ERROR: No prefix column found")
        sys.exit(1)

    type_idx = next((i for i, h in enumerate(headers) if "rate type" in h), -1)
    lock_idx = next((i for i, h in enumerate(headers) if "lock" in h), -1)

    type_map = {"domestic": 0, "standard": 0, "std": 0, "flat": 1, "flat rate": 1, "tiered": 2, "premium": 3, "special": 3}

    rates = []
    for r in range(1, sh.nrows):
        row = [sh.cell_value(r, c) for c in range(sh.ncols)]
        prefix = str(row[col_map["prefix"]]).strip()
        if not prefix:
            continue

        def cell(field, default=""):
            return str(row[col_map[field]]).strip() if field in col_map else default

        def num(field, default=0):
            try:
                v = float(row[col_map[field]]) if field in col_map else default
                return v if str(v) not in ("inf", "nan", "-inf") else default
            except (ValueError, TypeError):
                return default

        locktype = 0
        if lock_idx >= 0:
            lv = str(row[lock_idx]).strip().lower()
            if lv in ("locked", "lock", "1"):
                locktype = 1

        rate_type = 0
        if type_idx >= 0:
            tv = str(row[type_idx]).strip().lower()
            rate_type = type_map.get(tv, 0)

        rates.append({
            "prefix": prefix,
            "areacode": cell("areacode", ""),
            "fee": num("fee", 0),
            "tax": num("tax", 0),
            "period": int(num("period", 60)),
            "ivrfee": num("ivrfee", 0),
            "ivrperiod": 0,
            "type": rate_type,
            "locktype": locktype,
        })

    return rates


def import_via_api(rates, group_id):
    """POST to /api/vos/rates/bulk."""
    import urllib.request, urllib.error

    payload = json.dumps({"feerategroup_id": group_id, "rates": rates}).encode()
    req = urllib.request.Request(API_URL, data=payload,
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"error": "HTTP %d: %s" % (e.code, body[:200])}
    except urllib.error.URLError as e:
        return {"error": "Connection failed: %s" % e.reason}


def import_via_mysql(rates, group_id):
    """Insert directly via mysql CLI."""
    for r in rates:
        sql = (
            "INSERT INTO e_feerate "
            "(feerategroup_id, feeprefix, areacode, locktype, fee, tax, period, ivrfee, ivrperiod, type) "
            "VALUES (%d, '%s', '%s', %d, %.6f, %.4f, %d, %.4f, %d, %d);"
            % (group_id, r["prefix"], r["areacode"], r["locktype"],
               r["fee"], r["tax"], r["period"], r["ivrfee"], r["ivrperiod"], r["type"])
        )
        subprocess.run(["mysql", "-u", "root", "vos3000", "-e", sql],
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    return {"succeeded": len(rates), "failed": 0, "errors": []}


def main():
    dry_run = "--dry-run" in sys.argv
    group_id = GROUP_ID
    for i, a in enumerate(sys.argv):
        if a == "--group-id" and i + 1 < len(sys.argv):
            group_id = int(sys.argv[i + 1])

    print("Reading: %s" % XLS_PATH)
    rates = parse_xls(XLS_PATH)
    print("  Parsed %d rate(s)\n" % len(rates))

    for i, r in enumerate(rates):
        print("  Row %d: prefix=%s area=%s fee=%.6f period=%ds type=%d lock=%d"
              % (i + 1, r["prefix"], r["areacode"], r["fee"], r["period"], r["type"], r["locktype"]))

    if dry_run:
        print("\nDry run - no data inserted.")
        return

    # Try API first, fall back to MySQL
    print("\nImporting to group %d..." % group_id)
    result = import_via_api(rates, group_id)

    if result.get("error"):
        print("  API unavailable (%s), using MySQL fallback..." % result["error"])
        result = import_via_mysql(rates, group_id)

    print("  Succeeded: %d  Failed: %d" % (result.get("succeeded", 0), result.get("failed", 0)))
    if result.get("errors"):
        for e in result["errors"]:
            print("    Error: %s" % e)

    # Verify
    out = subprocess.run(
        ["mysql", "-u", "root", "vos3000", "-N", "-e",
         "SELECT id, feeprefix, fee, period, type, locktype, feerategroup_id FROM e_feerate ORDER BY id DESC LIMIT 5"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print("\nRecent e_feerate records:")
    for line in out.stdout.strip().split("\n")[:5]:
        print("  " + line)


if __name__ == "__main__":
    main()
