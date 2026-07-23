import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const to = String(body.to || "").trim();

    if (!to) {
      return NextResponse.json({ success: false, message: "Email address is required" }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ success: false, message: "Invalid email address format" }, { status: 400 });
    }

    const now = new Date().toLocaleString("en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <div style="text-align:center;margin-bottom:20px">
          <div style="width:56px;height:56px;border-radius:50%;background:#dcfce7;display:inline-flex;align-items:center;justify-content:center">
            <span style="font-size:28px">✅</span>
          </div>
        </div>
        <h2 style="color:#16a34a;text-align:center;margin:0 0 8px">Email Test Successful!</h2>
        <p style="text-align:center;color:#6b7280;margin:0 0 20px">
          Your SMTP configuration is working correctly.
        </p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:0 0 16px">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:6px 8px;color:#374151;font-weight:bold;font-size:13px">To:</td>
              <td style="padding:6px 8px;font-size:13px;font-family:monospace">${to}</td>
            </tr>
            <tr>
              <td style="padding:6px 8px;color:#374151;font-weight:bold;font-size:13px">Sent at:</td>
              <td style="padding:6px 8px;font-size:13px">${now}</td>
            </tr>
            <tr>
              <td style="padding:6px 8px;color:#374151;font-weight:bold;font-size:13px">System:</td>
              <td style="padding:6px 8px;font-size:13px">Net2App VOS Billing</td>
            </tr>
          </table>
        </div>
        <hr style="border:1px solid #e5e7eb;margin:16px 0" />
        <p style="color:#9ca3af;font-size:11px;text-align:center">
          This is an automated test email from Net2App VOS Billing System.<br />
          If you received this, your email delivery is working properly.
        </p>
      </div>
    `;

    const result = await sendEmail(to, "Test Email — Net2App VOS Billing", html);

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send test email";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
