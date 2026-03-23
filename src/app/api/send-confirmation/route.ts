import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const SIZE_LABELS: Record<string, { en: string; fr: string }> = {
  standard: { en: "Standard tri-fold", fr: "Standard pli en trois" },
  legal: { en: "Legal (8.5×14)", fr: "Légal (8,5×14)" },
  large: { en: "Letter (8.5×11)", fr: "Lettre (8,5×11)" },
};

function buildEmailHtml(meta: Record<string, string>, amount: string, date: string, pdfAttached: boolean): string {
  const size = SIZE_LABELS[meta.letterSize] || SIZE_LABELS.standard;
  const pages = meta.pageCount || "1";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px;">

<div style="text-align:center;margin-bottom:24px;">
  <div style="display:inline-block;background:#F0513C;color:#fff;font-weight:700;font-size:14px;padding:8px 16px;border-radius:8px;">sendletter</div>
</div>

<!-- English -->
<h2 style="font-size:18px;margin:0 0 8px;">Order Confirmation</h2>
<p style="font-size:13px;color:#666;margin:0 0 16px;">Thank you for your order. Your letter has been queued for printing and will be mailed within 1 business day via Canada Post.</p>

<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
  <tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;text-align:right;">${date}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;text-align:right;font-weight:600;">${amount} CAD</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Format</td><td style="padding:6px 0;text-align:right;">${size.en}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Pages</td><td style="padding:6px 0;text-align:right;">${pages}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">From</td><td style="padding:6px 0;text-align:right;">${meta.fromName}, ${meta.fromCity} ${meta.fromProvince}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">To</td><td style="padding:6px 0;text-align:right;">${meta.toName}, ${meta.toCity} ${meta.toProvince}</td></tr>
</table>

${pdfAttached ? '<p style="font-size:12px;color:#888;">Your letter is attached to this email as a PDF.</p>' : ''}

<div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;font-size:11px;color:#888;margin:16px 0;">
  <strong>No Refunds:</strong> All sales are final. The service is considered rendered at the time of payment. Delivery via Canada Post typically takes 3–10 business days.<br/>
  <strong>Merchant:</strong> sendletter &middot; <a href="https://sendletter.app" style="color:#888;">sendletter.app</a> &middot; <a href="mailto:support@sendletter.app" style="color:#888;">support@sendletter.app</a><br/>
  <strong>Terms:</strong> <a href="https://sendletter.app/terms" style="color:#888;">sendletter.app/terms</a>
</div>

<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;"/>

<!-- Français -->
<h2 style="font-size:18px;margin:0 0 8px;">Confirmation de commande</h2>
<p style="font-size:13px;color:#666;margin:0 0 16px;">Merci pour votre commande. Votre lettre a été mise en file d'attente pour impression et sera postée dans un délai de 1 jour ouvrable via Postes Canada.</p>

<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
  <tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;text-align:right;">${date}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Montant</td><td style="padding:6px 0;text-align:right;font-weight:600;">${amount} CAD</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Format</td><td style="padding:6px 0;text-align:right;">${size.fr}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Pages</td><td style="padding:6px 0;text-align:right;">${pages}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">De</td><td style="padding:6px 0;text-align:right;">${meta.fromName}, ${meta.fromCity} ${meta.fromProvince}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">À</td><td style="padding:6px 0;text-align:right;">${meta.toName}, ${meta.toCity} ${meta.toProvince}</td></tr>
</table>

${pdfAttached ? '<p style="font-size:12px;color:#888;">Votre lettre est jointe à ce courriel en format PDF.</p>' : ''}

<div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;font-size:11px;color:#888;margin:16px 0;">
  <strong>Aucun remboursement :</strong> Toutes les ventes sont finales. Le service est considéré comme rendu au moment du paiement. La livraison via Postes Canada prend généralement de 3 à 10 jours ouvrables.<br/>
  <strong>Marchand :</strong> sendletter &middot; <a href="https://sendletter.app" style="color:#888;">sendletter.app</a> &middot; <a href="mailto:support@sendletter.app" style="color:#888;">support@sendletter.app</a><br/>
  <strong>Conditions :</strong> <a href="https://sendletter.app/terms" style="color:#888;">sendletter.app/terms</a>
</div>

</body></html>`;
}

export async function POST(req: Request) {
  try {
    const { sessionId, pdfBase64 } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const email = session.customer_details?.email;
    if (!email) {
      return NextResponse.json({ error: "No customer email" }, { status: 400 });
    }

    const meta = (session.metadata || {}) as Record<string, string>;
    const amount = ((session.amount_total || 0) / 100).toFixed(2);
    const date = new Date().toLocaleDateString("en-CA");
    const hasPdf = !!pdfBase64;

    const html = buildEmailHtml(meta, amount, date, hasPdf);

    const resend = getResend();

    const attachments: { filename: string; content: string }[] = [];
    if (pdfBase64 && typeof pdfBase64 === "string" && pdfBase64.length < 10_000_000) {
      attachments.push({
        filename: "letter.pdf",
        content: pdfBase64,
      });
    }

    await resend.emails.send({
      from: "sendletter <onboarding@resend.dev>",
      to: email,
      subject: "Order Confirmation / Confirmation de commande — sendletter",
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Email send error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
