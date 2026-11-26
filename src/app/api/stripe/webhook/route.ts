import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { seedBillingAddressFromCard } from "@/lib/billing-address";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "setup_intent.succeeded") {
    const setupIntent = event.data.object;
    const customerId = setupIntent.customer as string;
    const paymentMethodId = setupIntent.payment_method as string;

    if (customerId && paymentMethodId) {
      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      // Update account
      const db = getDb();
      await db
        .from("sendletter_accounts")
        .update({ has_payment_method: true, updated_at: new Date().toISOString() })
        .eq("stripe_customer_id", customerId);
      const { data: acct } = await db.from("sendletter_accounts").select("id").eq("stripe_customer_id", customerId).single();
      if (acct?.id) await seedBillingAddressFromCard(acct.id as string, stripe, paymentMethodId);
    }
  }

  return NextResponse.json({ received: true });
}
