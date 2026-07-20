import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

// Generate random PIN of given length
function generatePin(length: number): string {
  let pin = "";
  for (let i = 0; i < length; i++) pin += Math.floor(Math.random() * 10).toString();
  return pin;
}

// Generate random serial number: prefix + random digits
function generateSerial(prefix: string, totalLength: number): string {
  const remaining = totalLength - prefix.length;
  let serial = prefix;
  for (let i = 0; i < remaining; i++) serial += Math.floor(Math.random() * 10).toString();
  return serial;
}

// GET: list available card suites for the batch form
// POST: batch generate cards
export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { suiteId, quantity, faceValue } = body;

    if (!suiteId || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Suite ID and quantity (min 1) are required" }, { status: 400 });
    }
    if (quantity > 1000) {
      return NextResponse.json({ error: "Maximum 1000 cards per batch" }, { status: 400 });
    }

    // Get suite configuration
    const [suite] = await queryVos<any>(
      "SELECT name, prefix, pin_length, face_value, expire_days FROM e_card_suite WHERE id = ?",
      [suiteId]
    ) as any[];

    if (!suite) {
      return NextResponse.json({ error: "Card suite not found" }, { status: 404 });
    }

    const prefix = suite.prefix || "";
    const pinLength = suite.pin_length || 10;
    const value = faceValue ?? suite.face_value ?? 10;
    const expireDays = suite.expire_days || 90;
    const suiteName = suite.name || "";

    // Calculate expiry timestamp (Unix timestamp in seconds)
    const expireTime = Math.floor(Date.now() / 1000) + expireDays * 86400;

    // Generate cards in a transaction
    const generated: any[] = [];
    const pinSet = new Set<string>();
    const serialSet = new Set<string>();

    for (let i = 0; i < quantity; i++) {
      let pin: string, serial: string;
      // Ensure unique PIN
      do { pin = generatePin(pinLength); } while (pinSet.has(pin));
      pinSet.add(pin);
      // Ensure unique serial
      do { serial = generateSerial(prefix, 16); } while (serialSet.has(serial));
      serialSet.add(serial);

      try {
        await executeVos(
          "INSERT INTO e_phonecard (serialno, pin, money, limitmoney, expiretime, suitename, agentaccount, sold) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
          [serial, pin, value, value, expireTime, suiteName, ""]
        );
        generated.push({ serialNo: serial, pin, money: value, suiteName });
      } catch (e: any) {
        // If duplicate key error, skip and continue
        if (e?.code === "ER_DUP_ENTRY") continue;
        throw e;
      }
    }

    return NextResponse.json({
      success: true,
      generated: generated.length,
      requested: quantity,
      suiteName,
      cards: generated.slice(0, 50), // Return first 50 for display
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Batch generation failed" }, { status: 500 });
  }
}
