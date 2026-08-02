import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";

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

  // Check Stripe for payment methods and set default
  const stripe = getStripe();
  const methods = await stripe.paymentMethods.list({
    customer: account.stripe_customer_id,
    type: "card",
  });

  if (methods.data.length > 0) {
    const pm = methods.data[0];
    await stripe.customers.update(account.stripe_customer_id, {
      invoice_settings: { default_payment_method: pm.id },
    });

    await db
      .from("sendletter_accounts")
      .update({ has_payment_method: true, updated_at: new Date().toISOString() })
      .eq("id", session.accountId);
  }

  return NextResponse.json({ ok: true });
}
