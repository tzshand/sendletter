import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { invoiceNumber } from "@/lib/invoices";
import { isUuid } from "@/lib/api-route";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Invoice | sendletter", robots: { index: false } };

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getSession())!;
  if (!isUuid(id)) notFound();
  const db = getDb();
  // Scoped to the signed-in account: another customer's invoice id is a 404.
  const { data: inv } = await db.from("sendletter_invoices").select("*").eq("id", id).eq("account_id", session.accountId).single();
  if (!inv) notFound();
  const { data: lines } = await db.from("sendletter_invoice_lines").select("order_id, description, amount_cents").eq("invoice_id", id);
  const { data: acct } = await db.from("sendletter_accounts").select("email").eq("id", session.accountId).single();

  const number = invoiceNumber(inv.seq, inv.created_at);
  const date = new Date(inv.created_at).toLocaleDateString("en-CA", { dateStyle: "long" });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link href="/account/invoices" className="text-sm text-gray-500 hover:text-gray-800">← All invoices</Link>
        <div className="flex gap-4 items-center">
          <a href={`/api/account/invoices/export?invoice=${id}`} className="text-sm font-semibold text-brand hover:underline">CSV</a>
          <a href={`/api/account/invoices/${id}/pdf`} className="text-sm font-semibold text-brand hover:underline">PDF</a>
          <PrintButton />
        </div>
      </div>

      <article className="rounded-xl border border-gray-200 bg-white p-8 print:border-0 print:p-0">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice {number}</h1>
            <p className="text-sm text-gray-500 mt-1">{date}</p>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${inv.status === "paid" ? "bg-green-50 text-green-800 border-green-200" : inv.status === "failed" ? "bg-red-50 text-red-800 border-red-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>{inv.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm mb-8">
          <div><p className="text-xs uppercase tracking-wide text-gray-400 mb-1">From</p><p className="font-semibold">sendletter</p><p className="text-gray-600">sendletter.app<br />support@sendletter.app</p></div>
          <div><p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Billed to</p><p className="font-semibold">{acct?.email}</p></div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200"><th className="py-2 font-semibold">Description</th><th className="py-2 font-semibold text-right">Amount (CAD)</th></tr></thead>
          <tbody>
            {(lines ?? []).map((l: { order_id: string; description: string; amount_cents: number }, n: number) => (
              <tr key={l.order_id ?? n} className="border-b border-gray-100"><td className="py-2.5 pr-4">{l.description}</td><td className="py-2.5 text-right whitespace-nowrap">{money(l.amount_cents)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td className="pt-4 font-bold text-right pr-4">Total</td><td className="pt-4 font-bold text-right">{money(inv.total_cents)}</td></tr></tfoot>
        </table>

        <div className="text-xs text-gray-500 space-y-1 border-t border-gray-100 pt-4">
          <p>{inv.letters} letter{inv.letters === 1 ? "" : "s"}. Postage is included at cost. No GST/HST is charged.</p>
          {inv.paid_at && <p>Paid {new Date(inv.paid_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })} by card{inv.stripe_payment_intent_id ? ` (reference ${inv.stripe_payment_intent_id})` : ""}.</p>}
          {inv.status === "failed" && <p className="text-red-700">The charge failed{inv.error_message ? `: ${inv.error_message}` : ""}. These letters will be retried on the next billing run; update your card on your <Link href="/profile" className="underline">profile</Link>.</p>}
        </div>
      </article>
    </div>
  );
}
