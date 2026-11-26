import { getSession, listSessions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { ADDRESS_COLUMNS, addressFromRow, seedBillingAddressFromCard } from "@/lib/billing-address";
import { describeDevice } from "@/lib/device";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const db = getDb();

  // Fetch account
  const { data: account } = await db
    .from("sendletter_accounts")
    .select(
      "id, email, stripe_customer_id, has_payment_method, created_at, passkey_enrolled_at, password_hash, google_id",
    )
    .eq("id", session.accountId)
    .single();

  if (!account) redirect("/login");

  const sessions = await listSessions(session.accountId);

  // Fetch active API key info
  const { data: apiKey } = await db
    .from("sendletter_api_keys")
    .select("key_prefix, created_at")
    .eq("account_id", session.accountId)
    .eq("is_active", true)
    .single();

  // Fetch recent usage
  const { data: usage } = await db
    .from("sendletter_api_usage")
    .select("id, letter_mode, letter_size, amount_cents, billed, created_at")
    .eq("account_id", session.accountId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch billing history
  const { data: invoices } = await db
    .from("sendletter_invoices")
    .select("id, total_cents, letters, status, created_at")
    .eq("account_id", session.accountId)
    .order("created_at", { ascending: false })
    .limit(10);
  const billing = (invoices ?? []).map((i: { id: string; total_cents: number; letters: number; status: string; created_at: string }) => ({
    id: i.id, amount_cents: i.total_cents, usage_count: i.letters, status: i.status === "paid" ? "succeeded" : i.status, created_at: i.created_at,
  }));

  // Get card info and billing address from Stripe if payment method is on file
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

  // The billing address is ours (see lib/billing-address.ts): copied from the card once, then the customer's to edit.
  const { data: addrRow } = await db.from("sendletter_accounts").select(ADDRESS_COLUMNS).eq("id", session.accountId).single();
  let addrSource: string | null = addrRow?.billing_source ?? null;
  if (!addrSource && account.has_payment_method && account.stripe_customer_id) {
    try {
      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(account.stripe_customer_id);
      const dpm = !("deleted" in customer && customer.deleted) ? customer.invoice_settings?.default_payment_method : null;
      if (typeof dpm === "string") {
        await seedBillingAddressFromCard(session.accountId, stripe, dpm);
        const { data: again } = await db.from("sendletter_accounts").select(ADDRESS_COLUMNS).eq("id", session.accountId).single();
        if (again) { Object.assign(addrRow ?? {}, again); addrSource = again.billing_source ?? null; }
      }
    } catch (e) {
      console.error("Failed to seed billing address:", e);
    }
  }
  const billingAddress = addressFromRow(addrRow);

  return (
    <ProfileClient
      account={{
        email: account.email,
        hasPaymentMethod: account.has_payment_method,
        createdAt: account.created_at,
        hasPasskey: account.passkey_enrolled_at != null,
        // Drives the lockout guard's copy: with no password and no Google
        // link, the passkey is the only way in and cannot be removed.
        canRemovePasskey: Boolean(account.password_hash || account.google_id),
      }}
      sessions={sessions.map((s) => ({
        id: s.id,
        device: describeDevice(s.user_agent),
        createdAt: s.created_at,
        lastSeenAt: s.last_seen_at,
        current: s.id === session.sessionId,
      }))}
      apiKey={apiKey ? { prefix: apiKey.key_prefix, createdAt: apiKey.created_at } : null}
      cardInfo={cardInfo}
      billingAddress={billingAddress}
      billingSource={addrSource}
      usage={usage || []}
      billing={billing}
    />
  );
}
