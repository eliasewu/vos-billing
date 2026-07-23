// Next.js Instrumentation — runs once on server startup
// Auto-starts the invoice scheduler (Monday 11:00 AM) and daily usage summary (4:00 AM)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startInvoiceScheduler, startDailySummaryScheduler, startLowBalanceScheduler } = await import("./lib/invoice-scheduler");
    startDailySummaryScheduler();
    startLowBalanceScheduler();
    startInvoiceScheduler();
    console.log("[Instrumentation] Schedulers auto-started: daily summary + low-balance alerts + weekly invoice");
  }
}
