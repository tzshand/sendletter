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
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
  }

  const stripe = getStripe();
  const setupIntent = await stripe.setupIntents.create({
    customer: account.stripe_customer_id,
    payment_method_types: ["card"],
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
