import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const accountTypeEnum = pgEnum("account_type", ["client", "supplier"]);
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "suspended",
  "disabled",
]);
export const gatewayTypeEnum = pgEnum("gateway_type", ["mapping", "routing"]);
export const gatewayProtocolEnum = pgEnum("gateway_protocol", [
  "SIP",
  "H323",
]);
export const cdrStatusEnum = pgEnum("cdr_status", [
  "answered",
  "failed",
  "busy",
  "no_answer",
  "cancelled",
]);
export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "synced",
  "failed",
]);

// Accounts (Clients & Suppliers)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  accountType: accountTypeEnum("account_type").notNull(),
  status: accountStatusEnum("status").notNull().default("active"),
  company: varchar("company", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  balance: numeric("balance", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  vosAccountId: varchar("vos_account_id", { length: 100 }),
  syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Gateways (Mapping for Clients, Routing for Suppliers)
export const gateways = pgTable("gateways", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .references(() => accounts.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  gatewayType: gatewayTypeEnum("gateway_type").notNull(),
  protocol: gatewayProtocolEnum("protocol").notNull().default("SIP"),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  port: integer("port").notNull().default(5060),
  prefix: varchar("prefix", { length: 50 }),
  maxChannels: integer("max_channels").notNull().default(30),
  enabled: boolean("enabled").notNull().default(true),
  vosGatewayId: varchar("vos_gateway_id", { length: 100 }),
  syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rate Groups
export const rateGroups = pgTable("rate_groups", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .references(() => accounts.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  effectiveDate: timestamp("effective_date").defaultNow().notNull(),
  vosRateGroupId: varchar("vos_rate_group_id", { length: 100 }),
  syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rate Entries (Prefix-based pricing)
export const rates = pgTable("rates", {
  id: serial("id").primaryKey(),
  rateGroupId: integer("rate_group_id")
    .references(() => rateGroups.id)
    .notNull(),
  prefix: varchar("prefix", { length: 20 }).notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  ratePerMin: numeric("rate_per_min", { precision: 10, scale: 6 }).notNull(),
  connectCharge: numeric("connect_charge", { precision: 10, scale: 6 })
    .notNull()
    .default("0"),
  minDuration: integer("min_duration").notNull().default(1),
  increment: integer("increment").notNull().default(1),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CDR Records (Call Detail Records)
export const cdrs = pgTable("cdrs", {
  id: serial("id").primaryKey(),
  callId: varchar("call_id", { length: 100 }).notNull(),
  callerNumber: varchar("caller_number", { length: 50 }).notNull(),
  calledNumber: varchar("called_number", { length: 50 }).notNull(),
  clientAccountId: integer("client_account_id").references(() => accounts.id),
  supplierAccountId: integer("supplier_account_id").references(
    () => accounts.id
  ),
  clientGatewayId: integer("client_gateway_id").references(() => gateways.id),
  supplierGatewayId: integer("supplier_gateway_id").references(
    () => gateways.id
  ),
  startTime: timestamp("start_time").notNull(),
  connectTime: timestamp("connect_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration").notNull().default(0),
  billedDuration: integer("billed_duration").notNull().default(0),
  status: cdrStatusEnum("status").notNull(),
  sipCode: integer("sip_code"),
  clientRate: numeric("client_rate", { precision: 10, scale: 6 })
    .notNull()
    .default("0"),
  clientCost: numeric("client_cost", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  supplierRate: numeric("supplier_rate", { precision: 10, scale: 6 })
    .notNull()
    .default("0"),
  supplierCost: numeric("supplier_cost", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  margin: numeric("margin", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  prefix: varchar("prefix", { length: 20 }),
  destination: varchar("destination", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System Alerts & Events
export const systemAlerts = pgTable("system_alerts", {
  id: serial("id").primaryKey(),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  accountId: integer("account_id").references(() => accounts.id),
  acknowledged: boolean("acknowledged").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sync log for VOS3000 operations
export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  operation: varchar("operation", { length: 20 }).notNull(),
  status: syncStatusEnum("status").notNull().default("pending"),
  request: text("request"),
  response: text("response"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
