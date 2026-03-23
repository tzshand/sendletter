import { NextResponse } from "next/server";
import { validateApiKey, ApiAuthError } from "@/lib/api-auth";
import { getSupabase } from "@/lib/supabase";
import { PRICES } from "@/lib/pricing";
import { Resend } from "resend";

const INTERNAL_EMAIL = "colinh.shand@gmail.com";

type Address = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  province?: string;
  postal_code?: string;
  country?: string;
};

function validateAddress(addr: unknown, label: string): Address {
  const a = addr as Record<string, unknown>;
  if (!a?.name || !a?.line1 || !a?.city) {
    throw new ApiInputError(`Missing required fields in ${label} address (name, line1, city are required)`);
  }
  const country = a.country ? String(a.country) : "CA";
  // Require province and postal_code for CA and US
  if ((country === "CA" || country === "US") && (!a.province || !a.postal_code)) {
    throw new ApiInputError(`province and postal_code are required for ${country} addresses in ${label}`);
  }
  return {
    name: String(a.name),
    line1: String(a.line1),
    line2: a.line2 ? String(a.line2) : undefined,
    city: String(a.city),
    province: a.province ? String(a.province) : undefined,
    postal_code: a.postal_code ? String(a.postal_code) : undefined,
    country,
  };
}

class ApiInputError extends Error {
  constructor(message: string) {
    super(message);
  }
}

// Page dimensions at 72dpi — matches LivePreview.tsx and generatePdf.ts exactly
const PAGE = { w: 612, h: { standard: 792, large: 792, legal: 1008 }, pad: 72 };

function pageStyle(letterSize: string, font: string, fontSize: number, verticalCenter: boolean): string {
  const h = PAGE.h[letterSize as keyof typeof PAGE.h] || PAGE.h.standard;
  return `
    @page { size: 8.5in ${h === 1008 ? "14in" : "11in"}; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${PAGE.w}px; height: ${h}px; }
    body {
      font-family: "${font}", serif;
      font-size: ${fontSize}pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: ${PAGE.pad}px;
      display: flex;
      flex-direction: column;
      ${verticalCenter ? "justify-content: center;" : ""}
      overflow: hidden;
    }
  `;
}

function buildDraftHtml(
  letter: Record<string, string>,
  letterSize: string,
  options?: { font?: string; font_size?: number; vertical_center?: boolean },
): string {
  const font = options?.font || "Times New Roman";
  const fontSize = options?.font_size || 12;
  const vc = options?.vertical_center ?? false;

  // Build content blocks matching LivePreview.tsx simple letter layout exactly
  const parts: string[] = [];
  if (letter.date)
    parts.push(`<div style="text-align:right;margin-bottom:20pt;">${letter.date}</div>`);
  if (letter.reference)
    parts.push(`<div style="margin-bottom:12pt;font-size:0.9em;">Ref: ${letter.reference}</div>`);
  if (letter.subject)
    parts.push(`<div style="margin-bottom:16pt;"><strong>Re: ${letter.subject}</strong></div>`);
  if (letter.salutation)
    parts.push(`<div style="margin-bottom:12pt;">${letter.salutation}</div>`);
  if (letter.body)
    parts.push(`<div style="white-space:pre-wrap;">${letter.body}</div>`);
  if (letter.closing || letter.signature) {
    let closing = `<div style="margin-top:20pt;">`;
    if (letter.closing) closing += `<div>${letter.closing}</div>`;
    if (letter.signature) closing += `<div style="margin-top:32pt;">${letter.signature}</div>`;
    closing += `</div>`;
    parts.push(closing);
  }
  if (letter.cc)
    parts.push(`<div style="margin-top:16pt;font-size:0.9em;">CC: ${letter.cc}</div>`);
  if (letter.enclosures)
    parts.push(`<div style="margin-top:8pt;font-size:0.9em;">Encl.: ${letter.enclosures}</div>`);
  if (letter.ps)
    parts.push(`<div style="margin-top:12pt;font-style:italic;font-size:0.9em;">P.S. ${letter.ps}</div>`);

  const css = pageStyle(letterSize, font, fontSize, vc);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>${parts.join("\n")}</body></html>`;
}

function buildFormattedHtml(
  html: string,
  letterSize: string,
  options?: { css?: string; font?: string; font_size?: number; vertical_center?: boolean },
): string {
  const font = options?.font || "Times New Roman";
  const fontSize = options?.font_size || 12;
  const vc = options?.vertical_center ?? false;
  const userCss = options?.css ? `<style>${options.css}</style>` : "";

  const baseCss = pageStyle(letterSize, font, fontSize, vc);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseCss}</style>${userCss}</head><body>${html}</body></html>`;
}

export async function POST(req: Request) {
  try {
    const { accountId, keyId } = await validateApiKey(req);
    const body = await req.json();
    const { mode, letter_size = "standard", from, to } = body;

    // Validate mode
    if (!["upload", "draft", "formatted"].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "upload", "draft", or "formatted".' },
        { status: 400 }
      );
    }

    // Validate letter size
    if (!PRICES[letter_size]) {
      return NextResponse.json(
        { error: 'Invalid letter_size. Must be "standard", "large", or "legal".' },
        { status: 400 }
      );
    }

    // Validate addresses
    let fromAddr: Address, toAddr: Address;
    try {
      fromAddr = validateAddress(from, "from");
      toAddr = validateAddress(to, "to");
    } catch (e) {
      if (e instanceof ApiInputError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    // Validate content based on mode
    let letterHtml: string | undefined;
    let hasPdf = false;
    let pdfBase64: string | undefined;
    let originalFileName: string | undefined;
    let pageCount = 1;

    if (mode === "upload") {
      if (!body.file || typeof body.file !== "string") {
        return NextResponse.json({ error: "file (base64) is required for upload mode" }, { status: 400 });
      }
      if (!["pdf", "docx"].includes(body.file_type)) {
        return NextResponse.json({ error: 'file_type must be "pdf" or "docx"' }, { status: 400 });
      }
      hasPdf = body.file_type === "pdf";
      pdfBase64 = body.file;
      originalFileName = `letter.${body.file_type}`;
      pageCount = body.page_count || 1;
    } else if (mode === "draft") {
      if (!body.letter?.body) {
        return NextResponse.json({ error: "letter.body is required for draft mode" }, { status: 400 });
      }
      letterHtml = buildDraftHtml(body.letter, letter_size, {
        font: body.font,
        font_size: body.font_size,
        vertical_center: body.vertical_center,
      });
    } else if (mode === "formatted") {
      if (!body.html) {
        return NextResponse.json({ error: "html is required for formatted mode" }, { status: 400 });
      }
      letterHtml = buildFormattedHtml(body.html, letter_size, {
        css: body.css,
        font: body.font,
        font_size: body.font_size,
        vertical_center: body.vertical_center,
      });
    }

    const amountCents = PRICES[letter_size];
    const supabase = getSupabase();

    // Insert order into sendletter_orders
    const { data: order, error: orderError } = await supabase
      .from("sendletter_orders")
      .insert({
        stripe_session_id: null,
        stripe_payment_status: "api_pending_billing",
        customer_email: "",
        letter_mode: mode,
        letter_size,
        page_count: pageCount,
        amount_cents: amountCents,
        from_name: fromAddr.name,
        from_line1: fromAddr.line1,
        from_line2: fromAddr.line2 || null,
        from_city: fromAddr.city,
        from_province: fromAddr.province || "",
        from_postal: fromAddr.postal_code || "",
        from_country: fromAddr.country || "CA",
        to_name: toAddr.name,
        to_line1: toAddr.line1,
        to_line2: toAddr.line2 || null,
        to_city: toAddr.city,
        to_province: toAddr.province || "",
        to_postal: toAddr.postal_code || "",
        to_country: toAddr.country || "CA",
        has_pdf_attachment: hasPdf,
        letter_html: letterHtml || null,
        api_account_id: accountId,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert failed:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Insert usage record
    const { error: usageError } = await supabase
      .from("sendletter_api_usage")
      .insert({
        account_id: accountId,
        api_key_id: keyId,
        order_id: order.id,
        letter_mode: mode,
        letter_size,
        amount_cents: amountCents,
      });

    if (usageError) {
      console.error("Usage insert failed:", usageError);
    }

    // Send internal fulfillment email
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        const attachments: { filename: string; content: string }[] = [];

        if (pdfBase64 && pdfBase64.length < 10_000_000) {
          attachments.push({ filename: originalFileName || "letter.pdf", content: pdfBase64 });
        } else if (letterHtml) {
          attachments.push({
            filename: "letter.html",
            content: Buffer.from(letterHtml).toString("base64"),
          });
        }

        await resend.emails.send({
          from: "sendletter <noreply@sendletter.app>",
          to: INTERNAL_EMAIL,
          subject: `API Order: ${toAddr.name} in ${toAddr.city}, ${toAddr.province} — $${(amountCents / 100).toFixed(2)}`,
          html: `<h2>New API Order</h2>
<p><strong>Order ID:</strong> ${order.id}</p>
<p><strong>Mode:</strong> ${mode}</p>
<p><strong>Size:</strong> ${letter_size}</p>
<p><strong>Amount:</strong> $${(amountCents / 100).toFixed(2)} CAD</p>
<p><strong>From:</strong> ${fromAddr.name}, ${fromAddr.line1}, ${fromAddr.city} ${fromAddr.province || ""} ${fromAddr.postal_code || ""} ${fromAddr.country || "CA"}</p>
<p><strong>To:</strong> ${toAddr.name}, ${toAddr.line1}, ${toAddr.city} ${toAddr.province || ""} ${toAddr.postal_code || ""} ${toAddr.country || "CA"}</p>`,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }
    } catch (e) {
      console.error("Internal email failed (non-blocking):", e);
    }

    return NextResponse.json({
      id: order.id,
      status: "queued",
      letter_size,
      amount_cents: amountCents,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
