import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const stripe = getStripe();

  // Find all accounts with unbilled usage
  const { data: unbilled } = await supabase
    .from("sendletter_api_usage")
    .select("account_id, amount_cents")
    .eq("billed", false);

  if (!unbilled || unbilled.length === 0) {
    return NextResponse.json({ ok: true, message: "No unbilled usage" });
  }

  // Group by account
  const grouped: Record<string, number[]> = {};
  for (const row of unbilled) {
    if (!grouped[row.account_id]) grouped[row.account_id] = [];
    grouped[row.account_id].push(row.amount_cents);
  }

  const results: Array<{ accountId: string; status: string; amount?: number; error?: string }> = [];

  for (const [accountId, amounts] of Object.entries(grouped)) {
    const totalCents = amounts.reduce((sum, a) => sum + a, 0);
    if (totalCents === 0) continue;

    // Get Stripe customer ID
    const { data: account } = await supabase
      .from("sendletter_accounts")
      .select("stripe_customer_id")
      .eq("id", accountId)
      .single();

    if (!account?.stripe_customer_id) {
      results.push({ accountId, status: "skipped", error: "No Stripe customer" });
      continue;
    }

    // Create billing run record
    const { data: run } = await supabase
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

      // Mark usage as billed
      await supabase
        .from("sendletter_api_usage")
        .update({ billed: true, billing_run_id: run.id })
        .eq("account_id", accountId)
        .eq("billed", false);

      // Update billing run
      await supabase
        .from("sendletter_billing_runs")
        .update({
          status: "succeeded",
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq("id", run.id);

      results.push({ accountId, status: "succeeded", amount: totalCents });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";

      await supabase
        .from("sendletter_billing_runs")
        .update({ status: "failed", error_message: msg })
        .eq("id", run.id);

      results.push({ accountId, status: "failed", error: msg });
    }
  }

  return NextResponse.json({ ok: true, results });
}
