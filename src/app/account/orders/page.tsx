import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { letterStatus, type LetterStatus } from "@/lib/letters";
import { invoiceNumber } from "@/lib/invoices";

export const metadata = { title: "Orders | sendletter", robots: { index: false } };

const PAGE = 50;
const STATUSES: LetterStatus[] = ["queued", "printed", "mailed", "cancelled"];
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "");

const BADGE: Record<LetterStatus, string> = {
  queued: "bg-amber-50 text-amber-800 border-amber-200",
  printed: "bg-blue-50 text-blue-800 border-blue-200",
  mailed: "bg-green-50 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

type SP = { mode?: string; status?: string; q?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const session = (await getSession())!;
  const db = getDb();
  const livemode = sp.mode !== "test";
  const status = STATUSES.includes(sp.status as LetterStatus) ? (sp.status as LetterStatus) : null;
  const q = (sp.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page) || 1);

  // Newest 1,000; the export has everything. Selected columns only: the stored letter text is not needed here.
  const { data } = await db
    .from("sendletter_orders")
    .select("id, created_at, status, livemode, printed_at, mailed_at, cancelled_at, reference, to_name, to_city, to_province, page_count, letter_size, colour, amount_cents")
    .eq("api_account_id", session.accountId)
    .eq("livemode", livemode)
    .order("created_at", { ascending: false })
    .limit(1000);

  const now = new Date();
  const all = ((data ?? []) as Record<string, unknown>[])
    .map((o) => ({ o, status: letterStatus(o, now) }))
    .filter((r) => (!status || r.status === status) && (!q || [r.o.id, r.o.reference, r.o.to_name, r.o.to_city].some((v) => String(v ?? "").toLowerCase().includes(q))));
  const rows = all.slice((page - 1) * PAGE, page * PAGE);

  // Which invoice each live letter is on.
  const invByOrder = new Map<string, string>();
  if (livemode && rows.length) {
    const { data: usage } = await db.from("sendletter_api_usage").select("order_id, invoice_id").in("order_id", rows.map((r) => r.o.id));
    const invIds = [...new Set((usage ?? []).map((u: { invoice_id: string | null }) => u.invoice_id).filter(Boolean))] as string[];
    if (invIds.length) {
      const { data: invs } = await db.from("sendletter_invoices").select("id, seq, created_at").in("id", invIds);
      const num = new Map((invs ?? []).map((i: { id: string; seq: number; created_at: string }) => [i.id, invoiceNumber(i.seq, i.created_at)]));
      for (const u of usage ?? []) if (u.invoice_id && num.has(u.invoice_id)) invByOrder.set(u.order_id, `${u.invoice_id}|${num.get(u.invoice_id)}`);
    }
  }

  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams({ ...(livemode ? {} : { mode: "test" }), ...(status ? { status } : {}), ...(sp.q ? { q: sp.q } : {}), ...over } as Record<string, string>);
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const exportHref = `/api/account/orders/export${livemode ? "" : "?mode=test"}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">API orders</h1>
          <p className="text-sm text-gray-500 mt-1">Every letter sent with your {livemode ? "live" : "test"} keys. Status updates as it is printed and mailed.</p>
        </div>
        <a href={exportHref} className="text-sm font-semibold text-brand hover:underline">Export all as CSV</a>
      </div>

      <form className="flex flex-wrap gap-2 mb-4" action="/account/orders">
        <select name="mode" defaultValue={livemode ? "live" : "test"} className="input input-sm w-auto">
          <option value="live">Live letters</option>
          <option value="test">Test letters</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="input input-sm w-auto">
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search id, reference, recipient, city" className="input input-sm flex-1 min-w-[220px]" />
        <button className="bg-gray-900 text-white text-sm font-semibold px-4 rounded-lg">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              {["Created", "Letter", "Recipient", "Status", "Pages", "Amount", "Invoice"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No letters match.</td></tr>
            )}
            {rows.map(({ o, status: st }) => {
              const inv = invByOrder.get(String(o.id))?.split("|");
              return (
                <tr key={String(o.id)} className="border-b border-gray-100 last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{day(String(o.created_at))}</td>
                  <td className="px-4 py-3"><div className="font-mono text-[11px] text-gray-500">{String(o.id).slice(0, 8)}</div>{o.reference ? <div className="text-gray-800">{String(o.reference)}</div> : null}</td>
                  <td className="px-4 py-3">{String(o.to_name)}<div className="text-xs text-gray-500">{String(o.to_city)}{o.to_province ? `, ${o.to_province}` : ""}</div></td>
                  <td className="px-4 py-3"><span className={`inline-block text-xs font-semibold border rounded-full px-2 py-0.5 ${BADGE[st]}`}>{st}</span>
                    {st === "mailed" && o.mailed_at ? <div className="text-[11px] text-gray-400 mt-1">{day(String(o.mailed_at))}</div> : null}</td>
                  <td className="px-4 py-3 text-gray-600">{String(o.page_count)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{st === "cancelled" ? <span className="text-gray-400 line-through">{money(Number(o.amount_cents))}</span> : money(Number(o.amount_cents))}</td>
                  <td className="px-4 py-3">{inv ? <Link href={`/account/invoices/${inv[0]}`} className="text-brand hover:underline">{inv[1]}</Link> : <span className="text-gray-400">{livemode ? "not yet invoiced" : "-"}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>{all.length} letter{all.length === 1 ? "" : "s"}{all.length === 1000 ? " (newest 1,000; export for everything)" : ""}</span>
        <span className="flex gap-3">
          {page > 1 && <Link href={`/account/orders${qs({ page: String(page - 1) })}`} className="font-semibold hover:text-gray-800">← Newer</Link>}
          {page * PAGE < all.length && <Link href={`/account/orders${qs({ page: String(page + 1) })}`} className="font-semibold hover:text-gray-800">Older →</Link>}
        </span>
      </div>
    </div>
  );
}
