import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabase, type OrderInsert } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { SIZE_LABELS_BILINGUAL } from "@/lib/pricing";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const INTERNAL_EMAIL = "colinh.shand@gmail.com";

const SIZE_LABELS = SIZE_LABELS_BILINGUAL;

function formatAddress(name: string, line1: string, line2: string, city: string, province: string, postal: string, country?: string): string {
  const lines = [name, line1];
  if (line2) lines.push(line2);
  const cityParts = [city, province].filter(Boolean).join(", ");
  lines.push([cityParts, postal].filter(Boolean).join("  "));
  if (country && country !== "CA") {
    const NAMES: Record<string, string> = { US: "United States", GB: "United Kingdom", FR: "France", DE: "Germany", AU: "Australia" };
    lines.push(NAMES[country] || country);
  }
  return lines.join("<br/>");
}

function buildEmailHtml(meta: Record<string, string>, amount: string, date: string, pdfAttached: boolean): string {
  const size = SIZE_LABELS[meta.letterSize] || SIZE_LABELS.standard;
  const pages = meta.pageCount || "1";
  const fromAddr = formatAddress(meta.fromName, meta.fromLine1, meta.fromLine2 || "", meta.fromCity, meta.fromProvince, meta.fromPostal, meta.fromCountry);
  const toAddr = formatAddress(meta.toName, meta.toLine1, meta.toLine2 || "", meta.toCity, meta.toProvince, meta.toPostal, meta.toCountry);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px;">

<div style="text-align:center;margin-bottom:24px;">
  <img src="https://sendletter.app/goose-128-letter.png" alt="sendletter" width="48" height="48" style="display:block;margin:0 auto 8px;"/>
  <div style="font-weight:700;font-size:16px;color:#111;">sendletter</div>
</div>

<!-- English -->
<h2 style="font-size:18px;margin:0 0 8px;">Order Confirmation</h2>
<p style="font-size:13px;color:#666;margin:0 0 16px;">Thank you for your order. Your letter has been queued for printing and will be mailed within 1 business day via Canada Post.</p>

<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
  <tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;text-align:right;">${date}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;text-align:right;font-weight:600;">${amount} CAD</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Format</td><td style="padding:6px 0;text-align:right;">${size.en}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Pages</td><td style="padding:6px 0;text-align:right;">${pages}</td></tr>
</table>

<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
  <tr>
    <td style="padding:8px 12px;vertical-align:top;width:50%;background:#fafafa;border-radius:6px 0 0 6px;">
      <div style="color:#888;font-size:11px;margin-bottom:4px;">From</div>
      ${fromAddr}
    </td>
    <td style="padding:8px 12px;vertical-align:top;width:50%;background:#fafafa;border-radius:0 6px 6px 0;border-left:1px solid #eee;">
      <div style="color:#888;font-size:11px;margin-bottom:4px;">To</div>
      ${toAddr}
    </td>
  </tr>
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
<p style="font-size:13px;color:#666;margin:0 0 16px;">Merci pour votre commande. Votre lettre a été mise en file d&#39;attente pour impression et sera postée dans un délai de 1 jour ouvrable via Postes Canada.</p>

<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
  <tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;text-align:right;">${date}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Montant</td><td style="padding:6px 0;text-align:right;font-weight:600;">${amount} CAD</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Format</td><td style="padding:6px 0;text-align:right;">${size.fr}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Pages</td><td style="padding:6px 0;text-align:right;">${pages}</td></tr>
</table>

<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
  <tr>
    <td style="padding:8px 12px;vertical-align:top;width:50%;background:#fafafa;border-radius:6px 0 0 6px;">
      <div style="color:#888;font-size:11px;margin-bottom:4px;">De</div>
      ${fromAddr}
    </td>
    <td style="padding:8px 12px;vertical-align:top;width:50%;background:#fafafa;border-radius:0 6px 6px 0;border-left:1px solid #eee;">
      <div style="color:#888;font-size:11px;margin-bottom:4px;">&Agrave;</div>
      ${toAddr}
    </td>
  </tr>
</table>

${pdfAttached ? '<p style="font-size:12px;color:#888;">Votre lettre est jointe à ce courriel en format PDF.</p>' : ''}

<div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;font-size:11px;color:#888;margin:16px 0;">
  <strong>Aucun remboursement :</strong> Toutes les ventes sont finales. Le service est considéré comme rendu au moment du paiement. La livraison via Postes Canada prend généralement de 3 à 10 jours ouvrables.<br/>
  <strong>Marchand :</strong> sendletter &middot; <a href="https://sendletter.app" style="color:#888;">sendletter.app</a> &middot; <a href="mailto:support@sendletter.app" style="color:#888;">support@sendletter.app</a><br/>
  <strong>Conditions :</strong> <a href="https://sendletter.app/terms" style="color:#888;">sendletter.app/terms</a>
</div>

</body></html>`;
}

function buildInternalEmailHtml(
  meta: Record<string, string>,
  amount: string,
  date: string,
  customerEmail: string,
  sessionId: string,
  letterMode: string,
  hasPdf: boolean,
  hasHtml: boolean,
): string {
  const size = SIZE_LABELS[meta.letterSize] || SIZE_LABELS.standard;
  const pages = meta.pageCount || "1";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px;">

<h2 style="font-size:18px;margin:0 0 16px;color:#F0513C;">New sendletter Order</h2>

<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
  <tr><td style="padding:6px 0;color:#888;width:140px;">Date</td><td style="padding:6px 0;">${date}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Stripe Session</td><td style="padding:6px 0;font-family:monospace;font-size:11px;">${sessionId}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Customer Email</td><td style="padding:6px 0;">${customerEmail}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;font-weight:600;">${amount} CAD</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Mode</td><td style="padding:6px 0;">${letterMode}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Format</td><td style="padding:6px 0;">${size.en}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Pages</td><td style="padding:6px 0;">${pages}</td></tr>
</table>

<h3 style="font-size:14px;margin:16px 0 8px;">From (Return Address)</h3>
<p style="font-size:13px;margin:0;line-height:1.6;">
  ${meta.fromName}<br/>
  ${meta.fromLine1}<br/>
  ${meta.fromLine2 ? meta.fromLine2 + "<br/>" : ""}${meta.fromCity}, ${meta.fromProvince} ${meta.fromPostal}${meta.fromCountry && meta.fromCountry !== "CA" ? "<br/>" + meta.fromCountry : ""}
</p>

<h3 style="font-size:14px;margin:16px 0 8px;">To (Mailing Address)</h3>
<p style="font-size:13px;margin:0;line-height:1.6;">
  ${meta.toName}<br/>
  ${meta.toLine1}<br/>
  ${meta.toLine2 ? meta.toLine2 + "<br/>" : ""}${meta.toCity}, ${meta.toProvince} ${meta.toPostal}${meta.toCountry && meta.toCountry !== "CA" ? "<br/>" + meta.toCountry : ""}
</p>

<div style="background:#f0f9f0;border-radius:8px;padding:12px 16px;font-size:12px;color:#666;margin:20px 0;">
  <strong>Attachment:</strong> ${hasPdf ? 'PDF attached' : hasHtml ? 'HTML letter content attached' : 'No attachment available'}
</div>

</body></html>`;
}

export async function POST(req: Request) {
  try {
    const { sessionId, pdfBase64, htmlContent, letterData, letterMode, originalFile } = await req.json();

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
    const hasOriginal = !!(originalFile && originalFile.base64 && typeof originalFile.base64 === "string");
    const hasPdf = !!(pdfBase64 && typeof pdfBase64 === "string");
    const hasHtml = !!(htmlContent && typeof htmlContent === "string");
    const hasAttachment = hasOriginal || hasPdf;

    // Build customer confirmation email
    const customerHtml = buildEmailHtml(meta, amount, date, hasAttachment);

    const resend = getResend();

    // Prepare attachments for customer email
    const customerAttachments: { filename: string; content: string }[] = [];
    if (hasOriginal && originalFile.base64.length < 10_000_000) {
      customerAttachments.push({ filename: originalFile.name, content: originalFile.base64 });
    } else if (hasPdf && pdfBase64.length < 10_000_000) {
      customerAttachments.push({ filename: "letter.pdf", content: pdfBase64 });
    }

    // Send customer confirmation email
    await resend.emails.send({
      from: "sendletter <noreply@sendletter.app>",
      to: email,
      subject: "Order Confirmation / Confirmation de commande — sendletter",
      html: customerHtml,
      attachments: customerAttachments.length > 0 ? customerAttachments : undefined,
    });

    // Build internal order email
    const mode = letterMode || meta.letterMode || "unknown";
    const internalHtml = buildInternalEmailHtml(meta, amount, date, email, sessionId, mode, hasAttachment, hasHtml);

    // Prepare attachments for internal email (original + generated PDF)
    const internalAttachments: { filename: string; content: string }[] = [];
    // Attach original file if available (docx/pdf as uploaded)
    if (hasOriginal && originalFile.base64.length < 10_000_000) {
      internalAttachments.push({ filename: originalFile.name, content: originalFile.base64 });
    }
    // Also attach generated PDF (for all modes)
    if (hasPdf && pdfBase64.length < 10_000_000) {
      internalAttachments.push({ filename: "letter.pdf", content: pdfBase64 });
    } else if (hasHtml) {
      const printHtml = buildPrintHtml(htmlContent, meta.letterSize || "standard");
      internalAttachments.push({
        filename: "letter.html",
        content: Buffer.from(printHtml).toString("base64"),
      });
    } else if (letterData) {
      const simpleHtml = buildSimpleLetterHtml(letterData, meta.letterSize || "standard");
      internalAttachments.push({
        filename: "letter.html",
        content: Buffer.from(simpleHtml).toString("base64"),
      });
    }

    // Send internal order email
    try {
      await resend.emails.send({
        from: "sendletter <noreply@sendletter.app>",
        to: INTERNAL_EMAIL,
        subject: `New Order: ${meta.toName} in ${meta.toCity}, ${meta.toProvince} — $${amount}`,
        html: internalHtml,
        attachments: internalAttachments.length > 0 ? internalAttachments : undefined,
      });
    } catch (e) {
      console.error("Internal email failed (non-blocking):", e);
    }

    // Save order to database
    try {
      const supabase = getSupabase();
      const order: OrderInsert = {
        stripe_session_id: sessionId,
        stripe_payment_status: session.payment_status,
        customer_email: email,
        letter_mode: mode,
        letter_size: meta.letterSize || "standard",
        page_count: parseInt(meta.pageCount || "1", 10),
        amount_cents: session.amount_total || 0,
        from_name: meta.fromName || "",
        from_line1: meta.fromLine1 || "",
        from_city: meta.fromCity || "",
        from_province: meta.fromProvince || "",
        from_postal: meta.fromPostal || "",
        from_country: meta.fromCountry || "CA",
        to_name: meta.toName || "",
        to_line1: meta.toLine1 || "",
        to_city: meta.toCity || "",
        to_province: meta.toProvince || "",
        to_postal: meta.toPostal || "",
        to_country: meta.toCountry || "CA",
        has_pdf_attachment: hasPdf,
        letter_html: hasHtml ? htmlContent : letterData ? buildSimpleLetterHtml(letterData, meta.letterSize || "standard") : undefined,
      };

      const { error: dbError } = await supabase
        .from("sendletter_orders")
        .insert(order);

      if (dbError) {
        console.error("DB insert failed (non-blocking):", dbError);
      }
    } catch (e) {
      console.error("DB connection failed (non-blocking):", e);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Email send error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const PAGE_H: Record<string, number> = { standard: 792, large: 792, legal: 1008 };

function printPageCss(letterSize: string): string {
  const h = PAGE_H[letterSize] || 792;
  return `
    @page { size: 8.5in ${h === 1008 ? "14in" : "11in"}; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 612px; height: ${h}px; }
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: 72px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  `;
}

function buildPrintHtml(content: string, letterSize: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${printPageCss(letterSize)}</style></head><body>${content}</body></html>`;
}

function buildSimpleLetterHtml(data: Record<string, unknown>, letterSize: string): string {
  const d = data as Record<string, string>;
  const parts: string[] = [];

  if (d.date) parts.push(`<div style="text-align:right;margin-bottom:20pt;">${d.date}</div>`);
  if (d.reference) parts.push(`<div style="margin-bottom:12pt;font-size:0.9em;">Ref: ${d.reference}</div>`);
  if (d.subject) parts.push(`<div style="margin-bottom:16pt;"><strong>Re: ${d.subject}</strong></div>`);
  if (d.greeting) parts.push(`<div style="margin-bottom:12pt;">${d.greeting}</div>`);
  if (d.body) parts.push(`<div style="white-space:pre-wrap;">${d.body}</div>`);
  if (d.closing || d.senderName) {
    let closing = `<div style="margin-top:20pt;">`;
    if (d.closing) closing += `<div>${d.closing}</div>`;
    if (d.senderName) closing += `<div style="margin-top:32pt;">${d.senderName}</div>`;
    closing += `</div>`;
    parts.push(closing);
  }
  if (d.cc) parts.push(`<div style="margin-top:16pt;font-size:0.9em;">CC: ${d.cc}</div>`);
  if (d.enclosures) parts.push(`<div style="margin-top:8pt;font-size:0.9em;">Encl.: ${d.enclosures}</div>`);
  if (d.ps) parts.push(`<div style="margin-top:12pt;font-style:italic;font-size:0.9em;">P.S. ${d.ps}</div>`);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${printPageCss(letterSize)}</style></head><body>${parts.join("\n")}</body></html>`;
}
