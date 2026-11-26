import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { DRAFT_RETENTION_DAYS, DraftStoreError, purgeExpiredDrafts } from "@/lib/draft-store";
import { getDb } from "@/lib/db";
import { purgeExpiredIdempotency } from "@/lib/idempotency";

// Daily: delete staged documents (the customer's letter and its print PDFs) once
// they are DRAFT_RETENTION_DAYS old, and clear the stored letter text on orders
// that old. This is what makes "we delete your letter after 30 days" true.
// Deleted files sit in Canner's recoverable bin for a further period before they
// are gone for good. The order itself (addresses, price, status) is kept.
export async function POST(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Housekeeping that has nothing to do with the files store: expired idempotency
  // keys (kept 7 days) and webhook history older than 30 days. A failure here must
  // not stop the draft purge below, which is the one with a promise attached.
  let idempotencyPurged = 0;
  try {
    idempotencyPurged = await purgeExpiredIdempotency();
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await getDb().from("sendletter_webhook_events").delete().lt("created_at", cutoff);
  } catch (e) {
    console.error("purge-drafts: housekeeping failed:", e instanceof Error ? e.message : e);
  }
  try {
    const { drafts, files } = await purgeExpiredDrafts();
    console.log(`purge-drafts: removed ${drafts} draft(s), ${files} file(s) older than ${DRAFT_RETENTION_DAYS} days`);

    // The letter text kept on the order row. A database problem must not undo the file purge.
    let textCleared = 0;
    try {
      const cutoff = new Date(Date.now() - DRAFT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await getDb()
        .from("sendletter_orders")
        .update({ letter_html: null })
        .lt("created_at", cutoff)
        .notNull("letter_html")
        .select("id");
      textCleared = Array.isArray(data) ? data.length : 0;
    } catch (e) {
      console.error("purge-drafts: could not clear stored letter text:", e instanceof Error ? e.message : e);
    }
    return NextResponse.json({ ok: true, retentionDays: DRAFT_RETENTION_DAYS, drafts, files, textCleared, idempotencyPurged });
  } catch (e) {
    console.error("purge-drafts failed:", e instanceof DraftStoreError ? e.message : e);
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}
