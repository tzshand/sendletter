import { NextResponse } from "next/server";
import { validateApiKey, ApiAuthError } from "@/lib/api-auth";
import { getDb, DbConnectionError } from "@/lib/db";
import { quote, PricingError, RATES, MAX_PAGES, MAX_FILE_BYTES, SIZE_LABELS, type LetterSize } from "@/lib/pricing";
import { Resend } from "resend";
import { escapeHtml, stripControl, sanitizeCss } from "@/lib/sanitize";
import { safeFileName } from "@/lib/order-files";
import { putDraftFile } from "@/lib/draft-store";
import { buildPrintFiles, countPdfPages } from "@/lib/print-pdf";
import { AddressError, fromLines as fromLinesOf, toLines as toLinesOf, parseFrom } from "@/lib/address";
import { fulfilmentHtml } from "@/lib/fulfilment";
import { generateLetterPdf } from "@/lib/generatePdf";

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

  const name = stripControl(String(a.name).trim());
  const line1 = stripControl(String(a.line1).trim());
  const line2 = a.line2 ? stripControl(String(a.line2).trim()) : undefined;
  const city = stripControl(String(a.city).trim());
  const province = a.province ? stripControl(String(a.province).trim()) : undefined;
  const postalCode = a.postal_code ? stripControl(String(a.postal_code).trim()) : undefined;
  const country = a.country ? stripControl(String(a.country).trim().toUpperCase()) : "CA";

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
    /* min-height and no clipping: a letter longer than one page flows onto the next. */
    html, body { width: ${PAGE.w}px; min-height: ${h}px; }
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
  // All fields are plain text — escape to prevent HTML injection
  const e = (s: string) => escapeHtml(stripControl(s));
  const parts: string[] = [];
  if (letter.date)
    parts.push(`<div style="text-align:right;margin-bottom:20pt;">${e(letter.date)}</div>`);
  if (letter.reference)
    parts.push(`<div style="margin-bottom:12pt;font-size:0.9em;">Ref: ${e(letter.reference)}</div>`);
  if (letter.subject)
    parts.push(`<div style="margin-bottom:16pt;"><strong>Re: ${e(letter.subject)}</strong></div>`);
  if (letter.salutation)
    parts.push(`<div style="margin-bottom:12pt;">${e(letter.salutation)}</div>`);
  if (letter.body)
    parts.push(`<div style="white-space:pre-wrap;">${e(letter.body)}</div>`);
  if (letter.closing || letter.signature) {
    let closing = `<div style="margin-top:20pt;">`;
    if (letter.closing) closing += `<div>${e(letter.closing)}</div>`;
    if (letter.signature) closing += `<div style="margin-top:32pt;">${e(letter.signature)}</div>`;
    closing += `</div>`;
    parts.push(closing);
  }
  if (letter.cc)
    parts.push(`<div style="margin-top:16pt;font-size:0.9em;">CC: ${e(letter.cc)}</div>`);
  if (letter.enclosures)
    parts.push(`<div style="margin-top:8pt;font-size:0.9em;">Encl.: ${e(letter.enclosures)}</div>`);
  if (letter.ps)
    parts.push(`<div style="margin-top:12pt;font-style:italic;font-size:0.9em;">P.S. ${e(letter.ps)}</div>`);

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
  const userCss = options?.css ? `<style>${sanitizeCss(options.css)}</style>` : "";

  const baseCss = pageStyle(letterSize, font, fontSize, vc);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseCss}</style>${userCss}</head><body>${html}</body></html>`;
}

// Limits
const MAX_BASE64_FILE = Math.ceil((MAX_FILE_BYTES * 4) / 3);
const MAX_HTML_SIZE = 500_000; // 500 KB
const MAX_BODY_SIZE = 50_000; // 50 KB of text
const ALLOWED_FONTS = ["Times New Roman", "Georgia", "Arial", "Helvetica", "Courier New", "Verdana"];
// Largest set of print PDFs we will attach to the fulfilment email (base64 bytes).
const MAX_EMAIL_ATTACH = 8_000_000;

/**
 * "formatted" HTML can't be laid out on the server, so its page count is an
 * estimate (about 2,400 characters or 38 blocks per page at 12 pt, plus a
 * quarter page per image). Integrators should send page_count; we use theirs
 * when given.
 */
function estimateHtmlPages(html: string): number {
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  const chars = text.replace(/\s+/g, " ").trim().length;
  const blocks = (html.match(/<(p|div|h[1-6]|li|tr|br)\b/gi) || []).length;
  const imgs = (html.match(/<img\b/gi) || []).length;
  return Math.max(1, Math.ceil(Math.max(chars / 2400, blocks / 38) + imgs * 0.25));
}

function pageCountFrom(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PAGES ? n : NaN;
}

export async function POST(req: Request) {
  try {
    const { accountId, keyId } = await validateApiKey(req);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body. Ensure all strings are properly escaped — double quotes inside values must be written as \\". Example: "name": "John \\"Jr\\" Smith"' },
        { status: 400 },
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    const { mode, letter_size = "standard", from, to } = body;
    const colour = body.colour ?? body.color ?? true;
    const duplex = body.duplex ?? true;

    // Validate mode
    if (!mode || typeof mode !== "string") {
      return NextResponse.json(
        { error: 'mode is required. Must be "upload", "draft", or "formatted".' },
        { status: 400 }
      );
    }
    if (!["upload", "draft", "formatted"].includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be "upload", "draft", or "formatted".` },
        { status: 400 }
      );
    }

    // Validate letter size and print options
    if (typeof letter_size !== "string" || !(letter_size in RATES.envelopeCents)) {
      return NextResponse.json(
        { error: `Invalid letter_size. Must be "standard", "large", or "legal".` },
        { status: 400 }
      );
    }
    const size = letter_size as LetterSize;
    if (typeof colour !== "boolean" || typeof duplex !== "boolean") {
      return NextResponse.json({ error: "colour (or color) and duplex must be booleans" }, { status: 400 });
    }

    // Validate addresses exist
    if (!from) {
      return NextResponse.json({ error: "from address is required" }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ error: "to address is required" }, { status: 400 });
    }

    let fromAddr: Address, toAddr: Address;
    let fromFree: string[] | null = null;
    try {
      const rawFrom = from as Record<string, unknown>;
      if (rawFrom && Array.isArray(rawFrom.lines)) {
        // Free-form return address: a few unlabeled lines, for senders whose address doesn't fit our fields.
        const parsed = parseFrom({ lines: rawFrom.lines });
        fromFree = parsed.kind === "freeform" ? parsed.lines : null;
        fromAddr = { name: fromFree![0], line1: fromFree![1] ?? "", city: "", country: "" };
      } else {
        fromAddr = validateAddress(from, "from");
      }
      toAddr = validateAddress(to, "to");
    } catch (e) {
      if (e instanceof ApiInputError || e instanceof AddressError) {
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
    if (body.font !== undefined) {
      if (typeof body.font !== "string") {
        return NextResponse.json({ error: "font must be a string" }, { status: 400 });
      }
      if (!ALLOWED_FONTS.includes(body.font)) {
        return NextResponse.json(
          { error: `Invalid font "${escapeHtml(body.font)}". Allowed fonts: ${ALLOWED_FONTS.join(", ")}` },
          { status: 400 },
        );
      }
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

    // Validate content based on mode, and work out the page count. The price
    // depends on it, so wherever we can lay the letter out ourselves (PDFs and
    // drafts) the count is ours, not the caller's.
    let letterHtml: string | undefined;
    let letterPdf: Buffer | undefined; // what we print
    let originalDocx: Buffer | undefined;
    let originalFileName: string | undefined;
    let pages = 1;

    const givenPages = pageCountFrom(body.page_count);
    if (Number.isNaN(givenPages)) {
      return NextResponse.json({ error: `page_count must be a whole number from 1 to ${MAX_PAGES}` }, { status: 400 });
    }

    if (mode === "upload") {
      if (!body.file || typeof body.file !== "string") {
        return NextResponse.json({ error: "file (base64 string) is required for upload mode" }, { status: 400 });
      }
      if ((body.file as string).length > MAX_BASE64_FILE) {
        return NextResponse.json({ error: `file exceeds maximum size of ${MAX_FILE_BYTES / 1024 / 1024} MB` }, { status: 400 });
      }
      if (!body.file_type || !["pdf", "docx"].includes(body.file_type as string)) {
        return NextResponse.json({ error: 'file_type is required and must be "pdf" or "docx"' }, { status: 400 });
      }
      const bytes = Buffer.from(body.file as string, "base64");
      originalFileName = `letter.${body.file_type}`;
      if (body.file_type === "pdf") {
        try {
          pages = await countPdfPages(bytes);
        } catch {
          return NextResponse.json({ error: "file could not be read as a PDF" }, { status: 400 });
        }
        letterPdf = bytes;
      } else {
        // A .docx can't be paginated here, so the caller must say how long it is.
        if (givenPages === undefined) {
          return NextResponse.json({ error: "page_count is required for docx uploads" }, { status: 400 });
        }
        pages = givenPages;
        originalDocx = bytes;
      }
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
      // Validate all letter fields are strings and within length limits
      const LETTER_FIELDS = ["date", "reference", "subject", "salutation", "body", "closing", "signature", "cc", "enclosures", "ps"];
      for (const field of LETTER_FIELDS) {
        const val = letter[field];
        if (val !== undefined && val !== null) {
          if (typeof val !== "string") {
            return NextResponse.json({ error: `letter.${field} must be a string` }, { status: 400 });
          }
          if (field !== "body" && val.length > MAX_FIELD_LENGTH) {
            return NextResponse.json({ error: `letter.${field} exceeds maximum length of ${MAX_FIELD_LENGTH} characters` }, { status: 400 });
          }
        }
      }
      letterHtml = buildDraftHtml(body.letter as Record<string, string>, letter_size, {
        font: body.font as string,
        font_size: body.font_size as number,
        vertical_center: body.vertical_center as boolean,
      });
      // Render the real PDF: its page count prices the order and it is what we print.
      const l = letter as Record<string, string>;
      const rendered = await generateLetterPdf({
        mode: "simple",
        letterData: {
          date: l.date ?? "", reference: l.reference ?? "", subject: l.subject ?? "", greeting: l.salutation ?? "",
          body: l.body, closing: l.closing ?? "", senderName: l.signature ?? "", cc: l.cc ?? "",
          enclosures: l.enclosures ?? "", ps: l.ps ?? "",
        },
        htmlContent: "",
        settings: {
          language: "en",
          fontFamily: (body.font as string | undefined) ?? "Times New Roman",
          fontSize: (body.font_size as number | undefined) ?? 12,
          verticalCenter: (body.vertical_center as boolean | undefined) ?? false,
        } as never,
        letterSize: size,
      });
      if (!rendered) {
        return NextResponse.json({ error: "Could not render the letter" }, { status: 500 });
      }
      letterPdf = Buffer.from(rendered.base64, "base64");
      pages = rendered.pageCount ?? (await countPdfPages(letterPdf));
    } else if (mode === "formatted") {
      if (!body.html || typeof body.html !== "string") {
        return NextResponse.json({ error: "html (string) is required for formatted mode" }, { status: 400 });
      }
      if ((body.html as string).length > MAX_HTML_SIZE) {
        return NextResponse.json({ error: `html exceeds maximum size of ${MAX_HTML_SIZE} characters` }, { status: 400 });
      }
      if (body.css !== undefined && typeof body.css !== "string") {
        return NextResponse.json({ error: "css must be a string" }, { status: 400 });
      }
      if (typeof body.css === "string" && body.css.length > MAX_HTML_SIZE) {
        return NextResponse.json({ error: `css exceeds maximum size of ${MAX_HTML_SIZE} characters` }, { status: 400 });
      }
      letterHtml = buildFormattedHtml(body.html as string, letter_size, {
        css: body.css as string,
        font: body.font as string,
        font_size: body.font_size as number,
        vertical_center: body.vertical_center as boolean,
      });
      pages = givenPages ?? estimateHtmlPages(body.html as string);
    }

    let q;
    try {
      q = quote({ pages, size, colour, duplex, channel: "api" });
    } catch (e) {
      if (e instanceof PricingError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    const toL = toLinesOf({
      name: toAddr.name, line1: toAddr.line1, line2: toAddr.line2 ?? "", city: toAddr.city,
      province: toAddr.province ?? "", postalCode: toAddr.postal_code ?? "",
    });
    const fromL =
      fromFree ??
      fromLinesOf({
        kind: "structured", name: fromAddr.name, line1: fromAddr.line1, line2: fromAddr.line2 ?? "", city: fromAddr.city,
        province: fromAddr.province ?? "", postalCode: fromAddr.postal_code ?? "", country: fromAddr.country ?? "CA",
      });

    const db = getDb();
    const amountCents = q.totalCents;

    // Insert order into sendletter_orders
    const { data: order, error: orderError } = await db
      .from("sendletter_orders")
      .insert({
        stripe_session_id: null,
        stripe_payment_status: "api_pending_billing",
        customer_email: "",
        letter_mode: mode,
        letter_size,
        page_count: pages,
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
        has_pdf_attachment: !!letterPdf,
        letter_html: letterHtml || null,
        colour,
        duplex,
        mailings: q.mailings.length,
        sheets: q.mailings.reduce((s, m) => s + m.sheets, 0),
        stamps: q.stamps,
        est_weight_g: q.mailings.reduce((s, m) => s + m.weightGrams, 0),
        price_breakdown: q,
        pricing_version: q.version,
        from_lines: fromFree ? fromFree.join("\n") : null,
        api_account_id: accountId,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert failed:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Insert usage record
    const { error: usageError } = await db
      .from("sendletter_api_usage")
      .insert({
        account_id: accountId,
        api_key_id: keyId,
        order_id: order.id,
        letter_mode: mode,
        letter_size,
        amount_cents: amountCents,
        price_breakdown: q,
      });

    if (usageError) {
      console.error("Usage insert failed:", usageError);
    }

    // Build the print-ready PDFs and keep everything in the project files store
    // (drafts/<order id>/) before emailing: the email attachment is skipped when
    // over the size cap, and the store is where it can always be fetched from.
    // Best effort: the order is already recorded and billed, so a failure here
    // is logged and the email still goes out with whatever we have.
    const printFiles: { name: string; bytes: Uint8Array }[] = [];
    try {
      if (letterPdf) {
        printFiles.push(...(await buildPrintFiles({ letterPdf, size, mailings: q.mailings, from: fromL, to: toL })));
        await putDraftFile(order.id, "letter.pdf", letterPdf, "application/pdf");
        for (const f of printFiles) await putDraftFile(order.id, f.name, Buffer.from(f.bytes), "application/pdf");
      }
      if (originalDocx) {
        await putDraftFile(order.id, `original-${safeFileName(originalFileName, "letter.docx")}`, originalDocx, "application/octet-stream");
      }
      if (printFiles.length || originalDocx) {
        await db.from("sendletter_orders").update({ print_files: `drafts/${order.id}/` }).eq("id", order.id);
      }
    } catch (e) {
      console.error(`API send: could not stage files for order ${order.id} (emailing what we have):`, e instanceof Error ? e.message : e);
    }

    // Send internal fulfillment email
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        const attachments: { filename: string; content: string }[] = [];
        let attachedBytes = 0;
        const attachedNames: string[] = [];

        for (const f of printFiles) {
          const b64 = Buffer.from(f.bytes).toString("base64");
          if (attachedBytes + b64.length > MAX_EMAIL_ATTACH) {
            console.warn(`API send: print PDFs for order ${order.id} are over the email size cap; not attached (staged: drafts/${order.id}/)`);
            break;
          }
          attachedBytes += b64.length;
          attachments.push({ filename: f.name, content: b64 });
          attachedNames.push(f.name);
        }
        if (originalDocx && originalDocx.length * 1.34 < MAX_EMAIL_ATTACH) {
          attachments.push({ filename: originalFileName || "letter.docx", content: originalDocx.toString("base64") });
        }
        if (letterHtml && mode === "formatted") {
          attachments.push({ filename: "letter.html", content: Buffer.from(letterHtml).toString("base64") });
        }

        const eh = escapeHtml;
        await resend.emails.send({
          from: "sendletter <noreply@sendletter.app>",
          to: INTERNAL_EMAIL,
          subject: `API Order: ${toAddr.name} in ${toAddr.city}, ${toAddr.province} — $${(amountCents / 100).toFixed(2)}`,
          html: `<h2>New API Order</h2>
<p><strong>Order ID:</strong> ${order.id}</p>
<p><strong>Mode:</strong> ${eh(mode)}${mode === "formatted" && givenPages === undefined ? " &mdash; page count is an ESTIMATE (no page_count sent): check it when printing" : ""}</p>
<p><strong>Size:</strong> ${eh(SIZE_LABELS[size])}</p>
<p><strong>From:</strong> ${eh(fromL.join(", "))}</p>
<p><strong>To:</strong> ${eh(toL.join(", "))}</p>
${fulfilmentHtml({
  q,
  from: fromL,
  to: toL,
  stagedPath: printFiles.length || originalDocx ? `drafts/${order.id}/` : undefined,
  printFiles: printFiles.map((f) => f.name),
  attached: attachedNames,
})}`,
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
      pages,
      mailings: q.mailings.length,
      stamps: q.stamps,
      colour,
      duplex,
      amount_cents: amountCents,
      price: {
        version: q.version,
        lines: q.lines.map((l) => ({ item: l.key, qty: l.qty, unit_cents: l.unitCents, total_cents: l.totalCents })),
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // 503, not 401 or 500: the request was well-formed and the credential may
    // be perfectly good — our datastore is down. Retryable, and says so.
    if (error instanceof DbConnectionError) {
      console.error("API send: database unreachable:", error.message);
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please retry." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("API send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
