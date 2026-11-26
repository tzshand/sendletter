import { RATES, MAX_PAGES, MAX_FILE_BYTES, quote } from "@/lib/pricing";
import { VOLUME, volumeTable, API_FROM_ALL_IN_CENTS } from "@/lib/volume";
import { WEBHOOK_EVENTS, RETRY_DELAYS_MS, MAX_ATTEMPTS } from "@/lib/webhooks";
import { RATE_LIMIT } from "@/lib/rate-limit";
import { IDEMPOTENCY_TTL_DAYS } from "@/lib/idempotency";
import { MAX_BATCH } from "@/lib/letter-create";

const $ = (c: number) => `$${(c / 100).toFixed(2)}`;

// The complete API reference as plain text for LLMs and agents. Generated from the
// same constants the API enforces, so it cannot go out of date with the code.
export function GET() {
  const one = (prior: number) => quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: prior }).totalCents;
  const body = `# sendletter API: full reference

> Complete reference for LLMs and AI agents. Human docs: https://sendletter.app/docs. OpenAPI 3.1: https://sendletter.app/openapi.json. Summary: https://sendletter.app/llms.txt

sendletter prints, folds, stamps and mails a physical letter to a Canadian address with Canada Post, usually within one business day, from one HTTP request. Letters by API cost as low as ${$(API_FROM_ALL_IN_CENTS)} all in (postage included) with automatic volume pricing and no monthly fee. Delivery is to Canadian addresses only; the return address can be anywhere. Support: support@sendletter.app

## Base URL and auth

Base URL: https://sendletter.app
Auth: Authorization: Bearer <key>
- sl_live_... : mails and bills real letters. Needs a card on file (402 payment_method_required otherwise).
- sl_test_... : validates and prices a letter, never prints, mails or bills. Needs no card. Test and live letters, keys and idempotency keys are separate.
Create keys at https://sendletter.app/account/developers (one live and one test key at a time).
Rate limit: ${RATE_LIMIT.perMinute} requests a minute per key (headers X-RateLimit-Limit, X-RateLimit-Remaining; Retry-After on 429). POST /api/v1/quote without a key and GET /api/v1/pricing are public.

## Endpoints

POST   /api/v1/letters               Send a letter (alias: POST /api/v1/send)
POST   /api/v1/letters/batch         Send up to ${MAX_BATCH} letters in one request (counts as ONE request against the rate limit)
GET    /api/v1/letters               List letters, newest first (?limit=1-100, ?starting_after=<id>)
GET    /api/v1/letters/{id}          One letter and its status
DELETE /api/v1/letters/{id}          Cancel a letter that is still queued (voids or refunds its billing)
POST   /api/v1/quote                 Price a letter without sending it (public; add a key for your real volume)
GET    /api/v1/pricing               Rates, the volume discount table, and a worked estimate (?letters_per_month=&pages=)
POST   /api/v1/webhooks              Create a webhook endpoint (secret returned once)
GET    /api/v1/webhooks              List endpoints
DELETE /api/v1/webhooks/{id}         Delete an endpoint
POST   /api/v1/webhooks/{id}/test    Send a signed webhook.test event now

## POST /api/v1/letters

Headers: Content-Type: application/json; Idempotency-Key: <1-255 printable characters, no spaces> (strongly recommended)

Required: mode ("draft" | "formatted" | "upload"), from, to.
- to: { name, line1, line2?, city, province, postal_code, country: "CA" }. The postal code must be a FULL Canadian code (A1A 1A1): a missing or partial code is charged at higher Canada Post rates. Max 200 characters per field.
- from: the same shape (country may be anything), or { "lines": ["Name", "Street", "City", "Country"] } (up to 6 lines) for an address that does not fit.
Optional: letter_size ("standard" default: folded in a #10 window envelope; "large": 8.5x11 flat in 9x12; "legal": 8.5x14 flat in 10x15), colour (boolean, default false; "color" accepted), duplex (boolean, default true), font (Times New Roman | Georgia | Arial | Helvetica | Courier New | Verdana), font_size (8-24), vertical_center, reference (string, 200), metadata (object, up to 20 string values).
Mode content:
- draft: letter { body (required, 50,000 characters), date, salutation, subject, reference, closing, signature, cc, enclosures, ps }. We lay it out and count the pages.
- formatted: html (500 KB), css, page_count. Scripts, frames, forms and event handlers are removed. Page count is an estimate unless you send page_count.
- upload: file (base64 PDF or DOCX, up to ${MAX_FILE_BYTES / 1024 / 1024} MB), file_type ("pdf"|"docx"), page_count (required for docx). PDF page counts are measured by us.
Pages: 1-${MAX_PAGES}. A letter too long for one envelope is split across several (each a mailing with its own fee, envelope and stamps).

Response 200: the letter object:
{ "id", "object": "letter", "livemode", "status": "queued|printed|mailed|cancelled", "created_at", "printed_at", "mailed_at", "cancelled_at", "letter_size", "pages", "mailings", "stamps", "colour", "duplex", "currency": "cad", "amount_cents", "price": { "version", "volume": { "mailings_in_last_30_days", "base_fee_list_cents", "discount_cents" }, "lines": [ { "item": "base|envelope|pages|postage", "qty", "unit_cents", "total_cents" } ] }, "to", "from", "reference", "metadata", "warnings": [ { "field", "code", "message" } ] }
warnings appear when a postal code's first letter does not match the province (a typo check, not address verification).

## Idempotency

Send Idempotency-Key on every create. Same key + same request: the original response again with Idempotent-Replayed: true, no second letter, no second charge. Same key, still running: 409 request_in_progress. Same key, different request: 422 idempotency_key_reuse. A request that fails (validation, payment) releases its key so you can fix it and retry. Keys are kept ${IDEMPOTENCY_TTL_DAYS} days. Tie the key to your own record (an invoice number), and reuse it on every retry.

## Bulk sending

POST /api/v1/letters/batch with { "letters": [ ...up to ${MAX_BATCH} create bodies... ] } and a REQUIRED Idempotency-Key. One request regardless of letter count. Letter i is created under "<key>:<i>", so re-sending the same batch with the same key creates only what is missing and replays the rest. Response 200: { object: "batch", total, created, replayed, failed, not_processed, results: [ { index, status: "created|replayed|error|not_processed", letter | { http_status, code, error } } ] }. A failing letter does not stop the others. Once the daily limit is hit the rest fail at once. After about 45 seconds the remainder return not_processed: send the same batch again. To stay under the rate limit: batch, send batches one after another, use webhooks instead of polling, honour Retry-After, back off with jitter, reuse the same key on retries.

## Status and cancellation

queued (accepted, can be cancelled) -> printed -> mailed (handed to Canada Post). cancelled. Ordinary Lettermail has no delivery tracking: mailed is the last status. DELETE cancels only a queued letter (409 not_cancellable after printing); cancelling twice is safe. Test letters become printed after 30 seconds and mailed after 2 minutes.

## Webhooks

Events: ${WEBHOOK_EVENTS.join(", ")} (plus webhook.test). POST https://your-url with headers Sendletter-Event, Sendletter-Signature: t=<unix>,v1=<hex>, Sendletter-Delivery; JSON body { id, object: "event", type, livemode, created, data: { object: <letter> } }.
Verify: v1 = HMAC-SHA256(secret, t + "." + rawBody) as hex; compare in constant time; reject timestamps older than 5 minutes.
Answer 2xx within 10 seconds. Failures are retried after ${RETRY_DELAYS_MS.map((m) => (m < 3600000 ? `${m / 60000} min` : `${m / 3600000} h`)).join(", ")} (${MAX_ATTEMPTS} attempts, about a day and a half). https only, public addresses only, redirects not followed. Events can repeat and arrive out of order.

## Pricing (CAD, no GST/HST charged on top, postage at cost)

total = (mailing fee + envelope) x mailings + pages x page rate + stamps x ${$(RATES.stampCents)}
Mailing fee (API): ${$(VOLUME.listCents)} on your first letter, falling automatically to ${$(VOLUME.floorCents)} by your ${VOLUME.fullDiscountAt}th mailing in a rolling ${VOLUME.windowDays} days. Page: ${$(RATES.pageCents.bw)} black and white, ${$(RATES.pageCents.colour)} colour. Envelope: ${$(RATES.envelopeCents.standard)} (#10), ${$(RATES.envelopeCents.large)} (9x12), ${$(RATES.envelopeCents.legal)} (10x15).
One black-and-white page in a #10 envelope, all in: ${volumeTable([1, 10, 50, 100]).map((t) => `${$(one(t.mailing_number - 1))} at mailing ${t.mailing_number}`).join("; ")}. The lowest is ${$(API_FROM_ALL_IN_CENTS)}.
Billing: no subscription. The first live letter is charged when you send it (declined: 402 payment_failed, nothing sent). After that usage is invoiced once a month on the 1st. Invoices and order history, with CSV export, are in your account.
Spending limit: $500 a day (Toronto time) to start, adjustable by you up to your approved maximum; a letter over it is refused with 429 daily_limit_exceeded. Request a higher maximum on the Developers page.

## Errors

{ "error": "<message>", "code": "<stable code>" }. 400 invalid_request, invalid_address, unsupported_destination, invalid_body, invalid_json, invalid_letter_size, invalid_options, invalid_pages, invalid_reference, invalid_metadata, invalid_idempotency_key, idempotency_key_required, invalid_batch, batch_too_large, invalid_webhook; 401 invalid_api_key; 402 payment_method_required, payment_failed; 404 letter_not_found, webhook_not_found; 409 request_in_progress, not_cancellable; 422 idempotency_key_reuse; 429 rate_limited, daily_limit_exceeded; 500 internal_error, billing_record_failed (nothing sent or charged); 503 service_unavailable (retry with the same key).

## Limits and honesty

Canadian delivery addresses only. No delivery tracking, signature or proof of delivery on ordinary Lettermail. No address verification beyond the province/postal-code check. No certified or registered mail. Fulfilment is within one business day of acceptance.
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" } });
}
