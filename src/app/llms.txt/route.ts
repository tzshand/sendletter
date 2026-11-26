import { RATES, MAX_PAGES } from "@/lib/pricing";
import { VOLUME, API_FROM_ALL_IN_CENTS } from "@/lib/volume";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

const $ = (c: number) => `$${(c / 100).toFixed(2)}`;

// A plain-text summary for AI assistants and crawlers (https://llmstxt.org). Built
// from the same constants as the API, so the prices here are the prices charged.
export function GET() {
  const body = `# sendletter

> sendletter prints, stamps and mails physical letters to Canadian addresses with Canada Post. Send one from the website (from $3.49 all in) or by API (as low as ${$(API_FROM_ALL_IN_CENTS)} a letter all in, with automatic volume pricing). No subscription, no minimum. Delivery is to Canada only; the return address can be anywhere.

## API

- Send: POST https://sendletter.app/api/v1/letters (alias /api/v1/send), Bearer auth. Modes: draft (structured text), formatted (HTML), upload (PDF or DOCX, base64).
- Test keys (sl_test_) validate and price a letter but never print, mail or bill. Live keys (sl_live_) mail and bill real letters.
- Always send an Idempotency-Key header: a retry then returns the original response instead of mailing a second letter (kept 7 days).
- Bulk: POST /api/v1/letters/batch takes up to 100 letters and counts as ONE request against the rate limit (120 requests a minute per key), so bulk sending never needs to be rate limited. It requires an Idempotency-Key; re-sending the same batch creates only what is missing.
- Status: GET /api/v1/letters/{id}: queued, printed, mailed, cancelled. Ordinary Lettermail has no delivery tracking, so "mailed" is the last status. Cancel a queued letter with DELETE /api/v1/letters/{id}.
- Webhooks: ${WEBHOOK_EVENTS.join(", ")}. Signed (HMAC-SHA256), retried over about a day and a half (seven attempts).
- Quote without sending: POST /api/v1/quote (public). Rates and volume table: GET /api/v1/pricing.
- Errors are { "error": message, "code": stable_code }.

## Pricing (CAD, no GST/HST charged on top, postage at cost)

- total = (mailing fee + envelope) x mailings + pages x page rate + stamps x ${$(RATES.stampCents)}
- Mailing fee by API: ${$(VOLUME.listCents)} on a customer's first letter, falling automatically to ${$(VOLUME.floorCents)} on the ${VOLUME.fullDiscountAt}th mailing in any ${VOLUME.windowDays} days.
- Page: ${$(RATES.pageCents.bw)} black and white, ${$(RATES.pageCents.colour)} colour. Envelope: ${$(RATES.envelopeCents.standard)} (#10 window), ${$(RATES.envelopeCents.large)} (9x12), ${$(RATES.envelopeCents.legal)} (10x15). Up to ${MAX_PAGES} pages.
- The lowest all-in price is ${$(API_FROM_ALL_IN_CENTS)}: one black-and-white page in a #10 envelope with one stamp, at the volume floor.
- Billing: the first live letter is charged when sent; after that, usage is invoiced monthly. Default spending limit $500 a day, adjustable; higher on request.

## Limits and honesty

- Canadian delivery addresses only. Standard Lettermail: no tracking, no signature, no proof of delivery (use Canada Post Registered Mail for that).
- Not an address verification service: it flags a postal code that does not match the province, nothing more.
- Support: support@sendletter.app

## Links

- API reference: https://sendletter.app/docs
- OpenAPI 3.1: https://sendletter.app/openapi.json
- Postman collection: https://sendletter.app/postman.json
- Volume pricing and calculator: https://sendletter.app/blog/api-volume-pricing
- Changelog: https://sendletter.app/docs/changelog
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" } });
}
