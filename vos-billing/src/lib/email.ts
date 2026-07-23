import nodemailer from "nodemailer";
import { queryVos } from "@/lib/vos-db";

interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

async function getSmtpSettings(): Promise<SmtpSettings | null> {
  try {
    const rows = await queryVos<any>(
      "SELECT param_name, param_value FROM e_sysparam WHERE param_name IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from','smtp_secure')"
    );
    const cfg: Record<string, string> = {};
    for (const r of rows as any[]) cfg[r.param_name] = r.param_value || "";
    
    if (!cfg.smtp_host) return null;
    
    return {
      host: cfg.smtp_host,
      port: parseInt(cfg.smtp_port || "587"),
      secure: cfg.smtp_secure === "ssl",
      user: cfg.smtp_user || "",
      pass: cfg.smtp_pass || "",
      from: cfg.smtp_from || cfg.smtp_user || "noreply@vos-billing.local",
    };
  } catch {
    return null;
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; message: string }> {
  const settings = await getSmtpSettings();
  if (!settings) {
    return { success: false, message: "SMTP not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
      tls: settings.secure || settings.port === 587 ? { rejectUnauthorized: false } : undefined,
    });

    await transporter.sendMail({
      from: settings.from,
      to,
      subject,
      html,
    });

    return { success: true, message: "Email sent" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to send email" };
  }
}

// ─── New Account Welcome Email (with CDR credentials) ───
export async function sendNewAccountEmail(
  to: string,
  customerName: string,
  accountId: string,
  cdrUsername?: string,
  cdrPassword?: string,
): Promise<{ success: boolean; message: string }> {
  const cdrBlock = cdrUsername
    ? `
      <div style="background:#f0f7ff;padding:16px;border-radius:8px;border-left:4px solid #2563eb;margin:16px 0">
        <h3 style="color:#1e40af;margin:0 0 8px">📞 CDR Access Credentials</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 8px;color:#374151;font-weight:bold">Username:</td>
            <td style="padding:6px 8px;font-family:monospace;font-size:14px">${cdrUsername}</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;color:#374151;font-weight:bold">Password:</td>
            <td style="padding:6px 8px;font-family:monospace;font-size:14px">${cdrPassword}</td>
          </tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin:8px 0 0">Use these credentials to access your CDR data and call records.</p>
      </div>`
    : `<p style="color:#6b7280;font-size:12px">CDR credentials can be set up by the administrator.</p>`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#2563eb">🎉 Welcome to Net2App VOS Billing</h2>
      <p>Dear <strong>${customerName}</strong>,</p>
      <p>Your account has been created successfully!</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f9fafb">
          <td style="padding:10px 12px"><strong>Account ID</strong></td>
          <td style="padding:10px 12px;font-family:monospace">${accountId}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px"><strong>Account Name</strong></td>
          <td style="padding:10px 12px">${customerName}</td>
        </tr>
        <tr style="background:#f9fafb">
          <td style="padding:10px 12px"><strong>Created</strong></td>
          <td style="padding:10px 12px">${new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
        </tr>
      </table>
      ${cdrBlock}
      <hr style="border:1px solid #e5e7eb;margin:20px 0" />
      <p style="color:#6b7280;font-size:12px">Net2App VOS Billing System — Automated Notification</p>
    </div>
  `;

  return sendEmail(to, `Welcome to Net2App VOS Billing — ${customerName}`, html);
}

// ─── Rate Change Notification (with % increase/decrease) ───
export async function sendRateChangeEmail(
  to: string,
  customerName: string,
  rateGroupName: string,
  changes: Array<{
    prefix: string;
    areacode: string;
    areaName: string;
    oldFee: number | null;
    newFee: number;
    percentChange: number | null;
    action: "added" | "updated";
  }>,
): Promise<{ success: boolean; message: string }> {
  const changeRows = changes.map(c => {
    const pct = c.percentChange !== null
      ? `<span style="color:${c.percentChange > 0 ? '#dc2626' : c.percentChange < 0 ? '#16a34a' : '#6b7280'};font-weight:bold">${c.percentChange > 0 ? '+' : ''}${c.percentChange.toFixed(2)}%</span>`
      : '<span style="color:#6b7280">NEW</span>';
    const badge = c.action === "added"
      ? '<span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold">NEW</span>'
      : '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold">UPD</span>';
    const oldFeeStr = c.oldFee !== null ? `$${c.oldFee.toFixed(6)}` : '—';
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${badge} ${c.prefix}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${c.areacode || '—'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${c.areaName || '—'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${oldFeeStr}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold">$${c.newFee.toFixed(6)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${pct}</td>
    </tr>`;
  }).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px">
      <h2 style="color:#2563eb">📊 Rate Change Notification</h2>
      <p>Dear <strong>${customerName}</strong>,</p>
      <p>The following rates in group <strong>${rateGroupName}</strong> have been ${changes.length === 1 ? (changes[0].action === "added" ? "added" : "updated") : "modified"}:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="text-align:left;padding:8px 10px">Prefix</th>
            <th style="text-align:left;padding:8px 10px">Area Code</th>
            <th style="text-align:left;padding:8px 10px">Area</th>
            <th style="text-align:right;padding:8px 10px">Old Rate</th>
            <th style="text-align:right;padding:8px 10px">New Rate</th>
            <th style="text-align:right;padding:8px 10px">Change</th>
          </tr>
        </thead>
        <tbody>${changeRows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px">${changes.length} rate change(s) | Timestamp: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</p>
      <hr style="border:1px solid #e5e7eb;margin:20px 0" />
      <p style="color:#6b7280;font-size:12px">Net2App VOS Billing System — Automated Rate Notification</p>
    </div>
  `;

  return sendEmail(to, `Rate Change — ${rateGroupName} (${changes.length} change${changes.length !== 1 ? 's' : ''})`, html);
}

// Helper to send rate notification email
export async function sendRateEmail(
  to: string,
  type: "client" | "supplier",
  customerName: string,
  rates: Array<{ prefix: string; country: string; operator: string; rate: number }>
): Promise<{ success: boolean; message: string }> {
  const rateRows = rates.map(r =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${r.prefix}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${r.country}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${r.operator}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${r.rate.toFixed(6)}/min</td></tr>`
  ).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#2563eb">Rate Update — ${type === "client" ? "Client" : "Supplier"}: ${customerName}</h2>
      <p>The following rates have been added/updated for your account:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="text-align:left;padding:8px 12px">Prefix</th>
            <th style="text-align:left;padding:8px 12px">Country</th>
            <th style="text-align:left;padding:8px 12px">Operator</th>
            <th style="text-align:right;padding:8px 12px">Rate</th>
          </tr>
        </thead>
        <tbody>${rateRows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px">Total: ${rates.length} rate(s) | ${new Date().toISOString().slice(0, 10)}</p>
      <hr style="border:1px solid #e5e7eb;margin:20px 0" />
      <p style="color:#6b7280;font-size:12px">Net2App VOS Billing System — Automated Rate Notification</p>
    </div>
  `;

  return sendEmail(to, `Rate Update — ${customerName}`, html);
}

// ─── Low Balance Alert ───
export async function sendLowBalanceAlert(
  to: string,
  customerName: string,
  account: string,
  balance: number,
  creditLimit: number,
  type: "negative" | "below_limit"
): Promise<{ success: boolean; message: string }> {
  const isCritical = type === "negative";
  const severityColor = isCritical ? "#dc2626" : "#d97706";
  const severityBg = isCritical ? "#fef2f2" : "#fffbeb";
  const severityBorder = isCritical ? "#dc2626" : "#d97706";
  const severityLabel = isCritical ? "CRITICAL — Negative Balance" : "WARNING — Balance Below Limit";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:${severityColor}">⚠️ ${severityLabel}</h2>
      <p>Dear <strong>${customerName}</strong>,</p>
      <p>Your account requires immediate attention:</p>
      <div style="background:${severityBg};padding:16px;border-radius:8px;border-left:4px solid ${severityBorder};margin:16px 0">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 8px;color:#374151;font-weight:bold">Account:</td>
            <td style="padding:6px 8px;font-family:monospace;font-size:14px">${account}</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;color:#374151;font-weight:bold">Current Balance:</td>
            <td style="padding:6px 8px;font-size:18px;font-weight:bold;color:${isCritical ? "#dc2626" : "#d97706"}">${balance < 0 ? "-" : ""}$${Math.abs(balance).toFixed(4)}</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;color:#374151;font-weight:bold">Credit Limit:</td>
            <td style="padding:6px 8px">$${creditLimit.toFixed(4)}</td>
          </tr>
          ${!isCritical ? `<tr>
            <td style="padding:6px 8px;color:#374151;font-weight:bold">Remaining:</td>
            <td style="padding:6px 8px;color:#d97706;font-weight:bold">$${(creditLimit - Math.max(0, balance)).toFixed(4)}</td>
          </tr>` : ""}
        </table>
      </div>
      <p>${isCritical
        ? "Your account is in <strong>debt</strong>. Please top up your balance immediately to avoid service interruption."
        : `Your balance is below your credit limit. Please top up to maintain uninterrupted service.`
      }</p>
      <p style="color:#6b7280;font-size:12px">
        Alert generated: ${new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
      <hr style="border:1px solid #e5e7eb;margin:20px 0" />
      <p style="color:#6b7280;font-size:12px">Net2App VOS Billing System — Automated Balance Alert</p>
    </div>
  `;

  return sendEmail(to, `${isCritical ? "URGENT: " : ""}Low Balance Alert — ${customerName} (${account})`, html);
}

// Send invoice email with PDF attachment
export async function sendInvoiceEmail(
  to: string,
  customerName: string,
  invoiceNumber: string,
  startDate: string,
  endDate: string,
  pdfBuffer: Buffer,
  summary: { calls: number; totalDuration: string; totalCost: string }
): Promise<{ success: boolean; message: string }> {
  const settings = await getSmtpSettings();
  if (!settings) {
    return { success: false, message: "SMTP not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
      tls: settings.secure || settings.port === 587 ? { rejectUnauthorized: false } : undefined,
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#2563eb">Invoice — ${customerName}</h2>
        <p>Dear ${customerName},</p>
        <p>Please find attached your invoice for the period:</p>
        <p style="font-size:16px;background:#f0f7ff;padding:12px;border-radius:8px;border-left:4px solid #2563eb">
          <strong>${startDate}</strong> → <strong>${endDate}</strong>
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="background:#f9fafb">
            <td style="padding:10px 12px"><strong>Total Calls</strong></td>
            <td style="padding:10px 12px;text-align:right">${summary.calls.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px"><strong>Total Duration</strong></td>
            <td style="padding:10px 12px;text-align:right">${summary.totalDuration}</td>
          </tr>
          <tr style="background:#f9fafb">
            <td style="padding:10px 12px"><strong>Total Amount</strong></td>
            <td style="padding:10px 12px;text-align:right;font-size:18px;font-weight:bold;color:#16a34a">${summary.totalCost}</td>
          </tr>
        </table>
        <p style="color:#6b7280;font-size:12px">Invoice #${invoiceNumber} — Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        <hr style="border:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#6b7280;font-size:12px">Net2App VOS Billing System — Automated Invoice</p>
      </div>
    `;

    await transporter.sendMail({
      from: settings.from,
      to,
      subject: `Invoice ${invoiceNumber} — ${customerName} (${startDate} to ${endDate})`,
      html,
      attachments: [{
        filename: `invoice_${invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      }],
    });

    return { success: true, message: "Invoice emailed successfully" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to send email" };
  }
}
