import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import { sendNewAccountEmail } from "@/lib/email";
import crypto from "crypto";

// Password generation (matching VOS3000 MD5 convention)
function md5(s: string) { return crypto.createHash("md5").update(s).digest("hex"); }

// ─── CLIENT WIZARD ───
// Creates: rate group → rates → general account → mapping gateway → CDR auth

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const mode = body.mode as string; // "client" | "supplier"

    if (!mode || !["client", "supplier"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode. Use 'client' or 'supplier'." }, { status: 400 });
    }

    // ─── Step 1: Create Rate Group ───
    const rateGroupName = body.rateGroupName?.trim() || `${mode === "client" ? "Client" : "Supplier"}_${Date.now()}`;
    const fakeMinute = body.fakeMinute ?? body.billingIncrement ?? 60;

    const rateGroupResult = await executeVos(
      "INSERT INTO e_feerategroup (name, fakeminute, isprivate, memo) VALUES (?, ?, ?, ?)",
      [rateGroupName, Number(fakeMinute), 0, `Quick-start ${mode} setup`]
    );
    const rateGroupId = (rateGroupResult as any).insertId;

    // ─── Step 2: Create Rates ───
    const prefix = body.prefix?.trim() || "";
    const areacode = body.areacode?.trim() || "";
    const fee = Number(body.fee) || 0.01;
    const tax = Number(body.tax) || 0;
    const period = Number(body.period) || 60;
    let rateId = 0;

    if (prefix) {
      const rateResult = await executeVos(
        "INSERT INTO e_feerate (feerategroup_id, feeprefix, areacode, locktype, fee, tax, period, ivrfee, ivrperiod, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [rateGroupId, prefix, areacode, 0, fee, tax, period, 0, 0, 0]
      );
      rateId = (rateResult as any).insertId;
    }

    // ─── Step 3: Create Account ───
    const [maxCust] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_customer");
    const customerId = Number(maxCust?.next_id || 1);
    const now = Math.floor(Date.now() / 1000);
    const accountName = body.accountName?.trim() || `${mode}_${Date.now()}`;
    const accountId = body.account?.trim() || `QS${Date.now()}`;
    const accountPassword = body.password?.trim() || "pass123";
    const email = body.email?.trim() || "";
    const money = Number(body.money) || 0;
    const limitMoney = Number(body.limitMoney) || 0;
    const accountType = mode === "client" ? 0 : 1; // 0=General, 1=Clearing

    // Build contact JSON for memo
    const contact: Record<string, string> = {};
    if (body.company) contact.company = String(body.company).trim();
    if (body.phone) contact.phone = String(body.phone).trim();
    if (body.address) contact.address = String(body.address).trim();
    const memoStr = Object.keys(contact).length > 0 ? JSON.stringify(contact) : "";

    await executeVos(
      `INSERT INTO e_customer (id, customer_id, account, name, money, limitmoney, type, status,
        starttime, lastupdatetime, feerategroup_id, feerategroupprivate_id, alarmemail, memo, locktype)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [customerId, customerId, accountId, accountName, money, limitMoney, accountType, 1,
        now, now, rateGroupId, 0, email, memoStr]
    );

    // ─── Step 4: Create Gateway ───
    const gatewayName = body.gatewayName?.trim() || `${accountName}_GW`;
    const gatewayIp = body.gatewayIp?.trim() || "0.0.0.0";
    const gatewayPort = Number(body.gatewayPort) || 5060;
    const gatewayCapacity = Number(body.gatewayCapacity) || 30;
    const gatewayPassword = body.gatewayPassword?.trim() || md5(accountId + "vos");
    const cdrUsername = body.cdrUsername?.trim() || gatewayName;
    const cdrPassword = body.cdrPassword?.trim() || gatewayPassword;
    const remoteIps = `${gatewayIp}:${gatewayPort}`;

    let gatewayId = 0;

    try {
    if (mode === "client") {
      // Mapping gateway (inbound from customer)
      const [maxGw] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_gatewaymapping");
      gatewayId = Number(maxGw?.next_id || 1);

      await executeVos(
        `INSERT INTO e_gatewaymapping (id, name, password, customerpassword, locktype, calllevel, capacity,
          priority, registertype, remoteips, rtpforwardtype, gatewaygroups, routinggatewaygroups, memo, customer_id, mbx_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [gatewayId, gatewayName, gatewayPassword, gatewayPassword, 0, 0, gatewayCapacity,
          1, 0, remoteIps, 0, "", "", "", customerId, 0]
      );

      // Create mapping settings row
      try {
        await executeVos("INSERT INTO e_gatewaymappingsetting (gatewaymapping_id) VALUES (?)", [gatewayId]);
      } catch {}

      // ─── Step 5: Create CDR Auth (e_account_auth) ───
      await executeVos(
        "INSERT INTO e_account_auth (customer_id, username, password, web_access, memo) VALUES (?, ?, MD5(?), ?, ?)",
        [customerId, cdrUsername, cdrPassword, 1, `Quick-start auth for ${accountName}`]
      );
    } else {
      // Routing gateway (outbound to supplier)
      const [maxGw] = await queryVos<any>("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM e_gatewayrouting");
      gatewayId = Number(maxGw?.next_id || 1);

      const allowedPrefix = body.allowedPrefix?.trim() || "";
      const rewriteCallee = body.rewriteCallee?.trim() || "";
      const rewriteCaller = body.rewriteCaller?.trim() || "";
      const protocol = Number(body.protocol) || 0;

      await executeVos(
        `INSERT INTO e_gatewayrouting (id, name, prefix, prefixstyle, password, customerpassword, locktype,
          calllevel, capacity, priority, iptype, encrypt, protocol, remoteips, rtpforwardtype, signalport,
          signalportlocal, gatewaygroups, memo, mbx_id, clearingcustomer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [gatewayId, gatewayName, allowedPrefix, 0, gatewayPassword, gatewayPassword, 0,
          0, gatewayCapacity, 1, 0, 0, protocol, remoteIps, 0, gatewayPort,
          gatewayPort, "", "", 0, customerId]
      );

      // Create routing settings with dial plan
      try {
        await executeVos(
          `INSERT INTO e_gatewayroutingsetting (gatewayrouting_id, rewriterulesincallee, rewriterulesincaller,
            callincallerprefixesallow, callincalleeprefixesallow)
           VALUES (?, ?, ?, ?, ?)`,
          [gatewayId, rewriteCallee, rewriteCaller, 1, 1]
        );
      } catch (settingsErr) {
        // Fallback: insert without dial plan fields
        try {
          await executeVos("INSERT INTO e_gatewayroutingsetting (gatewayrouting_id) VALUES (?)", [gatewayId]);
        } catch {}
      }
    }
    } catch (gwErr: any) {
      // Rollback: delete orphaned customer and rate group on gateway failure
      console.error("[QuickStart] Gateway creation failed, rolling back:", gwErr.message);
      try { await executeVos("DELETE FROM e_customer WHERE id = ?", [customerId]); } catch {}
      try { await executeVos("DELETE FROM e_feerate WHERE feerategroup_id = ?", [rateGroupId]); } catch {}
      try { await executeVos("DELETE FROM e_feerategroup WHERE id = ?", [rateGroupId]); } catch {}
      return NextResponse.json(
        { error: "Gateway creation failed; account and rate group rolled back", detail: gwErr?.message || "" },
        { status: 500 }
      );
    }

    // ─── Auto-send CDR credentials email for client mode (fire-and-forget) ───
    if (mode === "client" && email) {
      void (async () => {
        try {
          await sendNewAccountEmail(email, accountName, accountId, cdrUsername, cdrPassword);
        } catch (e) { console.error("[QuickStart] Failed to send welcome email:", e); }
      })();
    }

    return NextResponse.json({
      success: true,
      mode,
      created: {
        rateGroup: { id: rateGroupId, name: rateGroupName },
        rate: rateId > 0 ? { id: rateId, prefix, fee } : null,
        account: { id: customerId, name: accountName, account: accountId, type: accountType },
        gateway: { id: gatewayId, name: gatewayName, ip: gatewayIp, type: mode === "client" ? "mapping" : "routing" },
        ...(mode === "client" ? { cdrAuth: { username: cdrUsername } } : {}),
      },
      message: `${mode === "client" ? "Client" : "Supplier"} setup complete! Account: ${accountId}`,
    });
  } catch (e: any) {
    console.error("[QuickStart] Error:", e);
    return NextResponse.json(
      { error: e?.message || "Quick-start setup failed", detail: e?.sqlMessage || "" },
      { status: 500 }
    );
  }
}
