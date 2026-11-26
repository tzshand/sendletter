// Emails sent after a successful charge: the invoice (link + PDF) and, once, the welcome.

import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { invoiceEmail, welcomeEmail, type InvoiceEmailData } from "@/lib/emails";
import { invoicePdf, type InvoicePdfData } from "@/lib/invoice-pdf";

const FROM = "sendletter <noreply@sendletter.app>";
const REPLY_TO = "support@sendletter.app";

const numberOf = (seq: number, createdAt: string) => `SL-${new Date(createdAt).getUTCFullYear()}-${String(seq).padStart(6, "0")}`;
const day = (iso: string, style: "long" | "medium") => new Date(iso).toLocaleDateString("en-CA", { dateStyle: style, timeZone: "America/Toronto" });

/** Everything the invoice email and PDF need, or null if the invoice is not found. */
export async function loadInvoiceData(invoiceId: string): Promise<{ email: string; pdf: InvoicePdfData } | null> {
  const db = getDb();
  const { data: inv } = await db.from("sendletter_invoices").select("*").eq("id", invoiceId).single();
  if (!inv) return null;
  const { data: lines } = await db.from("sendletter_invoice_lines").select("description, amount_cents").eq("invoice_id", invoiceId);
  const { data: acct } = await db.from("sendletter_accounts").select("email").eq("id", inv.account_id).single();
  const email = (acct?.email as string | undefined) ?? "";
  const data: InvoiceEmailData = {
    id: inv.id,
    number: numberOf(inv.seq, inv.created_at),
    date: day(inv.created_at, "long"),
    kind: inv.kind,
    letters: inv.letters,
    totalCents: inv.total_cents,
    lines: (lines ?? []) as { description: string; amount_cents: number }[],
  };
  return { email, pdf: { ...data, billedTo: email, paidAt: inv.paid_at ? day(inv.paid_at, "medium") : null, reference: (inv.stripe_payment_intent_id as string | null) ?? null } };
}

/**
 * Send the paid-invoice email (PDF attached) and, for a customer's first order, the
 * welcome email as well. Never throws: a mail problem must not undo a charge.
 */
export async function sendPaidInvoiceEmails(invoiceId: string): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) return;
    const loaded = await loadInvoiceData(invoiceId);
    if (!loaded || !loaded.email) return;
    const resend = new Resend(key);
    const { subject, html } = invoiceEmail(loaded.pdf);
    let attachments: { filename: string; content: string }[] | undefined;
    try {
      const bytes = await invoicePdf(loaded.pdf);
      attachments = [{ filename: `${loaded.pdf.number}.pdf`, content: Buffer.from(bytes).toString("base64") }];
    } catch (e) {
      console.error("invoice pdf failed (email goes without it):", e instanceof Error ? e.message : e);
    }
    await resend.emails.send({ from: FROM, to: loaded.email, replyTo: REPLY_TO, subject, html, attachments });
    if (loaded.pdf.kind === "first_order") {
      const w = welcomeEmail();
      await resend.emails.send({ from: FROM, to: loaded.email, replyTo: REPLY_TO, subject: w.subject, html: w.html });
    }
  } catch (e) {
    console.error("invoice email failed:", e instanceof Error ? e.message : e);
  }
}
