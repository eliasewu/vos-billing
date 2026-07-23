import PDFDocument from "pdfkit";

export interface InvoiceCustomer {
  id: number;
  account: string;
  name: string;
  balance: number;
  creditLimit: number;
  rateGroupId: number;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  bankAccount?: string;
}

export interface InvoiceData {
  customer: InvoiceCustomer;
  invoice: {
    invoiceNumber: string;
    startDate: string;
    endDate: string;
    calls: number;
    totalDuration: number;
    totalCost: number;
    increment: number;
    items: Array<{
      callee: string;
      startTime: string;
      duration: number;
      rateUsed: number;
      charge: number;
    }>;
    areaSummary: Array<{
      prefix: string;
      areacode: string;
      areaName: string;
      calls: number;
      totalDuration: number;
      totalCost: number;
    }>;
    partitions: number;
  };
  createdBy: string;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatMoney(v: number): string {
  return `$${v.toFixed(4)}`;
}

export function generateInvoicePDF(data: InvoiceData): PDFKit.PDFDocument {
  const { customer, invoice, createdBy } = data;
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  const primaryColor = "#2563eb";
  const grayColor = "#6b7280";
  const darkColor = "#111827";
  const lightBg = "#f9fafb";

  // ─── Header Bar ───
  doc.rect(0, 0, doc.page.width, 110).fill(primaryColor);
  doc.fill("#ffffff").fontSize(28).font("Helvetica-Bold").text("INVOICE", 50, 30);
  doc.fontSize(11).font("Helvetica").text(`# ${invoice.invoiceNumber}`, 50, 65);
  doc.fontSize(9).text(`Period: ${invoice.startDate} → ${invoice.endDate}`, 50, 82);

  // ─── Company / From Info ───
  doc.fill(darkColor).fontSize(11).font("Helvetica-Bold").text("From:", 380, 30, { width: 170, align: "right" });
  doc.fontSize(9).font("Helvetica").fill(grayColor);
  if (createdBy) doc.text(createdBy, 380, 47, { width: 170, align: "right" });
  doc.text("Net2App VOS Billing System", 380, createdBy ? 62 : 47, { width: 170, align: "right" });
  doc.text("Generated: " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }), 380, createdBy ? 77 : 62, { width: 170, align: "right" });

  // ─── Bill To Section ───
  let y = 130;
  doc.fill(darkColor).fontSize(12).font("Helvetica-Bold").text("Bill To:", 50, y);
  y += 20;
  doc.fontSize(11).font("Helvetica-Bold").text(customer.name, 50, y);
  y += 16;
  doc.fontSize(9).font("Helvetica").fill(grayColor);
  doc.text(`Account: ${customer.account}`, 50, y);
  y += 14;

  if (customer.company) { doc.text(`Company: ${customer.company}`, 50, y); y += 14; }
  if (customer.address) { doc.text(`Address: ${customer.address}`, 50, y); y += 14; }
  if (customer.phone) { doc.text(`Phone: ${customer.phone}`, 50, y); y += 14; }
  if (customer.email) { doc.text(`Email: ${customer.email}`, 50, y); y += 14; }
  if (customer.bankAccount) { doc.text(`Bank: ${customer.bankAccount}`, 50, y); y += 14; }

  // ─── Account Summary Box ───
  y = Math.max(y + 10, 220);
  const boxX = 350;
  const boxW = 210;
  doc.rect(boxX, y, boxW, 80).stroke(grayColor).fill(lightBg).rect(boxX, y, boxW, 80).fill(lightBg);
  doc.fill(darkColor).fontSize(10).font("Helvetica-Bold");
  doc.text("Account Summary", boxX + 10, y + 8, { width: boxW - 20 });
  doc.fontSize(9).font("Helvetica").fill(grayColor);
  doc.text(`Current Balance:`, boxX + 10, y + 26);
  doc.text(`Credit Limit:`, boxX + 10, y + 44);
  doc.text(`Invoice Total:`, boxX + 10, y + 62);
  doc.font("Helvetica-Bold").fill(darkColor);
  doc.text(formatMoney(customer.balance), boxX + 100, y + 26);
  doc.text(`$${customer.creditLimit.toFixed(2)}`, boxX + 100, y + 44);
  doc.fill(primaryColor).text(formatMoney(invoice.totalCost), boxX + 100, y + 62);

  // ─── Summary Cards Row ───
  y = Math.max(y + 100, 310);
  const cards = [
    { label: "Total Calls", value: invoice.calls.toLocaleString() },
    { label: "Total Duration", value: formatDuration(invoice.totalDuration) },
    { label: "Billing Increment", value: `${invoice.increment}s` },
    { label: "CDR Partitions", value: String(invoice.partitions) },
  ];
  const cardW = (doc.page.width - 100) / 4;
  cards.forEach((card, i) => {
    const cx = 50 + i * (cardW + 5);
    doc.rect(cx, y, cardW, 42).stroke(grayColor).fill(lightBg).rect(cx, y, cardW, 42).fill(lightBg);
    doc.fill(grayColor).fontSize(7).font("Helvetica").text(card.label.toUpperCase(), cx + 6, y + 8, { width: cardW - 12, align: "center" });
    doc.fill(darkColor).fontSize(12).font("Helvetica-Bold").text(card.value, cx + 6, y + 20, { width: cardW - 12, align: "center" });
  });

  // ─── Area / Prefix Summary Table ───
  if (invoice.areaSummary && invoice.areaSummary.length > 0) {
    y += 60;
    if (y > doc.page.height - 80) { doc.addPage(); y = 50; }

    doc.fill(primaryColor).fontSize(10).font("Helvetica-Bold");
    doc.text("Summary by Area Code / Prefix", 50, y);
    y += 18;

    const sumCols = ["Prefix", "Area Code", "Area Name", "Calls", "Minutes", "Amount"];
    const sumWidths = [70, 70, 130, 50, 70, 80];
    const sumTotalW = sumWidths.reduce((a, b) => a + b, 0);

    // Table header
    doc.rect(50, y, sumTotalW, 18).fill(primaryColor);
    doc.fill("#ffffff").fontSize(7).font("Helvetica-Bold");
    let sx = 50;
    sumCols.forEach((h, i) => {
      doc.text(h, sx + 3, y + 4, { width: sumWidths[i] - 4, align: i >= 3 ? "right" : "left" });
      sx += sumWidths[i];
    });
    y += 18;

    // Table rows
    doc.fontSize(7).font("Helvetica").fill(darkColor);
    invoice.areaSummary.forEach((s, idx) => {
      if (y > doc.page.height - 50) { doc.addPage(); y = 50; }
      const rowBg = idx % 2 === 0 ? lightBg : "#ffffff";
      doc.rect(50, y, sumTotalW, 16).fill(rowBg);
      sx = 50;
      const vals = [
        s.prefix || "—",
        s.areacode || "—",
        s.areaName || "—",
        String(s.calls),
        formatDuration(s.totalDuration),
        formatMoney(s.totalCost),
      ];
      vals.forEach((v, i) => {
        doc.text(v, sx + 3, y + 3, { width: sumWidths[i] - 6, align: i >= 3 ? "right" : "left" });
        sx += sumWidths[i];
      });
      y += 16;
    });

    // Summary total row
    doc.rect(50, y, sumTotalW, 16).fill(primaryColor);
    doc.fill("#ffffff").fontSize(7).font("Helvetica-Bold");
    doc.text("TOTAL", 53, y + 3, { width: sumWidths[0] + sumWidths[1] + sumWidths[2] - 6 });
    doc.text(String(invoice.calls), 50 + sumWidths[0] + sumWidths[1] + sumWidths[2] + 3, y + 3, { width: sumWidths[3] - 6, align: "right" });
    doc.text(formatDuration(invoice.totalDuration), 50 + sumWidths[0] + sumWidths[1] + sumWidths[2] + sumWidths[3] + 3, y + 3, { width: sumWidths[4] - 6, align: "right" });
    doc.text(formatMoney(invoice.totalCost), 50 + sumTotalW - sumWidths[5] + 3, y + 3, { width: sumWidths[5] - 6, align: "right" });
    y += 22;
  }

  // ─── CDR Items Table ───
  y += 18;
  const colHeaders = ["#", "Called Number", "Start Time", "Duration", "Rate/Min", "Charge"];
  const colWidths = [28, 130, 130, 70, 70, 82];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableX = 50;

  // Check if we need a new page for the table
  if (y > doc.page.height - 100) { doc.addPage(); y = 50; }

  // Table header
  doc.rect(tableX, y, tableWidth, 22).fill(primaryColor);
  doc.fill("#ffffff").fontSize(8).font("Helvetica-Bold");
  let cx = tableX;
  colHeaders.forEach((h, i) => {
    doc.text(h, cx + 4, y + 6, { width: colWidths[i] - 4, align: i >= 3 ? "right" : "left" });
    cx += colWidths[i];
  });
  y += 22;

  // Table rows
  const maxItems = 40; // fit on one page
  const items = invoice.items.slice(0, maxItems);
  doc.fontSize(7.5).font("Helvetica").fill(darkColor);

  items.forEach((item, idx) => {
    if (y > doc.page.height - 50) { doc.addPage(); y = 50; }

    const rowBg = idx % 2 === 0 ? lightBg : "#ffffff";
    doc.rect(tableX, y, tableWidth, 18).fill(rowBg);

    cx = tableX;
    const values = [
      String(idx + 1),
      item.callee || "—",
      item.startTime ? new Date(item.startTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
      formatDuration(item.duration),
      `$${item.rateUsed.toFixed(4)}`,
      `$${item.charge.toFixed(6)}`,
    ];

    values.forEach((v, i) => {
      const align = i >= 3 ? "right" : "left";
      doc.text(v, cx + 4, y + 4, { width: colWidths[i] - 8, align });
      cx += colWidths[i];
    });
    y += 18;
  });

  // Total row
  doc.rect(tableX, y, tableWidth, 22).fill(primaryColor);
  doc.fill("#ffffff").fontSize(9).font("Helvetica-Bold");
  doc.text("TOTAL", tableX + 8, y + 5, { width: tableWidth - 120 });
  doc.text(formatMoney(invoice.totalCost), tableX + tableWidth - 90, y + 5, { width: 82, align: "right" });
  y += 30;

  if (invoice.calls > maxItems) {
    doc.fill(grayColor).fontSize(8).font("Helvetica");
    doc.text(`Showing ${maxItems} of ${invoice.calls} calls. Download full CSV for complete data.`, tableX, y);
    y += 16;
  }

  // ─── Footer ───
  y = doc.page.height - 60;
  doc.strokeColor(grayColor).moveTo(50, y).lineTo(doc.page.width - 50, y).stroke();
  y += 12;
  doc.fill(grayColor).fontSize(8).font("Helvetica");
  doc.text(`Invoice #${invoice.invoiceNumber} | Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 50, y, { width: doc.page.width - 100, align: "center" });
  doc.text("Net2App VOS Billing System — Automated Invoice", 50, y + 14, { width: doc.page.width - 100, align: "center" });

  return doc;
}
