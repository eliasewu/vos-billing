import { NextRequest, NextResponse } from "next/server";
import { queryVos, executeVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";

const SMTP_PARAMS = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"];

// GET: return SMTP config as key-value pairs
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await queryVos<any>(
      `SELECT param_name, param_value FROM e_sysparam WHERE param_name IN (${SMTP_PARAMS.map(() => "?").join(",")})`,
      SMTP_PARAMS
    );
    const config: Record<string, string> = {};
    for (const p of SMTP_PARAMS) config[p] = "";
    for (const r of rows as any[]) {
      config[r.param_name] = r.param_value || "";
    }
    return NextResponse.json({ config });
  } catch {
    return NextResponse.json({ error: "Failed to load SMTP config", config: {} }, { status: 500 });
  }
}

// PUT: save SMTP config
export async function PUT(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    for (const param of SMTP_PARAMS) {
      if (body[param] !== undefined) {
        const val = String(body[param] || "");
        const existing = await queryVos<any>("SELECT id FROM e_sysparam WHERE param_name = ?", [param]);
        if ((existing as any[]).length > 0) {
          await executeVos("UPDATE e_sysparam SET param_value = ? WHERE param_name = ?", [val, param]);
        } else {
          await executeVos(
            "INSERT INTO e_sysparam (param_name, param_value, param_type, memo) VALUES (?, ?, 'string', ?)",
            [param, val, `SMTP ${param.replace("smtp_", "")}`]
          );
        }
      }
    }

    return NextResponse.json({ success: true, message: "SMTP configuration saved" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to save" }, { status: 500 });
  }
}
