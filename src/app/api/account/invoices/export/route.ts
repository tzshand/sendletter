import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { csvResponse, dollars, toCsv } from "@/lib/csv";
import { invoiceNumber } from "@/lib/invoices";

// CSV of the account's invoices, or with ?invoice=<id> the line items of one invoice.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const one = new URL(req.url).searchParams.get("invoice");

  if (one) {
    const { data: inv } = await db.from("sendletter_invoices").select("id, seq, created_at, status").eq("id", one).eq("account_id", session.accountId).single();
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data: lines } = await db.from("sendletter_invoice_lines").select("order_id, description, amount_cents, tax_cents").eq("invoice_id", inv.id);
    const num = invoiceNumber(inv.seq, inv.created_at);
    return csvResponse(`${num}.csv`, toCsv(["invoice", "order_id", "description", "amount_cad", "tax_cad"], (lines ?? []).map((l: { order_id: string; description: string; amount_cents: number; tax_cents: number | null }) => [num, l.order_id, l.description, dollars(l.amount_cents), dollars(l.tax_cents ?? 0)])));
  }

  const { data } = await db.from("sendletter_invoices").select("*").eq("account_id", session.accountId).order("created_at", { ascending: false }).limit(5000);
  const rows = (data ?? []).map((i: Record<string, unknown>) => [
    invoiceNumber(i.seq as number, i.created_at as string), i.created_at, i.kind, i.status, i.letters, dollars((i.subtotal_cents ?? i.total_cents) as number), dollars((i.tax_cents ?? 0) as number), i.tax_province, dollars(i.total_cents as number), i.period_start, i.period_end, i.paid_at, i.error_message,
  ]);
  return csvResponse(`sendletter-invoices-${new Date().toISOString().slice(0, 10)}.csv`,
    toCsv(["invoice", "date", "kind", "status", "letters", "subtotal_cad", "tax_cad", "tax_province", "total_cad", "period_start", "period_end", "paid_at", "error"], rows));
}
