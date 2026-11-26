import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ADDRESS_COLUMNS, addressFromRow, cleanBillingAddress } from "@/lib/billing-address";

// The billing address on the invoice and the basis for sales tax. Changing it here
// does not change the card or anything in Stripe.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await getDb().from("sendletter_accounts").select(ADDRESS_COLUMNS).eq("id", session.accountId).single();
  return NextResponse.json({ address: addressFromRow(data), source: data?.billing_source ?? null });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const c = cleanBillingAddress(body);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
  const a = c.address;
  await getDb()
    .from("sendletter_accounts")
    .update({
      billing_name: a.name, billing_line1: a.line1, billing_line2: a.line2, billing_city: a.city, billing_state: a.state,
      billing_postal_code: a.postal_code, billing_country: a.country, billing_source: "customer", updated_at: new Date().toISOString(),
    })
    .eq("id", session.accountId);
  return NextResponse.json({ address: a, source: "customer" });
}
