import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isUuid } from "@/lib/api-route";
import { loadInvoiceData } from "@/lib/invoice-mail";
import { invoicePdf } from "@/lib/invoice-pdf";

// The invoice as a PDF. Scoped to the signed-in account: someone else's invoice id is a 404.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: owned } = await getDb().from("sendletter_invoices").select("id").eq("id", id).eq("account_id", session.accountId).single();
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const loaded = await loadInvoiceData(id);
  if (!loaded) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bytes = await invoicePdf(loaded.pdf);
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${loaded.pdf.number}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
