import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getSupabase } from "@/lib/supabase";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: account } = await supabase
    .from("sendletter_accounts")
    .select("stripe_customer_id")
    .eq("id", session.accountId)
    .single();

  if (!account?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
  }

  // Check for unbilled usage
  const { data: unbilled } = await supabase
    .from("sendletter_api_usage")
    .select("id, amount_cents")
    .eq("account_id", session.accountId)
    .eq("billed", false);

  if (unbilled && unbilled.length > 0) {
    const totalCents = unbilled.reduce((sum, u) => sum + u.amount_cents, 0);

    // Charge the outstanding balance before removing
    const stripe = getStripe();
    try {
      const pi = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "cad",
        customer: account.stripe_customer_id,
        off_session: true,
        confirm: true,
        description: `sendletter API — final billing before card removal (${unbilled.length} letter${unbilled.length > 1 ? "s" : ""})`,
        metadata: {
          account_id: session.accountId,
          type: "final_billing",
          usage_count: String(unbilled.length),
        },
      });

      if (pi.status !== "succeeded") {
        return NextResponse.json(
          { error: `Outstanding balance of $${(totalCents / 100).toFixed(2)} CAD could not be charged. Please update your card first.` },
          { status: 402 }
        );
      }

      // Mark usage as billed
      const usageIds = unbilled.map((u) => u.id);
      await supabase
        .from("sendletter_api_usage")
        .update({ billed: true })
        .in("id", usageIds);

      // Record billing run
      await supabase.from("sendletter_billing_runs").insert({
        account_id: session.accountId,
        stripe_payment_intent_id: pi.id,
        amount_cents: totalCents,
        usage_count: unbilled.length,
        status: "succeeded",
      });
    } catch (e) {
      console.error("Final billing failed:", e);
      const totalStr = (totalCents / 100).toFixed(2);
      return NextResponse.json(
        { error: `Payment of $${totalStr} CAD failed. Resolve the outstanding balance before removing your card.` },
        { status: 402 }
      );
    }
  }

  // Detach all payment methods from the Stripe customer
  const stripe = getStripe();
  const methods = await stripe.paymentMethods.list({
    customer: account.stripe_customer_id,
    type: "card",
  });

  for (const pm of methods.data) {
    await stripe.paymentMethods.detach(pm.id);
  }

  // Clear default payment method
  await stripe.customers.update(account.stripe_customer_id, {
    invoice_settings: { default_payment_method: "" },
  });

  // Update account
  await supabase
    .from("sendletter_accounts")
    .update({ has_payment_method: false, updated_at: new Date().toISOString() })
    .eq("id", session.accountId);

  // Deactivate API keys so they can't be used without payment
  await supabase
    .from("sendletter_api_keys")
    .update({ is_active: false })
    .eq("account_id", session.accountId);

  return NextResponse.json({ ok: true });
}
