import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }

  // Try to get the user's name from Stripe billing details
  let firstName: string | null = null;
  try {
    const supabase = getSupabase();
    const { data: account } = await supabase
      .from("sendletter_accounts")
      .select("stripe_customer_id, has_payment_method")
      .eq("id", session.accountId)
      .single();

    if (account?.has_payment_method && account.stripe_customer_id) {
      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(account.stripe_customer_id);
      if (!("deleted" in customer && customer.deleted)) {
        const defaultPm = customer.invoice_settings?.default_payment_method;
        if (typeof defaultPm === "string") {
          const pm = await stripe.paymentMethods.retrieve(defaultPm);
          const fullName = pm.billing_details?.name;
          if (fullName) {
            firstName = fullName.split(/\s+/)[0];
          }
        }
      }
    }
  } catch {
    // Non-critical — fall back to email
  }

  // Fall back to email prefix
  if (!firstName) {
    firstName = session.email.split("@")[0];
  }

  return NextResponse.json({ loggedIn: true, firstName });
}
