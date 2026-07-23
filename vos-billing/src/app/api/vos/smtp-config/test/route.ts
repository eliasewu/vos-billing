import { NextRequest, NextResponse } from "next/server";
import { queryVos } from "@/lib/vos-db";
import { verifySession } from "@/lib/auth";
import nodemailer from "nodemailer";

// POST: send a test email using the configured SMTP settings
export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const to = body.to || "";

    // Load SMTP config from sysparam
    const rows = await queryVos<any>(
      "SELECT param_name, param_value FROM e_sysparam WHERE param_name IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from','smtp_secure')",
    );
    const cfg: Record<string, string> = {};
    for (const r of rows as any[]) cfg[r.param_name] = r.param_value || "";

    if (!cfg.smtp_host) {
      return NextResponse.json({ success: false, message: "SMTP host not configured" });
    }

    const secure = cfg.smtp_secure === "ssl";
    const port = parseInt(cfg.smtp_port || "587");

    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port,
      secure,
      auth: cfg.smtp_user ? { user: cfg.smtp_user, pass: cfg.smtp_pass } : undefined,
      tls: cfg.smtp_secure !== "false" ? { rejectUnauthorized: false } : undefined,
    });

    await transporter.sendMail({
      from: cfg.smtp_from || cfg.smtp_user || "noreply@vos-billing.local",
      to: to || cfg.smtp_from || cfg.smtp_user,
      subject: "VOS Billing — SMTP Test Email",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#2563eb">VOS Billing — SMTP Test</h2>
          <p>This is a test email to verify your SMTP configuration.</p>
          <p>Host: ${cfg.smtp_host}:${port}</p>
          <p>Sent at: ${new Date().toISOString()}</p>
          <hr style="border:1px solid #e5e7eb" />
          <p style="color:#6b7280;font-size:12px">Net2App VOS Billing System</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: `Test email sent successfully to ${to || cfg.smtp_user}` });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : "Failed to send test email" });
  }
}
