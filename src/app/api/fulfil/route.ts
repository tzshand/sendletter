import { after } from "next/server";
import { getDb } from "@/lib/db";
import { verifyFulfil, type FulfilAction } from "@/lib/fulfil-links";
import { emitEvent } from "@/lib/webhooks";
import { escapeHtml } from "@/lib/sanitize";

// Mark an order printed or mailed, from the signed links in the fulfilment email.
// GET only shows a confirmation page (mail scanners and link previews fetch links,
// and must not change anything). The button on that page POSTs.

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex"/><title>${escapeHtml(title)}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:460px;margin:12vh auto;padding:0 20px;color:#111;">${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );

const WORD: Record<FulfilAction, string> = { printed: "printed", mailed: "mailed" };

export async function GET(req: Request) {
  const u = new URL(req.url);
  const v = verifyFulfil({ o: u.searchParams.get("o"), a: u.searchParams.get("a"), e: u.searchParams.get("e"), s: u.searchParams.get("s") });
  if (!v.ok) return page("Link problem", `<h2>That link doesn't work</h2><p>${escapeHtml(v.reason)}</p>`, 400);
  const { data: order } = await getDb().from("sendletter_orders").select("id, to_name, to_city, status, api_account_id").eq("id", v.orderId).single();
  if (!order) return page("Not found", "<h2>Order not found</h2>", 404);
  if (order.status === "cancelled") return page("Cancelled", `<h2>This order was cancelled</h2><p>Do not print or mail it.</p>`);
  return page(
    `Mark ${v.action}`,
    `<h2>Mark this letter ${WORD[v.action]}?</h2>
<p>Order <code>${escapeHtml(order.id)}</code><br/>To ${escapeHtml(String(order.to_name))}, ${escapeHtml(String(order.to_city))}<br/>Current status: <strong>${escapeHtml(String(order.status))}</strong></p>
<form method="POST" action="/api/fulfil">
<input type="hidden" name="o" value="${escapeHtml(u.searchParams.get("o")!)}"/><input type="hidden" name="a" value="${escapeHtml(v.action)}"/>
<input type="hidden" name="e" value="${escapeHtml(u.searchParams.get("e")!)}"/><input type="hidden" name="s" value="${escapeHtml(u.searchParams.get("s")!)}"/>
<button type="submit" style="background:#F0513C;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:700;cursor:pointer;">Yes, mark ${WORD[v.action]}</button></form>`,
  );
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const get = (k: string) => (form ? String(form.get(k) ?? "") : "") || null;
  const v = verifyFulfil({ o: get("o"), a: get("a"), e: get("e"), s: get("s") });
  if (!v.ok) return page("Link problem", `<h2>That link doesn't work</h2><p>${escapeHtml(v.reason)}</p>`, 400);

  const db = getDb();
  const { data: order } = await db.from("sendletter_orders").select("*").eq("id", v.orderId).single();
  if (!order) return page("Not found", "<h2>Order not found</h2>", 404);
  if (order.status === "cancelled") return page("Cancelled", `<h2>This order was cancelled</h2><p>Nothing changed.</p>`, 409);

  const now = new Date().toISOString();
  const events: ("letter.printed" | "letter.mailed")[] = [];
  const patch: Record<string, unknown> = {};
  if (v.action === "printed") {
    if (order.status === "pending") { patch.status = "printed"; patch.printed_at = now; events.push("letter.printed"); }
  } else if (order.status !== "mailed") {
    patch.status = "mailed"; patch.mailed_at = now;
    if (!order.printed_at) { patch.printed_at = now; events.push("letter.printed"); }
    events.push("letter.mailed");
  }
  if (Object.keys(patch).length) {
    // Guard on the status we read, so two clicks cannot both fire the events.
    const { data: changed } = await db.from("sendletter_orders").update(patch).eq("id", v.orderId).eq("status", order.status).select("*");
    const fresh = changed?.[0];
    if (fresh && fresh.api_account_id) {
      for (const type of events) after(() => emitEvent(fresh.api_account_id, fresh.livemode !== false, type, fresh));
    }
  }
  return page("Done", `<h2>Marked ${WORD[v.action]}</h2><p>Order <code>${escapeHtml(order.id)}</code> is now <strong>${escapeHtml(String(patch.status ?? order.status))}</strong>.</p>`);
}
