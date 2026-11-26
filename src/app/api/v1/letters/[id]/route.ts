import { NextResponse, after } from "next/server";
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { letterStatus, serializeLetter } from "@/lib/letters";
import { withApi, apiError, isUuid } from "@/lib/api-route";
import { refundUsage } from "@/lib/invoices";
import { emitEvent } from "@/lib/webhooks";
import { advanceTestLetter } from "@/lib/test-letters";
import { escapeHtml } from "@/lib/sanitize";

const INTERNAL_EMAIL = "colinh.shand@gmail.com";

type Ctx = { params: Promise<{ id: string }> };

async function findLetter(accountId: string, livemode: boolean, id: string) {
  if (!isUuid(id)) return null;
  const { data } = await getDb().from("sendletter_orders").select("*").eq("id", id).eq("api_account_id", accountId).eq("livemode", livemode).single();
  return data ?? null;
}

// GET /api/v1/letters/{id}: the letter, its status (queued, printed, mailed, cancelled) and its price.
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withApi(req, async ({ accountId, livemode }) => {
    const row = await findLetter(accountId, livemode, id);
    if (!row) return apiError(404, "No such letter.", "letter_not_found");
    // A test letter's printed and mailed steps (and their webhooks) happen as it is read.
    return NextResponse.json(serializeLetter(livemode ? row : await advanceTestLetter(row)));
  });
}

// DELETE /api/v1/letters/{id}: cancel a letter that is still queued. A letter that
// has been printed cannot be recalled. Billing for it is voided, or refunded if it was already paid.
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withApi(req, async ({ accountId, livemode }) => {
    const row = await findLetter(accountId, livemode, id);
    if (!row) return apiError(404, "No such letter.", "letter_not_found");

    const status = letterStatus(row);
    if (status === "cancelled") return NextResponse.json(serializeLetter(row)); // already done: safe to repeat
    if (status !== "queued") {
      return apiError(409, `This letter is ${status} and can no longer be cancelled.`, "not_cancellable", { status });
    }

    const db = getDb();
    const when = new Date().toISOString();
    // Only a letter still pending is cancelled: if it was marked printed a moment ago, this matches nothing.
    const { data: changed } = await db
      .from("sendletter_orders")
      .update({ status: "cancelled", cancelled_at: when })
      .eq("id", id)
      .eq("status", "pending")
      .select("*");
    if (!changed || changed.length === 0) {
      return apiError(409, "This letter has just been printed and can no longer be cancelled.", "not_cancellable", { status: "printed" });
    }
    const cancelled = changed[0];

    let refunded = 0;
    let refundFailure: string | null = null;
    if (livemode) {
      const { data: usage } = await db.from("sendletter_api_usage").select("id").eq("order_id", id);
      for (const u of usage ?? []) {
        await db.from("sendletter_api_usage").update({ voided_at: when }).eq("id", u.id);
        try {
          refunded += await refundUsage(u.id);
        } catch (e) {
          // The letter is cancelled either way; the money is not back yet. Say so, loudly: it needs a person.
          const why = e instanceof Error ? e.message : String(e);
          console.error("refund failed for", id, why);
          refundFailure = why;
        }
      }
      // Tell the person who prints, so a queued job is not produced.
      try {
        if (process.env.RESEND_API_KEY) {
          await new Resend(process.env.RESEND_API_KEY).emails.send({
            from: "sendletter <noreply@sendletter.app>",
            to: INTERNAL_EMAIL,
            subject: `${refundFailure ? "REFUND FAILED + " : ""}CANCELLED API order ${id}: do not print`,
            html: `<h2>API order cancelled</h2><p>Order <strong>${escapeHtml(id)}</strong> to ${escapeHtml(String(row.to_name))} in ${escapeHtml(String(row.to_city))} was cancelled by the customer before printing. Do not print or mail it.</p>${refundFailure ? `<p style="color:#b3261e;"><strong>The automatic refund failed</strong> (${escapeHtml(refundFailure)}). The customer was billed for this letter and has not been refunded: refund it in Stripe by hand.</p>` : ""}`,
          });
        }
      } catch (e) {
        console.error("cancel email failed (non-blocking):", e);
      }
    }
    after(() => emitEvent(accountId, livemode, "letter.cancelled", cancelled));
    return NextResponse.json({ ...serializeLetter(cancelled), refunded_cents: refunded, ...(refundFailure ? { refund_pending: true } : {}) });
  });
}
