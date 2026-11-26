import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { runMonthlyBilling } from "@/lib/invoices";

// Monthly invoicing of API usage. The job can run daily (Canner schedules it);
// it only ever charges usage from BEFORE the start of the current month
// (America/Toronto), so in practice it charges once, on the 1st, for the month
// just ended, and retries anything that failed on the days after.
//
// A customer's first order is not handled here: it is charged up front, inside
// POST /api/v1/letters, before the letter is accepted (see lib/invoices.ts).
export async function POST(req: Request) {
  // Canner scheduled jobs send an arbitrary header set; `x-cron-key` is the
  // documented convention. The Authorization form is what the old Vercel cron
  // used and is accepted during the cutover.
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await runMonthlyBilling();
  return NextResponse.json({ ok: true, results });
}
