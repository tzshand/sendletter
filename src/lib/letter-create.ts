import { NextResponse, after } from "next/server";
import type { ApiCaller } from "@/lib/api-auth";
import { beginIdempotency, completeIdempotency, releaseIdempotency, hashRequest } from "@/lib/idempotency";
import { getLimits, recentMailings, spentToday } from "@/lib/api-limits";
import { chargeUsage } from "@/lib/invoices";
import { emitEvent } from "@/lib/webhooks";
import { serializeLetter, type Warning } from "@/lib/letters";
import { checkCanadianAddress } from "@/lib/address-checks";
import { fulfilUrl } from "@/lib/fulfil-links";
import { getDb } from "@/lib/db";
import { quote, PricingError, RATES, MAX_PAGES, MAX_FILE_BYTES, SIZE_LABELS, type LetterSize } from "@/lib/pricing";
import { Resend } from "resend";
import { escapeHtml, stripControl, sanitizeCss, sanitizeLetterHtml, LETTER_CSP } from "@/lib/sanitize";
import { safeFileName } from "@/lib/order-files";
import { putDraftFile } from "@/lib/draft-store";
import { buildPrintFiles, countPdfPages } from "@/lib/print-pdf";
import { AddressError, fromLines as fromLinesOf, toLines as toLinesOf, parseFrom } from "@/lib/address";
import { fulfilmentHtml } from "@/lib/fulfilment";
import { generateLetterPdf } from "@/lib/generatePdf";

const INTERNAL_EMAIL = "colinh.shand@gmail.com";
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://sendletter.app";

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

  // An address line is one line: a newline in a name or street would break the printed address block.
  const oneLine = (v: unknown) => stripControl(String(v)).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  const name = oneLine(a.name);
  const line1 = oneLine(a.line1);
  const line2 = a.line2 ? oneLine(a.line2) : undefined;
  const city = oneLine(a.city);
  const province = a.province ? oneLine(a.province) : undefined;
  const postalCode = a.postal_code ? oneLine(a.postal_code) : undefined;
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

  // Canadian postal codes. A DELIVERY address needs the full code: Canada Post prices an item with a
  // missing or incorrect postal code at the higher "other" Lettermail rates, so a letter stamped for
  // the standard rate would be short on postage. A return address may be looser.
  if (country === "CA" && postalCode) {
    if (label === "to") {
      if (!CA_POSTAL_REGEX.test(postalCode)) {
        throw new ApiInputError(`${label}.postal_code must be a full Canadian postal code such as "K1A 0B1". A missing or partial code is charged at higher Canada Post rates and can delay or return the letter.`);
      }
    } else {
      if (!CA_FSA_REGEX.test(postalCode)) {
        throw new ApiInputError(`${label}.postal_code must start with a valid Canadian FSA (e.g. "K1A" or "K1A 0B1")`);
      }
      if (postalCode.replace(/\s/g, "").length > 3 && !CA_POSTAL_REGEX.test(postalCode)) {
        throw new ApiInputError(`${label}.postal_code is not a valid Canadian postal code. Expected format: A1A 1A1`);
      }
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
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${LETTER_CSP}<style>${css}</style></head><body>${parts.join("\n")}</body></html>`;
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
  // The HTML is the customer's. It is opened in a browser by whoever prints it, so it is cleaned and
  // locked down: see lib/sanitize.ts.
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${LETTER_CSP}<style>${baseCss}</style>${userCss}</head><body>${sanitizeLetterHtml(html)}</body></html>`;
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

/** Everything after authentication, rate limiting and idempotency: validate, price, record, charge, hand to fulfilment. */
export async function createLetter(caller: ApiCaller, body: Record<string, unknown>): Promise<Response> {
  {
    const { accountId, keyId, livemode } = caller;

    const { mode, letter_size = "standard", from, to } = body;
    const colour = body.colour ?? body.color ?? false; // black and white unless asked
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
        return NextResponse.json({ error: e.message, code: "invalid_address" }, { status: 400 });
      }
      throw e;
    }

    // To address must be in Canada
    if (toAddr.country !== "CA") {
      return NextResponse.json(
        { error: "Delivery is currently only available to Canadian addresses. to.country must be \"CA\".", code: "unsupported_destination" },
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

    // Optional caller-side labels: kept on the order, shown on invoices, echoed on every GET and webhook.
    let reference: string | null = null;
    if (body.reference !== undefined && body.reference !== null) {
      if (typeof body.reference !== "string" || body.reference.length > 200) {
        return NextResponse.json({ error: "reference must be a string of at most 200 characters", code: "invalid_reference" }, { status: 400 });
      }
      reference = stripControl(body.reference).trim() || null;
    }
    let metadata: Record<string, string> = {};
    if (body.metadata !== undefined && body.metadata !== null) {
      const m = body.metadata as Record<string, unknown>;
      if (typeof m !== "object" || Array.isArray(m) || Object.keys(m).length > 20 ||
          Object.entries(m).some(([k, v]) => k.length > 40 || typeof v !== "string" || v.length > 500)) {
        return NextResponse.json({ error: "metadata must be an object of up to 20 string values (keys up to 40 characters, values up to 500)", code: "invalid_metadata" }, { status: 400 });
      }
      metadata = Object.fromEntries(Object.entries(m).map(([k, v]) => [stripControl(k), stripControl(v as string)]));
    }

    // Soft checks: a postal code that belongs to another province is probably a typo, not a reason to refuse.
    const warnings: Warning[] = [
      ...checkCanadianAddress("to", toAddr),
      ...(fromFree ? [] : checkCanadianAddress("from", fromAddr)),
    ];

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

    // Volume discount: the fee follows how many mailings this account has sent in
    // the last 30 days. Test letters are priced the same way, so a test shows the real price.
    const prior = await recentMailings(accountId);
    let q;
    try {
      q = quote({ pages, size, colour, duplex, channel: "api", priorMailings: prior });
    } catch (e) {
      if (e instanceof PricingError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    // Daily spend limit (live only). The customer sets it; we set the ceiling.
    if (livemode) {
      const { limitCents } = await getLimits(accountId);
      const spent = await spentToday(accountId);
      if (spent + q.totalCents > limitCents) {
        return NextResponse.json(
          {
            error: `This letter ($${(q.totalCents / 100).toFixed(2)}) would take today's spending to $${((spent + q.totalCents) / 100).toFixed(2)}, over your daily limit of $${(limitCents / 100).toFixed(2)}. Raise the limit or request an increase at https://sendletter.app/account/developers`,
            code: "daily_limit_exceeded",
            daily_limit_cents: limitCents,
            spent_today_cents: spent,
          },
          { status: 429 },
        );
      }
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

    // A customer's first live letter is charged up front, before it is accepted.
    let firstOrder = false;
    if (livemode) {
      // "First" means: nothing has ever been paid. A declined first letter leaves a cancelled order
      // behind, so counting orders would let the retry skip the up-front charge.
      const { data: paid } = await db.from("sendletter_invoices").select("id").eq("account_id", accountId).eq("status", "paid").limit(1);
      firstOrder = !paid || paid.length === 0;
    }

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
        api_key_id: keyId,
        livemode,
        reference,
        metadata: Object.keys(metadata).length ? metadata : null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert failed:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // A live letter is billable, and the billing record must exist: a letter with no
    // usage row would go out unbilled. If it cannot be written, refuse the letter.
    // (Test letters are never billed and write no usage.)
    if (livemode) {
      const { data: usage, error: usageError } = await db
        .from("sendletter_api_usage")
        .insert({
          account_id: accountId,
          api_key_id: keyId,
          order_id: order.id,
          letter_mode: mode,
          letter_size,
          amount_cents: amountCents,
          mailings: q.mailings.length,
          price_breakdown: q,
        })
        .select("id")
        .single();

      if (usageError || !usage) {
        console.error("Usage insert failed; refusing the letter:", usageError);
        await db.from("sendletter_orders").delete().eq("id", order.id);
        return NextResponse.json({ error: "Could not record this letter for billing. Nothing was sent or charged. Please retry.", code: "billing_record_failed" }, { status: 500 });
      }

      if (firstOrder) {
        const charge = await chargeUsage({ accountId, usageIds: [usage.id], kind: "first_order", periodStart: new Date(), periodEnd: new Date() });
        if (!charge.ok) {
          await db.from("sendletter_api_usage").update({ voided_at: new Date().toISOString() }).eq("id", usage.id);
          await db.from("sendletter_orders").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", order.id);
          return NextResponse.json(
            { error: `Your first letter is charged up front and your card could not be charged: ${charge.error}. Nothing was sent. Update your card at https://sendletter.app/account/developers`, code: "payment_failed" },
            { status: 402 },
          );
        }
      }
    }

    // Build the print-ready PDFs and keep everything in the project files store
    // (drafts/<order id>/) before emailing: the email attachment is skipped when
    // over the size cap, and the store is where it can always be fetched from.
    // Best effort: the order is already recorded and billed, so a failure here
    // is logged and the email still goes out with whatever we have.
    const printFiles: { name: string; bytes: Uint8Array }[] = [];
    try {
      if (!livemode) {
        // Test letter: validated and priced, never printed.
      } else if (letterPdf) {
        printFiles.push(...(await buildPrintFiles({ letterPdf, size, mailings: q.mailings, from: fromL, to: toL })));
        await putDraftFile(order.id, "letter.pdf", letterPdf, "application/pdf");
        for (const f of printFiles) await putDraftFile(order.id, f.name, Buffer.from(f.bytes), "application/pdf");
      }
      if (livemode && originalDocx) {
        await putDraftFile(order.id, `original-${safeFileName(originalFileName, "letter.docx")}`, originalDocx, "application/octet-stream");
      }
      if (livemode && (printFiles.length || originalDocx)) {
        await db.from("sendletter_orders").update({ print_files: `drafts/${order.id}/` }).eq("id", order.id);
      }
    } catch (e) {
      console.error(`API send: could not stage files for order ${order.id} (emailing what we have):`, e instanceof Error ? e.message : e);
    }

    // Send internal fulfillment email
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (livemode && resendKey) {
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
          subject: `API Order: ${toAddr.name} in ${toAddr.city}, ${toAddr.province} — $${(amountCents / 100).toFixed(2)}`.replace(/[\r\n]+/g, " "),
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
  links: { printed: fulfilUrl(ORIGIN, order.id, "printed"), mailed: fulfilUrl(ORIGIN, order.id, "mailed") },
})}`,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }
    } catch (e) {
      console.error("Internal email failed (non-blocking):", e);
    }

    const { data: row } = await db.from("sendletter_orders").select("*").eq("id", order.id).single();
    const full = row ?? { id: order.id, created_at: new Date().toISOString(), status: "pending", livemode, letter_mode: mode, letter_size, page_count: pages, amount_cents: amountCents, price_breakdown: q };
    after(() => emitEvent(accountId, livemode, "letter.created", full));
    return NextResponse.json(serializeLetter(full, { warnings }), { status: 200, headers: { "X-Letter-Id": order.id } });
  }
}

/**
 * Create one letter, safely retryable. With an idempotency key the request is
 * recorded before anything is created, so a repeat of it returns the original
 * response instead of mailing a second letter. Used by POST /api/v1/letters and,
 * once per item, by POST /api/v1/letters/batch.
 */
export async function createWithIdempotency(caller: ApiCaller, body: Record<string, unknown>, key: string | null): Promise<Response> {
  let idemRecord: string | null = null;
  try {
    if (key !== null) {
      // A test key and a live key never share a key space.
      const begun = await beginIdempotency(caller.accountId, `${caller.livemode ? "live" : "test"}:${key}`, hashRequest("POST /api/v1/letters", body));
      if (begun.kind === "replay") {
        return NextResponse.json(begun.body, { status: begun.status, headers: { "Idempotent-Replayed": "true" } });
      }
      if (begun.kind === "reject") {
        return NextResponse.json({ error: begun.message, code: begun.code }, { status: begun.status, headers: begun.retryAfter ? { "Retry-After": String(begun.retryAfter) } : {} });
      }
      idemRecord = begun.recordId;
    }

    // One letter at a time per account: the spending-limit check, the volume count and the first-order
    // charge all read state that the previous letter writes, so concurrent requests must not interleave.
    let res = await withAccountLock(caller.accountId, () => createLetter(caller, body));
    // Every error carries a stable code. Older validation errors only had a message: give them a generic one.
    if (res.status >= 400 && res.status < 500) {
      const j = await res.clone().json().catch(() => null);
      if (j && typeof j === "object" && !j.code) {
        res = NextResponse.json({ ...j, code: "invalid_request" }, { status: res.status });
      }
    }

    if (idemRecord) {
      if (res.status === 200) {
        const copy = await res.clone().json();
        await completeIdempotency(idemRecord, 200, copy, copy?.id);
      } else {
        // Nothing was created: let the caller retry with the same key.
        await releaseIdempotency(idemRecord);
      }
      idemRecord = null;
    }
    return res;
  } catch (e) {
    if (idemRecord) await releaseIdempotency(idemRecord).catch(() => undefined);
    throw e;
  }
}

export const errJson = (status: number, error: string, code: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  NextResponse.json({ error, code, ...extra }, { status, headers });


export const MAX_BATCH = 100;

// A queue per account, in this process. It makes concurrent requests for one account run one after
// another. (With several server instances two requests could still overlap; the daily limit is a
// safety net, not an accounting ledger, and the usage rows themselves are always exact.)
const accountLocks = new Map<string, Promise<unknown>>();
async function withAccountLock<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
  const prev = accountLocks.get(accountId) ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>((r) => { release = r; });
  const tail = prev.then(() => mine);
  accountLocks.set(accountId, tail);
  await prev.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (accountLocks.get(accountId) === tail) accountLocks.delete(accountId);
  }
}
