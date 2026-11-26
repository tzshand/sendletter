import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { chargeUsage } from "@/lib/invoices";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { data: account } = await db
    .from("sendletter_accounts")
    .select("stripe_customer_id")
    .eq("id", session.accountId)
    .single();

  if (!account?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
  }

  // Anything not yet invoiced is invoiced and charged now, before the card goes:
  // otherwise the usage could never be collected. Cancelled letters are excluded.
  const { data: unbilled } = await db
    .from("sendletter_api_usage")
    .select("id, amount_cents")
    .eq("account_id", session.accountId)
    .eq("billed", false)
    .isNull("voided_at");

  if (unbilled && unbilled.length > 0) {
    const totalCents = unbilled.reduce((sum: number, u: { amount_cents: number }) => sum + u.amount_cents, 0);
    const result = await chargeUsage({
      accountId: session.accountId,
      usageIds: unbilled.map((u: { id: string }) => u.id),
      kind: "monthly",
      periodEnd: new Date(),
    });
    if (!result.ok && !result.skipped) {
      console.error("Final billing failed:", result.error);
      return NextResponse.json(
        { error: `Outstanding balance of $${(totalCents / 100).toFixed(2)} CAD could not be charged. Please update your card first.` },
        { status: 402 },
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
  await db
    .from("sendletter_accounts")
    .update({ has_payment_method: false, updated_at: new Date().toISOString() })
    .eq("id", session.accountId);

  // Deactivate API keys so they can't be used without payment
  await db
    .from("sendletter_api_keys")
    .update({ is_active: false })
    .eq("account_id", session.accountId);

  return NextResponse.json({ ok: true });
}
