import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { retryDueDeliveries } from "@/lib/webhooks";
import { advanceDueTestLetters } from "@/lib/test-letters";

// Every few minutes (Canner scheduled job, header x-cron-key): retry webhook
// deliveries that failed and are due. Backoff is 1 min, 5 min, 30 min, 2 h, 6 h,
// 24 h; after the seventh failed attempt a delivery is marked failed.
export async function POST(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // First let test letters reach their next step (firing their webhooks), then retry whatever is due.
  const advanced = await advanceDueTestLetters();
  const r = await retryDueDeliveries();
  return NextResponse.json({ ok: true, testLettersAdvanced: advanced, ...r });
}
