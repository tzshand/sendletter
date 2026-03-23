import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = getSupabase();

  // Fetch account
  const { data: account } = await supabase
    .from("sendletter_accounts")
    .select("id, email, stripe_customer_id, has_payment_method, created_at")
    .eq("id", session.accountId)
    .single();

  if (!account) redirect("/login");

  // Fetch active API key info
  const { data: apiKey } = await supabase
    .from("sendletter_api_keys")
    .select("key_prefix, created_at")
    .eq("account_id", session.accountId)
    .eq("is_active", true)
    .single();

  // Fetch recent usage
  const { data: usage } = await supabase
    .from("sendletter_api_usage")
    .select("id, letter_mode, letter_size, amount_cents, billed, created_at")
    .eq("account_id", session.accountId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch billing history
  const { data: billing } = await supabase
    .from("sendletter_billing_runs")
    .select("id, amount_cents, usage_count, status, created_at")
    .eq("account_id", session.accountId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get card info from Stripe if payment method is on file
  let cardInfo: { brand: string; last4: string } | null = null;
  if (account.has_payment_method && account.stripe_customer_id) {
    try {
      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(account.stripe_customer_id);
      if (!("deleted" in customer && customer.deleted)) {
        const defaultPm = customer.invoice_settings?.default_payment_method;
        if (typeof defaultPm === "string") {
          const pm = await stripe.paymentMethods.retrieve(defaultPm);
          if (pm.card) {
            cardInfo = { brand: pm.card.brand, last4: pm.card.last4 };
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch card info:", e);
    }
  }

  return (
    <ProfileClient
      account={{
        email: account.email,
        hasPaymentMethod: account.has_payment_method,
        createdAt: account.created_at,
      }}
      apiKey={apiKey ? { prefix: apiKey.key_prefix, createdAt: apiKey.created_at } : null}
      cardInfo={cardInfo}
      usage={usage || []}
      billing={billing || []}
    />
  );
}
