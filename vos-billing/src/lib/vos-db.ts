import mysql from "mysql2/promise";

// VOS3000 Database Connection Configuration
// Set these environment variables:
// VOS_DB_HOST, VOS_DB_PORT, VOS_DB_USER, VOS_DB_PASSWORD, VOS_DB_NAME

const vosConfig = {
  host: process.env.VOS_DB_HOST || "127.0.0.1",
  port: parseInt(process.env.VOS_DB_PORT || "3306"),
  user: process.env.VOS_DB_USER || "root",
  password: process.env.VOS_DB_PASSWORD || "",
  database: process.env.VOS_DB_NAME || "vos3000",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
let pool: mysql.Pool | null = null;

export function getVosPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(vosConfig);
  }
  return pool;
}

export async function queryVos<T = unknown>(
  sql: string,
  params?: (string | number | boolean | null | Date)[]
): Promise<T[]> {
  const p = getVosPool();
  const [rows] = await p.execute(sql, params);
  return rows as T[];
}

export async function executeVos(
  sql: string,
  params?: (string | number | boolean | null | Date)[]
): Promise<mysql.ResultSetHeader> {
  const p = getVosPool();
  const [result] = await p.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

// Test connection
export async function testVosConnection(): Promise<{
  connected: boolean;
  error?: string;
  version?: string;
}> {
  try {
    const rows = await queryVos<{ version: string }>(
      "SELECT VERSION() as version"
    );
    return { connected: true, version: rows[0]?.version };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// VOS3000 Table Types (based on VOS3000 2.x e_user schema)

export interface VosSysUser {
  id: number;
  loginname: string;
  username: string;
  password: string;
  level: number;         // 0=super admin, 1=admin, etc.
  locktype: number;      // 0=active, 1=locked
  expiretime: number;    // Unix timestamp, 0=never expires
  lastlogin: number;     // Unix timestamp
  lastmodifypassword: number;
  createduser_id: number;
  memo: string;
  onetimepassword: string;
  limitmacs: number;
  macs: string;
  user_privilege_id: number;
}

export interface VosCustomer {
  id: number;
  customer_name: string;
  customer_type: number; // 0=General, 1=Clearing
  status: number;
  balance: number;
  credit: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  create_time: Date;
  remark: string;
}

export interface VosGateway {
  id: number;
  gateway_name: string;
  gateway_type: number; // 0=mapping, 1=routing
  ip_addr: string;
  port: number;
  protocol: number; // 0=SIP, 1=H323
  prefix: string;
  max_calls: number;
  status: number;
  customer_id: number;
  create_time: Date;
  remark: string;
}

export interface VosRoute {
  id: number;
  route_name: string;
  gateway_group_id: number;
  prefix: string;
  priority: number;
  status: number;
  create_time: Date;
}

export interface VosGatewayGroup {
  id: number;
  group_name: string;
  route_type: number; // 0=priority, 1=round-robin, 2=weight
  status: number;
  create_time: Date;
}

export interface VosGatewayGroupMember {
  id: number;
  group_id: number;
  gateway_id: number;
  priority: number;
  weight: number;
  status: number;
}

export interface VosActiveCall {
  id: number;
  call_id: string;
  caller: string;
  callee: string;
  customer_id: number;
  customer_name: string;
  mapping_gw_id: number;
  mapping_gw_name: string;
  routing_gw_id: number;
  routing_gw_name: string;
  start_time: Date;
  connect_time: Date;
  duration: number;
  status: number;
}

export interface VosCdr {
  id: number;
  call_id: string;
  caller: string;
  callee: string;
  customer_id: number;
  mapping_gw_id: number;
  routing_gw_id: number;
  start_time: Date;
  connect_time: Date;
  end_time: Date;
  duration: number;
  bill_duration: number;
  hangup_cause: number;
  rate: number;
  cost: number;
  sell_rate: number;
  sell_cost: number;
}

export interface VosRateTable {
  id: number;
  rate_table_name: string;
  customer_id: number;
  status: number;
  create_time: Date;
}

export interface VosRate {
  id: number;
  rate_table_id: number;
  prefix: string;
  destination: string;
  rate: number;
  connect_fee: number;
  min_time: number;
  increment: number;
  status: number;
}
