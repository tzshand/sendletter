import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getDb, DbConnectionError, type OrderInsert } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { SIZE_LABELS_BILINGUAL } from "@/lib/pricing";
import { escapeHtml, stripControl } from "@/lib/sanitize";
import { DraftStoreError, isCompleteDraft, isDraftId, loadDraft, putDraftFile } from "@/lib/draft-store";
import { quote, type LetterSize, type Quote } from "@/lib/pricing";
import { buildPrintFiles, countPdfPages, type PrintFile } from "@/lib/print-pdf";
import { fromLinesFromMetadata, toLinesFromMetadata } from "@/lib/address";
import { fulfilmentHtml, receiptHtml } from "@/lib/fulfilment";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const INTERNAL_EMAIL = "colinh.shand@gmail.com";

const SIZE_LABELS = SIZE_LABELS_BILINGUAL;

function formatAddress(name: string, line1: string, line2: string, city: string, province: string, postal: string, country?: string): string {
  const e = (s: string) => escapeHtml(stripControl(s));
  const lines = [e(name), e(line1)];
  if (line2) lines.push(e(line2));
  const cityParts = [city, province].filter(Boolean).map(e).join(", ");
  lines.push([cityParts, postal ? e(postal) : ""].filter(Boolean).join("  "));
  if (country && country !== "CA") {
    const NAMES: Record<string, string> = { US: "United States", GB: "United Kingdom", FR: "France", DE: "Germany", AU: "Australia" };
    lines.push(e(NAMES[country] || country));
  }
  return lines.join("<br/>");
}

function buildEmailHtml(meta: Record<string, string>, amount: string, date: string, pdfAttached: boolean, q?: Quote): string {
  const eh = escapeHtml;
  const size = SIZE_LABELS[meta.letterSize] || SIZE_LABELS.standard;
  const pages = eh(meta.pageCount || "1");
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
${q ? receiptHtml(q, "en") : ""}

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
  <strong>No Refunds:</strong> All sales are final. The service is considered rendered at the time of payment. Canada Post's delivery standard is 2 to 4 business days after posting (an estimate, not a guarantee).<br/>
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
${q ? receiptHtml(q, "fr") : ""}

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
  <strong>Aucun remboursement :</strong> Toutes les ventes sont finales. Le service est considéré comme rendu au moment du paiement. La norme de livraison de Postes Canada est de 2 à 4 jours ouvrables après la mise à la poste (une estimation, non une garantie).<br/>
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
  draftId: string | undefined,
  fulfilment?: string,
): string {
  const eh = escapeHtml;
  const size = SIZE_LABELS[meta.letterSize] || SIZE_LABELS.standard;
  const pages = eh(meta.pageCount || "1");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px;">

<h2 style="font-size:18px;margin:0 0 16px;color:#F0513C;">New sendletter Order</h2>

<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
  <tr><td style="padding:6px 0;color:#888;width:140px;">Date</td><td style="padding:6px 0;">${eh(date)}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Stripe Session</td><td style="padding:6px 0;font-family:monospace;font-size:11px;">${eh(sessionId)}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Customer Email</td><td style="padding:6px 0;">${eh(customerEmail)}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;font-weight:600;">${eh(amount)} CAD</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Mode</td><td style="padding:6px 0;">${eh(letterMode)}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Format</td><td style="padding:6px 0;">${size.en}</td></tr>
  <tr><td style="padding:6px 0;color:#888;">Pages</td><td style="padding:6px 0;">${pages}</td></tr>
</table>

<h3 style="font-size:14px;margin:16px 0 8px;">From (Return Address)</h3>
<p style="font-size:13px;margin:0;line-height:1.6;">
  ${eh(meta.fromName || "")}<br/>
  ${eh(meta.fromLine1 || "")}<br/>
  ${meta.fromLine2 ? eh(meta.fromLine2) + "<br/>" : ""}${eh(meta.fromCity || "")}, ${eh(meta.fromProvince || "")} ${eh(meta.fromPostal || "")}${meta.fromCountry && meta.fromCountry !== "CA" ? "<br/>" + eh(meta.fromCountry) : ""}
</p>

<h3 style="font-size:14px;margin:16px 0 8px;">To (Mailing Address)</h3>
<p style="font-size:13px;margin:0;line-height:1.6;">
  ${eh(meta.toName || "")}<br/>
  ${eh(meta.toLine1 || "")}<br/>
  ${meta.toLine2 ? eh(meta.toLine2) + "<br/>" : ""}${eh(meta.toCity || "")}, ${eh(meta.toProvince || "")} ${eh(meta.toPostal || "")}${meta.toCountry && meta.toCountry !== "CA" ? "<br/>" + eh(meta.toCountry) : ""}
</p>

${fulfilment ?? ""}
<div style="background:#f0f9f0;border-radius:8px;padding:12px 16px;font-size:12px;color:#666;margin:20px 0;">
  <strong>Attachment:</strong> ${hasPdf ? 'PDF attached' : hasHtml ? 'HTML letter content attached' : 'No attachment available'}<br/>
  <strong>Saved copy:</strong> ${draftId ? `files store: drafts/${eh(draftId)}/ (canner files ls drafts/${eh(draftId)})` : "none saved"}
</div>

</body></html>`;
}

export async function POST(req: Request) {
  try {
    // Only sessionId is needed: the document is read back from the server. The
    // rest is what pre-staging clients posted, kept for sessions already in flight.
    const body = await req.json();
    const sessionId: string | undefined = body.sessionId;
    let pdfBase64: string | undefined = body.pdfBase64;
    let htmlContent: string | undefined = body.htmlContent;
    let letterData: Record<string, unknown> | undefined = body.letterData;
    let letterMode: string | undefined = body.letterMode;
    let originalFile: { base64: string; name: string; type?: string } | undefined = body.originalFile;

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

    // Idempotency: the success page can call this endpoint more than once for
    // the same paid session (e.g. a reload), which previously sent duplicate
    // confirmation emails — and the retry often lacked the attachment because
    // the client had already cleared the uploaded file. If we've already
    // recorded an order for this session, do nothing further.
    //
    // If that probe cannot run, we must NOT proceed: an unreachable database
    // means every reload looks like a first visit, which is precisely the
    // duplicate-email bug this check exists to prevent. Fail closed and let the
    // client retry — the payment is already captured and the order is
    // recoverable from Stripe, so a delayed receipt beats a repeated one.
    let existingOrder: { id: string } | null = null;
    try {
      const existingDb = getDb();
      const res = await existingDb
        .from("sendletter_orders")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      existingOrder = res.data;
    } catch (e) {
      if (e instanceof DbConnectionError) {
        console.error("send-confirmation: database unreachable, refusing to send:", e.message);
        return NextResponse.json(
          { error: "Temporarily unavailable. Please retry." },
          { status: 503, headers: { "Retry-After": "15" } },
        );
      }
      throw e;
    }
    if (existingOrder) {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    const meta = (session.metadata || {}) as Record<string, string>;
    const amount = ((session.amount_total || 0) / 100).toFixed(2);
    const date = new Date().toLocaleDateString("en-CA");

    // The document comes from the server-side staged copy (uploaded and
    // verified before checkout, see lib/draft-store.ts), not from the browser.
    // Sessions created before staging existed have no draftId and still use
    // whatever the browser posted.
    const draftId = isDraftId(meta.draftId) ? meta.draftId : undefined;
    let stagedPdf: Buffer | null = null;
    if (draftId) {
      try {
        const staged = await loadDraft(draftId);
        stagedPdf = staged.pdf;
        if (isCompleteDraft(staged)) {
          pdfBase64 = staged.pdf?.toString("base64");
          originalFile = staged.original
            ? { base64: staged.original.data.toString("base64"), name: staged.original.name.replace(/^original-/, "") }
            : undefined;
          htmlContent = staged.meta?.htmlContent;
          letterData = staged.meta?.letterData;
          letterMode = staged.meta?.mode;
        }
      } catch (e) {
        // Can't tell "no document" from "store unreachable": don't decide, let
        // the client retry (payment is already captured; a delay is harmless).
        console.error("send-confirmation: draft store unreachable, refusing to proceed:", e instanceof DraftStoreError ? e.message : e);
        return NextResponse.json(
          { error: "Temporarily unavailable. Please retry." },
          { status: 503, headers: { "Retry-After": "15" } },
        );
      }
    }

    const hasOriginal = !!(originalFile && originalFile.base64 && typeof originalFile.base64 === "string");
    const hasPdf = !!(pdfBase64 && typeof pdfBase64 === "string");
    const hasHtml = !!(htmlContent && typeof htmlContent === "string");
    const hasAttachment = hasOriginal || hasPdf;
    const mode = letterMode || meta.letterMode || "unknown";

    // Price the order again from the staged PDF's real page count (the same
    // quote checkout charged, see lib/pricing.ts) and build the print-ready PDFs.
    // Best effort: the customer has paid, so a failure here is logged and the
    // order still goes through with the plain letter attached.
    let q: Quote | undefined;
    const printFiles: PrintFile[] = [];
    if (draftId && stagedPdf) {
      try {
        const pages = await countPdfPages(stagedPdf);
        q = quote({
          pages,
          size: (meta.letterSize as LetterSize) || "standard",
          colour: meta.colour !== "0",
          duplex: meta.duplex !== "0",
          channel: "web",
        });
        if (q.totalCents !== (session.amount_total ?? 0)) {
          console.error(`send-confirmation: charged ${session.amount_total} but quote is ${q.totalCents} for ${sessionId} (rates ${meta.pricingVersion} -> ${q.version})`);
        }
        printFiles.push(
          ...(await buildPrintFiles({
            letterPdf: stagedPdf,
            size: q.size,
            mailings: q.mailings,
            from: fromLinesFromMetadata(meta),
            to: toLinesFromMetadata(meta),
          })),
        );
        for (const f of printFiles) await putDraftFile(draftId, f.name, Buffer.from(f.bytes), "application/pdf");
      } catch (e) {
        console.error(`send-confirmation: could not build print files for ${sessionId}:`, e instanceof Error ? e.message : e);
      }
    }

    const saveOrder = async () => {
      try {
        const db = getDb();
        const order: OrderInsert = {
          stripe_session_id: sessionId,
          stripe_payment_status: session.payment_status,
          customer_email: email,
          letter_mode: mode,
          letter_size: meta.letterSize || "standard",
          page_count: q ? q.pages : parseInt(meta.pageCount || "1", 10),
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
          ...(q
            ? {
                colour: q.colour,
                duplex: q.duplex,
                mailings: q.mailings.length,
                sheets: q.mailings.reduce((n, m) => n + m.sheets, 0),
                stamps: q.stamps,
                est_weight_g: q.mailings.reduce((n, m) => n + m.weightGrams, 0),
                price_breakdown: q,
                pricing_version: q.version,
                from_lines: meta.fromLines || null,
                print_files: printFiles.length ? `drafts/${draftId}/` : null,
              }
            : {}),
        };
        const { error: dbError } = await db.from("sendletter_orders").insert(order);
        if (dbError) console.error("DB insert failed (non-blocking):", dbError);
      } catch (e) {
        console.error("DB connection failed (non-blocking):", e);
      }
    };

    // Build customer confirmation email
    const customerHtml = buildEmailHtml(meta, amount, date, hasAttachment, q);

    const resend = getResend();

    // Prepare attachments for customer email
    const customerAttachments: { filename: string; content: string }[] = [];
    if (originalFile?.base64 && originalFile.base64.length < 10_000_000) {
      customerAttachments.push({ filename: originalFile.name, content: originalFile.base64 });
    } else if (pdfBase64 && pdfBase64.length < 10_000_000) {
      customerAttachments.push({ filename: "letter.pdf", content: pdfBase64 });
    }

    if (hasAttachment && customerAttachments.length === 0) {
      console.warn(`send-confirmation: upload for ${session.id} is over the email size cap; not attached to the customer email (staged: drafts/${draftId ?? "none"})`);
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
    let printAttachedBytes = 0;
    const printAttached: string[] = [];
    const printAttachments: { filename: string; content: string }[] = [];
    for (const f of printFiles) {
      const b64 = Buffer.from(f.bytes).toString("base64");
      if (printAttachedBytes + b64.length > 8_000_000) {
        console.warn(`send-confirmation: print PDFs for ${sessionId} are over the email size cap; not attached (staged: drafts/${draftId}/)`);
        break;
      }
      printAttachedBytes += b64.length;
      printAttachments.push({ filename: f.name, content: b64 });
      printAttached.push(f.name);
    }
    const internalHtml = buildInternalEmailHtml(
      meta, amount, date, email, sessionId, mode, hasAttachment, hasHtml, draftId,
      q
        ? fulfilmentHtml({
            q,
            from: fromLinesFromMetadata(meta),
            to: toLinesFromMetadata(meta),
            stagedPath: draftId ? `drafts/${draftId}/` : undefined,
            printFiles: printFiles.map((f) => f.name),
            attached: printAttached,
          })
        : undefined,
    );

    // Prepare attachments for internal email (original + generated PDF)
    const internalAttachments: { filename: string; content: string }[] = [];
    // Attach original file if available (docx as uploaded)
    if (originalFile?.base64 && originalFile.base64.length < 10_000_000) {
      internalAttachments.push({ filename: originalFile.name, content: originalFile.base64 });
    }
    // The print-ready PDFs when we built them; otherwise the plain letter.
    if (printAttachments.length) {
      internalAttachments.push(...printAttachments);
    } else if (pdfBase64 && pdfBase64.length < 10_000_000) {
      internalAttachments.push({ filename: "letter.pdf", content: pdfBase64 });
    }
    // Always include the letter text when we have it, even alongside a PDF: the
    // PDF is rendered in the customer's browser, so if it came out wrong this
    // is the copy we can re-render from.
    if (htmlContent) {
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

    if (hasAttachment && !internalAttachments.some((a) => a.filename !== "letter.html")) {
      console.warn(`send-confirmation: upload for ${session.id} is over the email size cap; not attached to the internal email (staged: drafts/${draftId ?? "none"})`);
    }

    // Send internal order email
    try {
      await resend.emails.send({
        from: "sendletter <noreply@sendletter.app>",
        to: INTERNAL_EMAIL,
        subject: `New Order: ${stripControl(meta.toName || "")} in ${stripControl(meta.toCity || "")}, ${stripControl(meta.toProvince || "")} — $${amount}`,
        html: internalHtml,
        attachments: internalAttachments.length > 0 ? internalAttachments : undefined,
      });
    } catch (e) {
      console.error("Internal email failed (non-blocking):", e);
    }

    // Save order to database
    await saveOrder();

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
    /* min-height, not height, and no clipping: a letter longer than one page
       must flow onto the next. This file is the recovery copy of the text. */
    html, body { width: 612px; min-height: ${h}px; }
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: 72px;
    }
  `;
}

function buildPrintHtml(content: string, letterSize: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${printPageCss(letterSize)}</style></head><body>${content}</body></html>`;
}

function buildSimpleLetterHtml(data: Record<string, unknown>, letterSize: string): string {
  const d = data as Record<string, string>;
  const e = (s: string) => escapeHtml(stripControl(s));
  const parts: string[] = [];

  if (d.date) parts.push(`<div style="text-align:right;margin-bottom:20pt;">${e(d.date)}</div>`);
  if (d.reference) parts.push(`<div style="margin-bottom:12pt;font-size:0.9em;">Ref: ${e(d.reference)}</div>`);
  if (d.subject) parts.push(`<div style="margin-bottom:16pt;"><strong>Re: ${e(d.subject)}</strong></div>`);
  if (d.greeting) parts.push(`<div style="margin-bottom:12pt;">${e(d.greeting)}</div>`);
  if (d.body) parts.push(`<div style="white-space:pre-wrap;">${e(d.body)}</div>`);
  if (d.closing || d.senderName) {
    let closing = `<div style="margin-top:20pt;">`;
    if (d.closing) closing += `<div>${e(d.closing)}</div>`;
    if (d.senderName) closing += `<div style="margin-top:32pt;">${e(d.senderName)}</div>`;
    closing += `</div>`;
    parts.push(closing);
  }
  if (d.cc) parts.push(`<div style="margin-top:16pt;font-size:0.9em;">CC: ${e(d.cc)}</div>`);
  if (d.enclosures) parts.push(`<div style="margin-top:8pt;font-size:0.9em;">Encl.: ${e(d.enclosures)}</div>`);
  if (d.ps) parts.push(`<div style="margin-top:12pt;font-style:italic;font-size:0.9em;">P.S. ${e(d.ps)}</div>`);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${printPageCss(letterSize)}</style></head><body>${parts.join("\n")}</body></html>`;
}
