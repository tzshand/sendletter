import { NextResponse } from "next/server";
import { Resend } from "resend";
import { cronAuthorized } from "@/lib/cron-auth";
import { previewMonthlyBilling, runMonthlyBilling } from "@/lib/invoices";
import { escapeHtml } from "@/lib/sanitize";

const INTERNAL_EMAIL = "colinh.shand@gmail.com";

// Monthly invoicing of API usage. The job can run daily (Canner schedules it);
// it only ever charges usage from BEFORE the start of the current month
// (America/Toronto), so in practice it charges once, on the 1st, for the month
// just ended, and retries anything that failed on the days after.
//
// A customer's first order is not handled here: it is charged up front, inside
// POST /api/v1/letters, before the letter is accepted (see lib/invoices.ts).
//
//   POST /api/cron/bill?dry_run=1   shows what would be charged and charges nothing.
//
// A failed charge emails the owner. (Charges failed silently for six weeks once,
// because nothing was watching.)
export async function POST(req: Request) {
  // Canner scheduled jobs send an arbitrary header set; `x-cron-key` is the
  // documented convention. The Authorization form is what the old Vercel cron
  // used and is accepted during the cutover.
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (new URL(req.url).searchParams.get("dry_run")) {
    return NextResponse.json({ ok: true, dry_run: true, ...(await previewMonthlyBilling()) });
  }

  const results = await runMonthlyBilling();

  const failed = results.filter((r) => r.status === "failed");
  if (failed.length && process.env.RESEND_API_KEY) {
    try {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: "sendletter <noreply@sendletter.app>",
        to: INTERNAL_EMAIL,
        subject: `sendletter billing: ${failed.length} charge${failed.length === 1 ? "" : "s"} FAILED`,
        html: `<h2>API billing failures</h2><p>These accounts could not be charged. The usage is kept and retried on the next run.</p><ul>${failed
          .map((f) => `<li>account <code>${escapeHtml(f.accountId)}</code>: ${escapeHtml(f.error ?? "unknown error")}${f.amount ? "" : ""}</li>`)
          .join("")}</ul><p>Check the customer's card on their profile, or contact them.</p>`,
      });
    } catch (e) {
      console.error("billing failure email failed:", e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json({ ok: true, results });
}
