import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { invoiceNumber } from "@/lib/invoices";

export const metadata = { title: "Invoices | sendletter", robots: { index: false } };

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const BADGE: Record<string, string> = {
  paid: "bg-green-50 text-green-800 border-green-200",
  failed: "bg-red-50 text-red-800 border-red-200",
  open: "bg-amber-50 text-amber-800 border-amber-200",
  void: "bg-gray-100 text-gray-600 border-gray-200",
};

export default async function InvoicesPage() {
  const session = (await getSession())!;
  const db = getDb();
  const { data } = await db.from("sendletter_invoices").select("*").eq("account_id", session.accountId).order("created_at", { ascending: false }).limit(500);
  const invoices = (data ?? []) as Record<string, unknown>[];

  // Usage not yet on an invoice: what the next monthly invoice will contain.
  const { data: pending } = await db.from("sendletter_api_usage").select("amount_cents").eq("account_id", session.accountId).eq("billed", false).isNull("voided_at");
  const pendingCents = (pending ?? []).reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Your first letter is charged when you send it. After that, usage is invoiced once a month, on the 1st.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a file download, not a page */}
        <a href="/api/account/invoices/export" className="text-sm font-semibold text-brand hover:underline">Export all as CSV</a>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 mb-4 text-sm flex items-center justify-between">
        <span className="text-gray-600">Not yet invoiced (goes on your next monthly invoice)</span>
        <span className="font-semibold">{money(pendingCents)}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              {["Invoice", "Date", "Type", "Letters", "Total", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No invoices yet.</td></tr>}
            {invoices.map((i) => (
              <tr key={String(i.id)} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-semibold"><Link href={`/account/invoices/${i.id}`} className="hover:underline">{invoiceNumber(Number(i.seq), String(i.created_at))}</Link></td>
                <td className="px-4 py-3 text-gray-600">{new Date(String(i.created_at)).toLocaleDateString("en-CA", { dateStyle: "medium" })}</td>
                <td className="px-4 py-3 text-gray-600">{i.kind === "first_order" ? "First order" : "Monthly"}</td>
                <td className="px-4 py-3 text-gray-600">{String(i.letters)}</td>
                <td className="px-4 py-3">{money(Number(i.total_cents))}</td>
                <td className="px-4 py-3"><span className={`inline-block text-xs font-semibold border rounded-full px-2 py-0.5 ${BADGE[String(i.status)] ?? BADGE.open}`}>{String(i.status)}</span></td>
                <td className="px-4 py-3 text-right"><a href={`/api/account/invoices/export?invoice=${i.id}`} className="text-xs text-gray-500 hover:text-gray-800">CSV</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
