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

// Canadian FSA format: letter-digit-letter (first 3 chars of postal code)
const CA_FSA_REGEX = /^[A-Za-z]\d[A-Za-z]/;
const CA_POSTAL_REGEX = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
const MAX_FIELD_LENGTH = 200;

function validateAddress(addr: unknown, label: string): Address {
  if (!addr || typeof addr !== "object") {
    throw new ApiInputError(`${label} address is required and must be an object`);
  }
  const a = addr as Record<string, unknown>;
  if (!a.name || typeof a.name !== "string" || !a.name.trim()) {
    throw new ApiInputError(`${label}.name is required`);
  }
  if (!a.line1 || typeof a.line1 !== "string" || !a.line1.trim()) {
    throw new ApiInputError(`${label}.line1 is required`);
  }
  if (!a.city || typeof a.city !== "string" || !a.city.trim()) {
    throw new ApiInputError(`${label}.city is required`);
  }

  const name = String(a.name).trim();
  const line1 = String(a.line1).trim();
  const line2 = a.line2 ? String(a.line2).trim() : undefined;
  const city = String(a.city).trim();
  const province = a.province ? String(a.province).trim() : undefined;
  const postalCode = a.postal_code ? String(a.postal_code).trim() : undefined;
  const country = a.country ? String(a.country).trim().toUpperCase() : "CA";

  // Length limits
  for (const [field, val] of [["name", name], ["line1", line1], ["line2", line2], ["city", city], ["province", province], ["postal_code", postalCode]] as const) {
    if (val && val.length > MAX_FIELD_LENGTH) {
      throw new ApiInputError(`${label}.${field} exceeds maximum length of ${MAX_FIELD_LENGTH} characters`);
    }
  }

  // Country code must be 2 letters
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new ApiInputError(`${label}.country must be a 2-letter ISO country code (e.g. "CA", "US")`);
  }

  // CA/US require province and postal_code
  if (country === "CA" || country === "US") {
    if (!province) {
      throw new ApiInputError(`${label}.province is required for ${country} addresses`);
    }
    if (!postalCode) {
      throw new ApiInputError(`${label}.postal_code is required for ${country} addresses`);
    }
  }

  // Canadian postal code must match at least FSA format
  if (country === "CA" && postalCode) {
    if (!CA_FSA_REGEX.test(postalCode)) {
      throw new ApiInputError(`${label}.postal_code must start with a valid Canadian FSA (e.g. "K1A" or "K1A 0B1")`);
    }
    if (postalCode.replace(/\s/g, "").length > 3 && !CA_POSTAL_REGEX.test(postalCode)) {
      throw new ApiInputError(`${label}.postal_code is not a valid Canadian postal code. Expected format: A1A 1A1`);
    }
  }

  return { name, line1, line2, city, province, postal_code: postalCode, country };
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

// Limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB base64
const MAX_HTML_SIZE = 500_000; // 500 KB
const MAX_BODY_SIZE = 50_000; // 50 KB of text
const MAX_PAGE_COUNT = 15;
const ALLOWED_FONTS = ["Times New Roman", "Georgia", "Arial", "Helvetica", "Courier New", "Verdana"];

export async function POST(req: Request) {
  try {
    const { accountId, keyId } = await validateApiKey(req);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { mode, letter_size = "standard", from, to } = body;

    // Validate mode
    if (!mode || typeof mode !== "string") {
      return NextResponse.json(
        { error: 'mode is required. Must be "upload", "draft", or "formatted".' },
        { status: 400 }
      );
    }
    if (!["upload", "draft", "formatted"].includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode "${mode}". Must be "upload", "draft", or "formatted".` },
        { status: 400 }
      );
    }

    // Validate letter size
    if (!PRICES[letter_size as string]) {
      return NextResponse.json(
        { error: `Invalid letter_size "${letter_size}". Must be "standard", "large", or "legal".` },
        { status: 400 }
      );
    }

    // Validate addresses exist
    if (!from) {
      return NextResponse.json({ error: "from address is required" }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ error: "to address is required" }, { status: 400 });
    }

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

    // To address must be in Canada
    if (toAddr.country !== "CA") {
      return NextResponse.json(
        { error: "Delivery is currently only available to Canadian addresses. to.country must be \"CA\"." },
        { status: 400 }
      );
    }

    // Validate optional font
    if (body.font && typeof body.font === "string" && !ALLOWED_FONTS.includes(body.font)) {
      return NextResponse.json(
        { error: `Invalid font. Allowed fonts: ${ALLOWED_FONTS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate optional font_size
    if (body.font_size !== undefined) {
      const fs = Number(body.font_size);
      if (isNaN(fs) || fs < 8 || fs > 24) {
        return NextResponse.json(
          { error: "font_size must be a number between 8 and 24" },
          { status: 400 }
        );
      }
    }

    // Validate content based on mode
    let letterHtml: string | undefined;
    let hasPdf = false;
    let pdfBase64: string | undefined;
    let originalFileName: string | undefined;
    let pageCount = 1;

    if (mode === "upload") {
      if (!body.file || typeof body.file !== "string") {
        return NextResponse.json({ error: "file (base64 string) is required for upload mode" }, { status: 400 });
      }
      if ((body.file as string).length > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `file exceeds maximum size of 10 MB` }, { status: 400 });
      }
      if (!body.file_type || !["pdf", "docx"].includes(body.file_type as string)) {
        return NextResponse.json({ error: 'file_type is required and must be "pdf" or "docx"' }, { status: 400 });
      }
      hasPdf = body.file_type === "pdf";
      pdfBase64 = body.file as string;
      originalFileName = `letter.${body.file_type}`;
      const rawPageCount = Number(body.page_count) || 1;
      pageCount = Math.max(1, Math.min(rawPageCount, MAX_PAGE_COUNT));
    } else if (mode === "draft") {
      if (!body.letter || typeof body.letter !== "object") {
        return NextResponse.json({ error: "letter object is required for draft mode" }, { status: 400 });
      }
      const letter = body.letter as Record<string, unknown>;
      if (!letter.body || typeof letter.body !== "string" || !letter.body.trim()) {
        return NextResponse.json({ error: "letter.body is required for draft mode" }, { status: 400 });
      }
      if ((letter.body as string).length > MAX_BODY_SIZE) {
        return NextResponse.json({ error: `letter.body exceeds maximum size of ${MAX_BODY_SIZE} characters` }, { status: 400 });
      }
      letterHtml = buildDraftHtml(body.letter as Record<string, string>, letter_size as string, {
        font: body.font as string,
        font_size: body.font_size as number,
        vertical_center: body.vertical_center as boolean,
      });
    } else if (mode === "formatted") {
      if (!body.html || typeof body.html !== "string") {
        return NextResponse.json({ error: "html (string) is required for formatted mode" }, { status: 400 });
      }
      if ((body.html as string).length > MAX_HTML_SIZE) {
        return NextResponse.json({ error: `html exceeds maximum size of ${MAX_HTML_SIZE} characters` }, { status: 400 });
      }
      letterHtml = buildFormattedHtml(body.html as string, letter_size as string, {
        css: body.css as string,
        font: body.font as string,
        font_size: body.font_size as number,
        vertical_center: body.vertical_center as boolean,
      });
    }

    const amountCents = PRICES[letter_size as string];
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
