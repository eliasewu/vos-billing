import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

const MAPPING_TABLE = "e_gatewaymapping";
const ROUTING_TABLE = "e_gatewayrouting";

function normalizeMappingRow(row: Record<string, unknown>): Record<string, unknown> {
  const ips = String(row.remoteips || "");
  const firstIp = ips.split(",")[0].trim();
  // VOS: locktype=0 means unlocked/active
  const isActive = (Number(row.locktype) || 0) === 0;
  return {
    id: row.id,
    gateway_name: row.name || "",
    gateway_type: 0,  // 0=mapping
    type: "mapping",
    ip_addr: firstIp,
    port: Number(row.signalport) || 5060,
    protocol: Number(row.protocol) || 0,
    prefix: String(row.prefix || ""),
    max_calls: Number(row.capacity) || 0,
    status: isActive ? 1 : 0,
    customer_id: row.customer_id || 0,
    create_time: "",
    remark: String(row.memo || ""),
    // Keep original VOS fields too
    remoteips: ips,
    capacity: Number(row.capacity) || 0,
    locktype: row.locktype ?? 0,
  };
}

function normalizeRoutingRow(row: Record<string, unknown>): Record<string, unknown> {
  const ips = String(row.remoteips || "");
  const firstIp = ips.split(",")[0].trim();
  // VOS: locktype=0 means unlocked/active
  const isActive = (Number(row.locktype) || 0) === 0;
  return {
    id: row.id,
    gateway_name: row.name || "",
    gateway_type: 1,  // 1=routing
    type: "routing",
    ip_addr: firstIp,
    port: Number(row.signalport) || 5060,
    protocol: Number(row.protocol) || 0,
    prefix: String(row.prefix || ""),
    max_calls: Number(row.capacity) || 0,
    status: isActive ? 1 : 0,
    customer_id: row.clearingcustomer_id || 0,
    create_time: "",
    remark: String(row.memo || ""),
    // Keep original VOS fields too
    remoteips: ips,
    capacity: Number(row.capacity) || 0,
    locktype: row.locktype ?? 0,
  };
}

export async function GET(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const type = request.nextUrl.searchParams.get("type"); // "mapping" or "routing"

    if (type === "routing") {
      const rows = await queryVos<Record<string, unknown>>(
        `SELECT * FROM ${ROUTING_TABLE} ORDER BY id DESC`
      );
      const gateways = rows.map(normalizeRoutingRow);
      return NextResponse.json({ gateways, table: ROUTING_TABLE, type: "routing" });
    }

    // Default: mapping gateways
    const rows = await queryVos<Record<string, unknown>>(
      `SELECT * FROM ${MAPPING_TABLE} ORDER BY id DESC`
    );
    const gateways = rows.map(normalizeMappingRow);
    return NextResponse.json({ gateways, table: MAPPING_TABLE, type: "mapping" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, gateways: [] });
  }
}

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const gwType = body.type || "mapping";

    let result;
    if (gwType === "routing") {
      result = await executeVos(
        `INSERT INTO ${ROUTING_TABLE} (name, prefix, prefixstyle, clearingcustomer_id, capacity, priority, locktype, memo, password, protocol, remoteips, signalport)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.name || "",
          body.prefix || "",
          body.prefixstyle || 0,
          body.customer_id || 0,
          body.capacity || 30,
          body.priority || 1,
          body.locktype ?? 0,
          body.memo || "",
          body.password || "",
          body.protocol || 0,
          body.remoteips || "",
          body.signalport || 5060,
        ]
      );
    } else {
      result = await executeVos(
        `INSERT INTO ${MAPPING_TABLE} (name, customer_id, capacity, priority, locktype, memo, password, remoteips)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.name || "",
          body.customer_id || 0,
          body.capacity || 30,
          body.priority || 1,
          body.locktype ?? 0,
          body.memo || "",
          body.password || "",
          body.remoteips || "",
        ]
      );
    }

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
