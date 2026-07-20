import { db } from "@/db";
import {
  accounts,
  gateways,
  rateGroups,
  rates,
  cdrs,
  systemAlerts,
  syncLog,
} from "@/db/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  // Check if data already exists
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(accounts);
  if (Number(existing[0].count) > 0) return;

  // Seed Accounts
  const clientAccounts = await db
    .insert(accounts)
    .values([
      {
        name: "Alpha Telecom",
        accountType: "client",
        status: "active",
        company: "Alpha Telecom Inc.",
        email: "ops@alphatelecom.com",
        phone: "+1-555-0101",
        balance: "15420.5000",
        creditLimit: "5000.0000",
        currency: "USD",
        vosAccountId: "VOS-C001",
        syncStatus: "synced",
      },
      {
        name: "BetaVoice",
        accountType: "client",
        status: "active",
        company: "BetaVoice Ltd.",
        email: "admin@betavoice.net",
        phone: "+44-20-7946-0958",
        balance: "8730.2500",
        creditLimit: "3000.0000",
        currency: "USD",
        vosAccountId: "VOS-C002",
        syncStatus: "synced",
      },
      {
        name: "GammaConnect",
        accountType: "client",
        status: "suspended",
        company: "Gamma Connect LLC",
        email: "support@gammaconnect.io",
        phone: "+49-30-123456",
        balance: "-120.0000",
        creditLimit: "1000.0000",
        currency: "USD",
        vosAccountId: "VOS-C003",
        syncStatus: "synced",
      },
      {
        name: "Delta Comms",
        accountType: "client",
        status: "active",
        company: "Delta Communications",
        email: "billing@deltacomms.com",
        phone: "+1-555-0204",
        balance: "22100.0000",
        creditLimit: "10000.0000",
        currency: "USD",
        vosAccountId: "VOS-C004",
        syncStatus: "synced",
      },
    ])
    .returning();

  const supplierAccounts = await db
    .insert(accounts)
    .values([
      {
        name: "Tier1 Routes",
        accountType: "supplier",
        status: "active",
        company: "Tier1 Global Routes",
        email: "noc@tier1routes.com",
        phone: "+1-555-0301",
        balance: "0",
        creditLimit: "0",
        currency: "USD",
        vosAccountId: "VOS-S001",
        syncStatus: "synced",
      },
      {
        name: "PremiumVoIP",
        accountType: "supplier",
        status: "active",
        company: "Premium VoIP Solutions",
        email: "routes@premiumvoip.com",
        phone: "+44-20-1234-5678",
        balance: "0",
        creditLimit: "0",
        currency: "USD",
        vosAccountId: "VOS-S002",
        syncStatus: "synced",
      },
      {
        name: "MegaCarrier",
        accountType: "supplier",
        status: "active",
        company: "MegaCarrier Networks",
        email: "tech@megacarrier.net",
        phone: "+852-2345-6789",
        balance: "0",
        creditLimit: "0",
        currency: "USD",
        vosAccountId: "VOS-S003",
        syncStatus: "synced",
      },
    ])
    .returning();

  // Seed Gateways
  await db.insert(gateways).values([
    {
      accountId: clientAccounts[0].id,
      name: "Alpha-GW1",
      gatewayType: "mapping",
      protocol: "SIP",
      ipAddress: "203.0.113.10",
      port: 5060,
      maxChannels: 60,
      enabled: true,
      vosGatewayId: "GW-M001",
      syncStatus: "synced",
    },
    {
      accountId: clientAccounts[1].id,
      name: "Beta-GW1",
      gatewayType: "mapping",
      protocol: "SIP",
      ipAddress: "203.0.113.20",
      port: 5060,
      maxChannels: 30,
      enabled: true,
      vosGatewayId: "GW-M002",
      syncStatus: "synced",
    },
    {
      accountId: clientAccounts[2].id,
      name: "Gamma-GW1",
      gatewayType: "mapping",
      protocol: "SIP",
      ipAddress: "203.0.113.30",
      port: 5060,
      maxChannels: 20,
      enabled: false,
      vosGatewayId: "GW-M003",
      syncStatus: "synced",
    },
    {
      accountId: clientAccounts[3].id,
      name: "Delta-GW1",
      gatewayType: "mapping",
      protocol: "SIP",
      ipAddress: "203.0.113.40",
      port: 5060,
      maxChannels: 100,
      enabled: true,
      vosGatewayId: "GW-M004",
      syncStatus: "synced",
    },
    {
      accountId: supplierAccounts[0].id,
      name: "Tier1-Route-US",
      gatewayType: "routing",
      protocol: "SIP",
      ipAddress: "198.51.100.10",
      port: 5060,
      prefix: "1",
      maxChannels: 200,
      enabled: true,
      vosGatewayId: "GW-R001",
      syncStatus: "synced",
    },
    {
      accountId: supplierAccounts[1].id,
      name: "Premium-Route-UK",
      gatewayType: "routing",
      protocol: "SIP",
      ipAddress: "198.51.100.20",
      port: 5060,
      prefix: "44",
      maxChannels: 150,
      enabled: true,
      vosGatewayId: "GW-R002",
      syncStatus: "synced",
    },
    {
      accountId: supplierAccounts[2].id,
      name: "Mega-Route-APAC",
      gatewayType: "routing",
      protocol: "SIP",
      ipAddress: "198.51.100.30",
      port: 5060,
      prefix: "86",
      maxChannels: 300,
      enabled: true,
      vosGatewayId: "GW-R003",
      syncStatus: "synced",
    },
  ]);

  // Seed Rate Groups & Rates
  const rg1 = await db
    .insert(rateGroups)
    .values([
      {
        accountId: clientAccounts[0].id,
        name: "Alpha Standard Rates",
        description: "Default rate deck for Alpha Telecom",
        syncStatus: "synced",
      },
      {
        accountId: supplierAccounts[0].id,
        name: "Tier1 Cost Rates",
        description: "Cost rates from Tier1 Routes",
        syncStatus: "synced",
      },
    ])
    .returning();

  await db.insert(rates).values([
    { rateGroupId: rg1[0].id, prefix: "1", destination: "USA", ratePerMin: "0.012000" },
    { rateGroupId: rg1[0].id, prefix: "1212", destination: "USA - New York", ratePerMin: "0.010000" },
    { rateGroupId: rg1[0].id, prefix: "44", destination: "UK Fixed", ratePerMin: "0.015000" },
    { rateGroupId: rg1[0].id, prefix: "447", destination: "UK Mobile", ratePerMin: "0.045000" },
    { rateGroupId: rg1[0].id, prefix: "86", destination: "China", ratePerMin: "0.025000" },
    { rateGroupId: rg1[0].id, prefix: "91", destination: "India", ratePerMin: "0.018000" },
    { rateGroupId: rg1[0].id, prefix: "49", destination: "Germany", ratePerMin: "0.014000" },
    { rateGroupId: rg1[0].id, prefix: "33", destination: "France", ratePerMin: "0.013000" },
    { rateGroupId: rg1[1].id, prefix: "1", destination: "USA", ratePerMin: "0.006000" },
    { rateGroupId: rg1[1].id, prefix: "44", destination: "UK Fixed", ratePerMin: "0.008000" },
    { rateGroupId: rg1[1].id, prefix: "447", destination: "UK Mobile", ratePerMin: "0.028000" },
    { rateGroupId: rg1[1].id, prefix: "86", destination: "China", ratePerMin: "0.015000" },
    { rateGroupId: rg1[1].id, prefix: "91", destination: "India", ratePerMin: "0.010000" },
  ]);

  // Seed CDRs
  const now = new Date();
  const cdrData = [];
  const statuses: Array<"answered" | "failed" | "busy" | "no_answer"> = [
    "answered",
    "answered",
    "answered",
    "answered",
    "answered",
    "answered",
    "answered",
    "failed",
    "busy",
    "no_answer",
  ];
  const destinations = [
    { prefix: "1", dest: "USA", cRate: 0.012, sRate: 0.006 },
    { prefix: "44", dest: "UK Fixed", cRate: 0.015, sRate: 0.008 },
    { prefix: "447", dest: "UK Mobile", cRate: 0.045, sRate: 0.028 },
    { prefix: "86", dest: "China", cRate: 0.025, sRate: 0.015 },
    { prefix: "91", dest: "India", cRate: 0.018, sRate: 0.01 },
    { prefix: "49", dest: "Germany", cRate: 0.014, sRate: 0.007 },
  ];

  for (let i = 0; i < 100; i++) {
    const status = statuses[i % statuses.length];
    const dest = destinations[i % destinations.length];
    const clientIdx = i % clientAccounts.length;
    const supplierIdx = i % supplierAccounts.length;
    const duration = status === "answered" ? 30 + Math.floor(i * 3.7) % 600 : 0;
    const billedDuration = duration;
    const clientCost = parseFloat((duration / 60 * dest.cRate).toFixed(4));
    const supplierCost = parseFloat((duration / 60 * dest.sRate).toFixed(4));
    const margin = parseFloat((clientCost - supplierCost).toFixed(4));
    const startTime = new Date(
      now.getTime() - (100 - i) * 15 * 60000 - Math.floor(Math.random() * 300000)
    );
    const sipCode = status === "answered" ? 200 : status === "busy" ? 486 : status === "failed" ? 503 : 480;

    cdrData.push({
      callId: `CALL-${String(10000 + i)}`,
      callerNumber: `1555${String(1000 + (i * 7) % 9000).padStart(4, "0")}`,
      calledNumber: `${dest.prefix}${String(
        20000000 + ((i * 13) % 80000000)
      )}`,
      clientAccountId: clientAccounts[clientIdx].id,
      supplierAccountId: supplierAccounts[supplierIdx].id,
      startTime,
      connectTime: status === "answered" ? new Date(startTime.getTime() + 3000) : null,
      endTime: new Date(startTime.getTime() + (duration + 3) * 1000),
      duration,
      billedDuration,
      status,
      sipCode,
      clientRate: String(dest.cRate),
      clientCost: String(clientCost),
      supplierRate: String(dest.sRate),
      supplierCost: String(supplierCost),
      margin: String(margin),
      prefix: dest.prefix,
      destination: dest.dest,
    });
  }

  await db.insert(cdrs).values(cdrData);

  // Seed Alerts
  await db.insert(systemAlerts).values([
    {
      alertType: "balance",
      severity: "warning",
      title: "Low Balance Alert",
      message:
        "GammaConnect balance has dropped below the credit limit threshold.",
      accountId: clientAccounts[2].id,
      acknowledged: false,
    },
    {
      alertType: "sync",
      severity: "info",
      title: "Rate Sync Complete",
      message: "Alpha Standard Rates successfully synced to VOS3000.",
      accountId: clientAccounts[0].id,
      acknowledged: true,
    },
    {
      alertType: "gateway",
      severity: "error",
      title: "Gateway Unreachable",
      message: "Gamma-GW1 (203.0.113.30) has been unreachable for 15 minutes.",
      accountId: clientAccounts[2].id,
      acknowledged: false,
    },
    {
      alertType: "quality",
      severity: "warning",
      title: "ASR Drop Detected",
      message: "Tier1 Routes US route ASR dropped below 40% in the last hour.",
      accountId: supplierAccounts[0].id,
      acknowledged: false,
    },
  ]);

  // Seed Sync Log
  await db.insert(syncLog).values([
    {
      entityType: "account",
      entityId: clientAccounts[0].id,
      operation: "create",
      status: "synced",
      request: JSON.stringify({ type: "General", name: "Alpha Telecom" }),
      response: JSON.stringify({ success: true, vosId: "VOS-C001" }),
    },
    {
      entityType: "rate_group",
      entityId: rg1[0].id,
      operation: "create",
      status: "synced",
      request: JSON.stringify({ name: "Alpha Standard Rates", rates: 8 }),
      response: JSON.stringify({ success: true }),
    },
    {
      entityType: "gateway",
      entityId: 1,
      operation: "create",
      status: "synced",
      request: JSON.stringify({
        type: "mapping",
        ip: "203.0.113.10",
        port: 5060,
      }),
      response: JSON.stringify({ success: true, vosId: "GW-M001" }),
    },
    {
      entityType: "account",
      entityId: clientAccounts[2].id,
      operation: "update",
      status: "failed",
      request: JSON.stringify({ action: "suspend" }),
      errorMessage: "VOS3000 API timeout after 30s",
    },
  ]);
}
