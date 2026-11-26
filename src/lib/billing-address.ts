// The billing address on an account: printed on invoices and used to work out
// which province's sales tax applies (lib/tax.ts).
//
// It starts as the billing address on the customer's card (Stripe), copied once,
// and from then on belongs to the customer: they can change it on their account
// page without touching Stripe, and a card change never overwrites it. Changing the
// payment method is a separate step.

import { getDb } from "@/lib/db";
import { normalizeProvince } from "@/lib/tax";

export type BillingAddress = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export const EMPTY_ADDRESS: BillingAddress = { name: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "CA" };

const MAX = { name: 120, line1: 120, line2: 120, city: 80, state: 80, postal_code: 20 } as const;
const oneLine = (v: unknown) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim() : "");

/** Clean untrusted input into an address, or an error message for the customer. */
export function cleanBillingAddress(input: unknown): { ok: true; address: BillingAddress } | { ok: false; error: string } {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const a: BillingAddress = {
    name: oneLine(o.name), line1: oneLine(o.line1), line2: oneLine(o.line2), city: oneLine(o.city),
    state: oneLine(o.state), postal_code: oneLine(o.postal_code), country: oneLine(o.country).toUpperCase() || "CA",
  };
  for (const k of Object.keys(MAX) as (keyof typeof MAX)[]) {
    if (a[k].length > MAX[k]) return { ok: false, error: `${k.replace("_", " ")} is too long (at most ${MAX[k]} characters).` };
  }
  if (!/^[A-Z]{2}$/.test(a.country)) return { ok: false, error: "Country must be a two-letter code, for example CA." };
  if (a.country === "CA" && a.state) {
    const p = normalizeProvince(a.state);
    if (!p) return { ok: false, error: "Province not recognised. Use a two-letter code such as QC or ON." };
    a.state = p;
  }
  return { ok: true, address: a };
}

type StripeLike = {
  paymentMethods: { retrieve: (id: string) => Promise<{ billing_details?: { name?: string | null; address?: Record<string, string | null | undefined> | null } }> };
};

/** The address on a card's billing details, cleaned, or null if it has none. */
export async function addressFromCard(stripe: unknown, paymentMethodId: string): Promise<BillingAddress | null> {
  try {
    const pm = await (stripe as StripeLike).paymentMethods.retrieve(paymentMethodId);
    const bd = pm.billing_details;
    const a = bd?.address;
    if (!bd || (!bd.name && !a?.line1 && !a?.postal_code && !a?.state)) return null;
    const c = cleanBillingAddress({
      name: bd.name, line1: a?.line1, line2: a?.line2, city: a?.city, state: a?.state, postal_code: a?.postal_code, country: a?.country || "CA",
    });
    if (c.ok) return c.address;
    // A state we do not recognise (or an oversize field): keep what is usable, drop the province.
    const loose = cleanBillingAddress({ name: bd.name, line1: a?.line1, line2: a?.line2, city: a?.city, state: "", postal_code: a?.postal_code, country: a?.country || "CA" });
    return loose.ok ? loose.address : null;
  } catch {
    return null;
  }
}

/**
 * Copy the card's billing address onto the account, once. Never overwrites an address
 * the account already has (from an earlier card or edited by the customer).
 */
export async function seedBillingAddressFromCard(accountId: string, stripe: unknown, paymentMethodId: string): Promise<void> {
  const db = getDb();
  const { data: acct } = await db.from("sendletter_accounts").select("billing_source").eq("id", accountId).single();
  if (!acct || acct.billing_source) return;
  const a = await addressFromCard(stripe, paymentMethodId);
  if (!a) return;
  await db
    .from("sendletter_accounts")
    .update({
      billing_name: a.name, billing_line1: a.line1, billing_line2: a.line2, billing_city: a.city, billing_state: a.state,
      billing_postal_code: a.postal_code, billing_country: a.country, billing_source: "stripe",
    })
    .eq("id", accountId)
    .isNull("billing_source");
}

export const ADDRESS_COLUMNS = "billing_name, billing_line1, billing_line2, billing_city, billing_state, billing_postal_code, billing_country, billing_source";

export function addressFromRow(r: Record<string, unknown> | null | undefined): BillingAddress {
  const s = (k: string) => (typeof r?.[k] === "string" ? (r[k] as string) : "");
  return { name: s("billing_name"), line1: s("billing_line1"), line2: s("billing_line2"), city: s("billing_city"), state: s("billing_state"), postal_code: s("billing_postal_code"), country: s("billing_country") || "CA" };
}

/** Lines to print under "Billed to". */
export function addressLines(a: BillingAddress | null | undefined): string[] {
  if (!a) return [];
  const cityLine = [a.city, a.state].filter(Boolean).join(" ") + (a.postal_code ? `  ${a.postal_code}` : "");
  return [a.name, a.line1, a.line2, cityLine.trim(), a.country && a.country !== "CA" ? a.country : ""].filter(Boolean);
}
