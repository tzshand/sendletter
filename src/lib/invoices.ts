// Invoices and billing for API usage.
//
//  - A customer's first order is charged up front, on its own invoice, before the
//    letter is accepted. A card that will not pay is found out on letter one.
//  - After that, usage is invoiced monthly: on the first of each month, everything
//    from earlier months that is still unbilled goes onto one invoice and one
//    charge, so the $0.30 fixed card fee is paid once a month, not per letter.
//
// A charge is claimed, then made, then recorded:
//   1. claim: stamp the usage rows with the new invoice id, only where none is set,
//      so two runs can never invoice the same letter;
//   2. charge the saved card (Stripe idempotency key = the invoice id);
//   3. on success mark the rows billed and the invoice paid; on failure release the
//      claim so the next run retries them.

import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { torontoMonthStart } from "@/lib/api-limits";
import { sendPaidInvoiceEmails } from "@/lib/invoice-mail";
import { ADDRESS_COLUMNS, addressFromRow, seedBillingAddressFromCard } from "@/lib/billing-address";
import { sumTax, taxCollecting, taxForLine, taxProvince, totalsByCode, type TaxLine } from "@/lib/tax";

export const invoiceNumber = (seq: number, createdAt: string) =>
  `SL-${new Date(createdAt).getUTCFullYear()}-${String(seq).padStart(6, "0")}`;

export type ChargeResult =
  | { ok: true; invoiceId: string; totalCents: number }
  | { ok: false; invoiceId?: string; error: string; skipped?: boolean };

export async function chargeUsage(opts: {
  accountId: string;
  usageIds: string[];
  kind: "first_order" | "monthly";
  periodStart?: Date;
  periodEnd?: Date;
}): Promise<ChargeResult> {
  const db = getDb();
  const { data: usage } = await db
    .from("sendletter_api_usage")
    .select("id, order_id, amount_cents, billed, voided_at, invoice_id")
    .in("id", opts.usageIds);
  const rows = (usage ?? []).filter((u: { billed: boolean; voided_at: string | null; invoice_id: string | null }) => !u.billed && !u.voided_at && !u.invoice_id);
  if (!rows.length) return { ok: false, error: "nothing to bill", skipped: true };
  const subtotal = rows.reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0);
  if (subtotal <= 0) return { ok: false, error: "nothing to bill", skipped: true };

  const { data: account } = await db.from("sendletter_accounts").select("stripe_customer_id, email, tax_province").eq("id", opts.accountId).single();
  if (!account?.stripe_customer_id) return { ok: false, error: "No Stripe customer on file" };

  // Which card, and so (unless the account sets one) which province the tax is based on.
  let paymentMethod: string | null = null;
  let cardState: string | null = null;
  try {
    const stripe = getStripe();
    paymentMethod = await cardToCharge(stripe, account.stripe_customer_id);
    cardState = paymentMethod ? await billingState(stripe, paymentMethod) : null;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "could not look up the card" };
  }
  // Existing accounts get their card's billing address copied across the first time they are charged.
  await seedBillingAddressFromCard(opts.accountId, getStripe(), paymentMethod ?? "").catch(() => undefined);
  const { data: addrRow } = await db.from("sendletter_accounts").select(ADDRESS_COLUMNS).eq("id", opts.accountId).single();
  const billTo = addressFromRow(addrRow);
  // Tax province: an admin override on the account, else the customer's billing address
  // (when Canadian), else the card's, else Quebec.
  const province = taxProvince(account.tax_province as string | null, billTo.country === "CA" ? billTo.state : null, cardState);
  const collecting = taxCollecting();
  const taxByRow = new Map<string, TaxLine[]>(rows.map((r: { id: string; amount_cents: number }) => [r.id, taxForLine(r.amount_cents, province, collecting)]));
  const taxTotals = totalsByCode([...taxByRow.values()], province);
  const taxCents = sumTax(taxTotals);
  const total = subtotal + taxCents;

  const ids: string[] = rows.map((r: { id: string }) => r.id);
  const orderIds = rows.map((r: { order_id: string | null }) => r.order_id).filter(Boolean) as string[];
  const { data: orders } = orderIds.length
    ? await db.from("sendletter_orders").select("id, to_name, to_city, to_province, page_count, letter_size, reference").in("id", orderIds)
    : { data: [] };
  const orderById = new Map<string, Record<string, unknown>>((orders ?? []).map((o: { id: string }) => [o.id, o as Record<string, unknown>]));

  const { data: inv, error: invErr } = await db
    .from("sendletter_invoices")
    .insert({
      account_id: opts.accountId, kind: opts.kind, letters: rows.length, total_cents: total,
      subtotal_cents: subtotal, tax_cents: taxCents, tax_province: province, tax_collected: collecting, tax_detail: taxTotals, billing_snapshot: { ...billTo, email: account.email ?? "" },
      period_start: opts.periodStart?.toISOString() ?? null, period_end: opts.periodEnd?.toISOString() ?? null,
    })
    .select("id, seq, created_at")
    .single();
  if (!inv) return { ok: false, error: `could not create invoice: ${invErr?.message ?? "unknown"}` };

  // 1. Claim. Rows already claimed by another run are not ours to charge.
  const { data: claimed } = await db.from("sendletter_api_usage").update({ invoice_id: inv.id }).in("id", ids).isNull("invoice_id").select("id");
  const mine: string[] = (claimed ?? []).map((c: { id: string }) => c.id);
  if (mine.length !== ids.length) {
    await db.from("sendletter_api_usage").update({ invoice_id: null }).eq("invoice_id", inv.id);
    await db.from("sendletter_invoices").update({ status: "void", error_message: "usage claimed by another run" }).eq("id", inv.id);
    return { ok: false, invoiceId: inv.id, error: "usage claimed by another run", skipped: true };
  }

  await db.from("sendletter_invoice_lines").insert(
    rows.map((r: { id: string; order_id: string | null; amount_cents: number }) => {
      const o = r.order_id ? orderById.get(r.order_id) : undefined;
      const where = o ? `${o.to_name ?? "recipient"}, ${o.to_city ?? ""}${o.to_province ? " " + o.to_province : ""}`.trim() : "letter";
      const what = o ? ` (${o.page_count} page${Number(o.page_count) === 1 ? "" : "s"}, ${o.letter_size})` : "";
      const ref = o?.reference ? ` [${o.reference}]` : "";
      const lt = taxByRow.get(r.id) ?? [];
      return { invoice_id: inv.id, order_id: r.order_id, description: `Letter to ${where}${what}${ref}`, amount_cents: r.amount_cents, tax_cents: sumTax(lt), tax_detail: lt };
    }),
  );

  // 2. Charge.
  try {
    const stripe = getStripe();
    // A PaymentIntent does NOT inherit the customer's default payment method: without an explicit
    // payment_method, Stripe refuses with "missing a payment method" (which is how this failed daily
    // for six weeks). Use the customer's default card, or else the first card attached.
    if (!paymentMethod) throw new Error("No card on file for this customer");
    const pi = await stripe.paymentIntents.create(
      {
        amount: total,
        currency: "cad",
        customer: account.stripe_customer_id,
        payment_method: paymentMethod,
        off_session: true,
        confirm: true,
        description: `sendletter invoice ${invoiceNumber(inv.seq, inv.created_at)}: ${rows.length} letter${rows.length === 1 ? "" : "s"}`,
        metadata: { invoice_id: inv.id, kind: opts.kind },
      },
      { idempotencyKey: `invoice-${inv.id}` },
    );
    // 3. Record.
    await db.from("sendletter_api_usage").update({ billed: true }).in("id", ids);
    await db.from("sendletter_invoices").update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: pi.id }).eq("id", inv.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "charge failed";
    await db.from("sendletter_api_usage").update({ invoice_id: null }).eq("invoice_id", inv.id);
    await db.from("sendletter_invoices").update({ status: "failed", error_message: msg }).eq("id", inv.id);
    return { ok: false, invoiceId: inv.id, error: msg };
  }
  // We send our own invoice (link + PDF); Stripe's receipt email is not used. Never throws.
  await sendPaidInvoiceEmails(inv.id);
  return { ok: true, invoiceId: inv.id, totalCents: total };
}

/** The state/province on a card's billing address, if it is a Canadian one. Best effort. */
export async function billingState(stripe: unknown, paymentMethodId: string): Promise<string | null> {
  try {
    const pm = (await (stripe as { paymentMethods: { retrieve: (id: string) => Promise<{ billing_details?: { address?: { state?: string | null; country?: string | null } | null } }> } }).paymentMethods.retrieve(paymentMethodId));
    const a = pm.billing_details?.address;
    return a && (!a.country || a.country === "CA") ? (a.state ?? null) : null;
  } catch {
    return null;
  }
}

/** The card to charge off-session: the customer's default payment method, else the first card attached. */
export async function cardToCharge(
  stripe: { customers: { retrieve: (id: string) => Promise<unknown> }; paymentMethods: { list: (p: { customer: string; type: "card" }) => Promise<{ data: { id: string }[] }> } },
  customerId: string,
): Promise<string | null> {
  const c = (await stripe.customers.retrieve(customerId)) as { deleted?: boolean; invoice_settings?: { default_payment_method?: string | { id: string } | null } };
  if (c.deleted) return null;
  const def = c.invoice_settings?.default_payment_method;
  const defId = typeof def === "string" ? def : def?.id;
  if (defId) return defId;
  const cards = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
  return cards.data[0]?.id ?? null;
}

export type MonthlyResult = { accountId: string; status: "succeeded" | "failed" | "skipped"; amount?: number; invoiceId?: string; error?: string };

/** What the monthly run WOULD charge right now, without charging anything or writing anything. */
export async function previewMonthlyBilling(now = new Date()) {
  const monthStart = torontoMonthStart(now);
  const { data } = await getDb()
    .from("sendletter_api_usage")
    .select("id, account_id, amount_cents, created_at")
    .eq("billed", false)
    .isNull("voided_at")
    .isNull("invoice_id")
    .lt("created_at", monthStart.toISOString());
  const byAccount = new Map<string, { letters: number; cents: number; oldest: string }>();
  for (const r of (data ?? []) as { account_id: string; amount_cents: number; created_at: string }[]) {
    const g = byAccount.get(r.account_id) ?? { letters: 0, cents: 0, oldest: String(r.created_at) };
    g.letters++;
    g.cents += r.amount_cents;
    byAccount.set(r.account_id, g);
  }
  return { monthStart: monthStart.toISOString(), accounts: [...byAccount].map(([accountId, g]) => ({ accountId, ...g })) };
}

/** Invoice every account's unbilled usage from before the start of this month (Toronto time). */
export async function runMonthlyBilling(now = new Date()): Promise<MonthlyResult[]> {
  const monthStart = torontoMonthStart(now);
  const { data } = await getDb()
    .from("sendletter_api_usage")
    .select("id, account_id, created_at")
    .eq("billed", false)
    .isNull("voided_at")
    .isNull("invoice_id")
    .lt("created_at", monthStart.toISOString());
  const byAccount = new Map<string, { ids: string[]; oldest: string; newest: string }>();
  type U = { id: string; account_id: string; created_at: string };
  for (const r of (data ?? []) as U[]) {
    const g = byAccount.get(r.account_id) ?? { ids: [] as string[], oldest: r.created_at, newest: r.created_at };
    g.ids.push(r.id);
    if (r.created_at < g.oldest) g.oldest = r.created_at;
    if (r.created_at > g.newest) g.newest = r.created_at;
    byAccount.set(r.account_id, g);
  }
  const results: MonthlyResult[] = [];
  for (const [accountId, g] of byAccount) {
    const r = await chargeUsage({ accountId, usageIds: g.ids, kind: "monthly", periodStart: new Date(g.oldest), periodEnd: new Date(g.newest) });
    results.push(r.ok ? { accountId, status: "succeeded", amount: r.totalCents, invoiceId: r.invoiceId } : { accountId, status: r.skipped ? "skipped" : "failed", error: r.error, invoiceId: r.invoiceId });
  }
  return results;
}

/** Refund what a cancelled letter was billed, if it had been paid. Returns cents refunded. */
export async function refundUsage(usageId: string): Promise<number> {
  const db = getDb();
  const { data: u } = await db.from("sendletter_api_usage").select("id, order_id, amount_cents, billed, invoice_id, refunded_cents").eq("id", usageId).single();
  if (!u || !u.billed || !u.invoice_id || (u.refunded_cents ?? 0) >= u.amount_cents) return 0;
  const { data: inv } = await db.from("sendletter_invoices").select("stripe_payment_intent_id, status").eq("id", u.invoice_id).single();
  if (!inv?.stripe_payment_intent_id || inv.status !== "paid") return 0;
  const owed = u.amount_cents - (u.refunded_cents ?? 0);
  // Tax charged on this letter comes back with it (always $0 while tax is not collected).
  let tax = 0;
  if (u.order_id && (u.refunded_cents ?? 0) === 0) {
    const { data: line } = await db.from("sendletter_invoice_lines").select("tax_cents").eq("invoice_id", u.invoice_id).eq("order_id", u.order_id).single();
    tax = Number(line?.tax_cents ?? 0);
  }
  const amount = owed + tax;
  await getStripe().refunds.create({ payment_intent: inv.stripe_payment_intent_id, amount, metadata: { usage_id: usageId } }, { idempotencyKey: `refund-${usageId}` });
  await db.from("sendletter_api_usage").update({ refunded_cents: u.amount_cents }).eq("id", usageId);
  return amount;
}
