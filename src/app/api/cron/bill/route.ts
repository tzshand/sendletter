import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

// Constant-time-ish comparison. The secret is high-entropy and this endpoint is
// not a realistic timing target, but string === on a credential is a bad habit
// to leave in a file that authorises charges.
function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request) {
  // Canner scheduled jobs send an arbitrary header set; `x-cron-key` is the
  // documented convention. The Authorization form is what the old Vercel cron
  // used and is accepted during the cutover.
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  const cronKey = req.headers.get("x-cron-key");
  if (!secretMatches(cronKey, secret) && !secretMatches(bearer, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const stripe = getStripe();

  // Find all accounts with unbilled usage. `id` is selected because the mark-as-
  // billed update below must target exactly these rows — see the note there.
  const { data: unbilled } = await db
    .from("sendletter_api_usage")
    .select("id, account_id, amount_cents")
    .eq("billed", false);

  if (!unbilled || unbilled.length === 0) {
    return NextResponse.json({ ok: true, message: "No unbilled usage" });
  }

  // Group by account, carrying row ids alongside the amounts.
  const grouped: Record<string, { ids: string[]; amounts: number[] }> = {};
  for (const row of unbilled) {
    if (!grouped[row.account_id]) grouped[row.account_id] = { ids: [], amounts: [] };
    grouped[row.account_id].ids.push(row.id);
    grouped[row.account_id].amounts.push(row.amount_cents);
  }

  const results: Array<{ accountId: string; status: string; amount?: number; error?: string }> = [];

  for (const [accountId, { ids, amounts }] of Object.entries(grouped)) {
    const totalCents = amounts.reduce((sum, a) => sum + a, 0);
    if (totalCents === 0) continue;

    // Get Stripe customer ID
    const { data: account } = await db
      .from("sendletter_accounts")
      .select("stripe_customer_id")
      .eq("id", accountId)
      .single();

    if (!account?.stripe_customer_id) {
      results.push({ accountId, status: "skipped", error: "No Stripe customer" });
      continue;
    }

    // Create billing run record
    const { data: run } = await db
      .from("sendletter_billing_runs")
      .insert({
        account_id: accountId,
        amount_cents: totalCents,
        usage_count: amounts.length,
        status: "pending",
      })
      .select("id")
      .single();

    if (!run) {
      results.push({ accountId, status: "failed", error: "Failed to create billing run" });
      continue;
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "cad",
        customer: account.stripe_customer_id,
        off_session: true,
        confirm: true,
        description: `sendletter API: ${amounts.length} letter(s)`,
        metadata: { billing_run_id: run.id },
      });

      // Mark exactly the rows this PaymentIntent paid for.
      //
      // This previously matched on (account_id, billed = false), which silently
      // swept up anything inserted between the read at the top of this handler
      // and this update — marking usage as billed that no charge covered. With
      // an API that inserts a usage row per letter, that window is as wide as a
      // Stripe round trip. Target the ids instead.
      await db
        .from("sendletter_api_usage")
        .update({ billed: true, billing_run_id: run.id })
        .in("id", ids);

      // Update billing run
      await db
        .from("sendletter_billing_runs")
        .update({
          status: "succeeded",
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq("id", run.id);

      results.push({ accountId, status: "succeeded", amount: totalCents });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";

      await db
        .from("sendletter_billing_runs")
        .update({ status: "failed", error_message: msg })
        .eq("id", run.id);

      results.push({ accountId, status: "failed", error: msg });
    }
  }

  return NextResponse.json({ ok: true, results });
}
