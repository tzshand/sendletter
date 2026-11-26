// The OpenAPI 3.1 description of the API, built from the same constants the API
// enforces (limits, rates, events) so it cannot drift from the code. Served at
// /openapi.json; the Postman collection at /postman.json is derived from it.

import { RATES, RATES_VERSION, MAX_PAGES, MAX_FILE_BYTES } from "./pricing";
import { VOLUME, API_FROM_ALL_IN_CENTS } from "./volume";
import { WEBHOOK_EVENTS } from "./webhooks";
import { RATE_LIMIT } from "./rate-limit";
import { IDEMPOTENCY_TTL_DAYS } from "./idempotency";
import { MAX_BATCH } from "./letter-create";

const SITE = "https://sendletter.app";
const $ = (c: number) => `$${(c / 100).toFixed(2)}`;

const addressSchema = {
  type: "object",
  required: ["name", "line1", "city"],
  properties: {
    name: { type: "string", maxLength: 200 },
    line1: { type: "string", maxLength: 200 },
    line2: { type: "string", maxLength: 200 },
    city: { type: "string", maxLength: 200 },
    province: { type: "string", description: "Province or state code. Required for CA and US addresses.", examples: ["ON"] },
    postal_code: { type: "string", description: "Required for CA and US addresses. For the delivery (`to`) address a Canadian postal code must be complete (A1A 1A1): a missing or partial code is charged at higher Canada Post rates. A return address may be looser.", examples: ["M5V 2T6"] },
    country: { type: "string", pattern: "^[A-Z]{2}$", default: "CA", description: "The delivery (`to`) country must be CA." },
  },
};

const errorRef = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } });
const idParam = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };

export function buildOpenApi() {
  return {
    openapi: "3.1.0",
    info: {
      title: "sendletter API",
      version: RATES_VERSION,
      summary: "Print and mail physical letters to Canadian addresses with one HTTP request.",
      description: [
        "Send a letter by API: we print it, fold and stamp it, and mail it with Canada Post, usually within one business day.",
        `Letters from as low as ${$(API_FROM_ALL_IN_CENTS)} all in (postage included): the mailing fee falls automatically with volume, from ${$(VOLUME.listCents)} to ${$(VOLUME.floorCents)} by your ${VOLUME.fullDiscountAt}th mailing in 30 days. No subscription or minimum.`,
        "Use a test key (`sl_test_`) to try everything without printing, mailing or being billed.",
        `Send an \`Idempotency-Key\` header on every POST: keys are remembered ${IDEMPOTENCY_TTL_DAYS} days.`,
        "Ordinary Lettermail has no delivery tracking: `mailed` is the last status we can know.",
        "Support: support@sendletter.app",
      ].join("\n\n"),
      contact: { name: "sendletter support", email: "support@sendletter.app", url: `${SITE}/docs` },
      termsOfService: `${SITE}/terms`,
    },
    servers: [{ url: SITE, description: "Production" }],
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Letters" }, { name: "Webhooks" }, { name: "Pricing" },
    ],
    paths: {
      "/api/v1/letters": {
        post: {
          tags: ["Letters"],
          operationId: "createLetter",
          summary: "Send a letter",
          description: "Creates a letter (alias: `POST /api/v1/send`). With a test key nothing is printed, mailed or billed. A customer's first live letter is charged up front.",
          parameters: [{ name: "Idempotency-Key", in: "header", required: false, schema: { type: "string", minLength: 1, maxLength: 255 }, description: "Makes a retry safe: the same key and request returns the original response, with `Idempotent-Replayed: true`." }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateLetter" } } } },
          responses: {
            "200": { description: "The letter.", content: { "application/json": { schema: { $ref: "#/components/schemas/Letter" } } } },
            "400": errorRef("Invalid request."),
            "401": errorRef("Missing or invalid API key."),
            "402": errorRef("No card on file (live key), or the first letter's up-front charge was declined. Nothing was sent."),
            "409": errorRef("An identical request with this Idempotency-Key is still running."),
            "422": errorRef("The Idempotency-Key was used with a different request."),
            "429": errorRef("Rate limited, or the daily spending limit would be exceeded."),
            "503": errorRef("Temporarily unavailable; retry with the same Idempotency-Key."),
          },
        },
        get: {
          tags: ["Letters"],
          operationId: "listLetters",
          summary: "List letters",
          description: "Newest first. A test key lists test letters; a live key lists live letters.",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
            { name: "starting_after", in: "query", schema: { type: "string", format: "uuid" }, description: "A letter id: return letters older than it." },
          ],
          responses: {
            "200": { description: "A page of letters.", content: { "application/json": { schema: { type: "object", properties: { object: { const: "list" }, data: { type: "array", items: { $ref: "#/components/schemas/Letter" } }, has_more: { type: "boolean" } } } } } },
            "401": errorRef("Missing or invalid API key."),
          },
        },
      },
      "/api/v1/letters/batch": {
        post: {
          tags: ["Letters"],
          operationId: "createLettersBatch",
          summary: "Send up to 100 letters in one request",
          description: `Counts as ONE request against the rate limit, however many letters it holds: the way to send in bulk without being rate limited. Each letter is created as POST /api/v1/letters would create it, one after another. \`Idempotency-Key\` is required: letter i is created under \`<key>:<i>\`, so re-sending the same batch creates only the letters not created before and replays the rest. Responds 200 with a result per letter; a failing letter does not stop the others.`,
          parameters: [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string", minLength: 1, maxLength: 240 } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["letters"], properties: { letters: { type: "array", minItems: 1, maxItems: MAX_BATCH, items: { $ref: "#/components/schemas/CreateLetter" } } } } } } },
          responses: {
            "200": { description: "A result for every letter.", content: { "application/json": { schema: { $ref: "#/components/schemas/Batch" } } } },
            "400": errorRef("Missing Idempotency-Key, empty or oversized batch, bad JSON."),
            "401": errorRef("Missing or invalid API key."),
            "429": errorRef("Rate limited."),
          },
        },
      },
      "/api/v1/letters/{id}": {
        get: {
          tags: ["Letters"], operationId: "getLetter", summary: "Get a letter and its status", parameters: [idParam],
          responses: { "200": { description: "The letter.", content: { "application/json": { schema: { $ref: "#/components/schemas/Letter" } } } }, "404": errorRef("No such letter for this key.") },
        },
        delete: {
          tags: ["Letters"], operationId: "cancelLetter", summary: "Cancel a queued letter",
          description: "Only a letter still `queued` can be cancelled. Its billing is voided, or refunded if already charged. Cancelling twice is safe.",
          parameters: [idParam],
          responses: {
            "200": { description: "The cancelled letter, with `refunded_cents`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Letter" } } } },
            "404": errorRef("No such letter for this key."),
            "409": errorRef("Already printed: it cannot be recalled."),
          },
        },
      },
      "/api/v1/quote": {
        post: {
          tags: ["Pricing"], operationId: "quoteLetter", summary: "Price a letter without sending it",
          description: "Public (no key needed). Add a key to price at your real 30-day volume, or `letters_in_last_30_days` to see a discounted price.",
          security: [{}, { bearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/QuoteRequest" } } } },
          responses: { "200": { description: "The price breakdown.", content: { "application/json": { schema: { $ref: "#/components/schemas/Quote" } } } }, "400": errorRef("Invalid request.") },
        },
      },
      "/api/v1/pricing": {
        get: {
          tags: ["Pricing"], operationId: "getPricing", summary: "Published rates and the volume discount table", security: [{}],
          parameters: [
            { name: "letters_per_month", in: "query", schema: { type: "integer", minimum: 1 }, description: "Adds a worked estimate." },
            { name: "pages", in: "query", schema: { type: "integer", minimum: 1, maximum: MAX_PAGES, default: 1 } },
            { name: "letter_size", in: "query", schema: { enum: ["standard", "large", "legal"], default: "standard" } },
            { name: "colour", in: "query", schema: { type: "boolean", default: false } },
          ],
          responses: { "200": { description: "Rates, tiers and, if asked, an estimate." } },
        },
      },
      "/api/v1/webhooks": {
        post: {
          tags: ["Webhooks"], operationId: "createWebhook", summary: "Create a webhook endpoint",
          description: "The signing secret is returned once. A test key creates an endpoint that receives test letters.",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["url"], properties: { url: { type: "string", format: "uri", description: "https, public address." }, events: { type: "array", items: { enum: [...WEBHOOK_EVENTS] }, description: "Omit for all events." }, description: { type: "string", maxLength: 200 } } } } } },
          responses: { "201": { description: "The endpoint, with `secret`." }, "400": errorRef("Invalid URL or events.") },
        },
        get: { tags: ["Webhooks"], operationId: "listWebhooks", summary: "List webhook endpoints", responses: { "200": { description: "Endpoints (no secrets)." } } },
      },
      "/api/v1/webhooks/{id}": {
        delete: { tags: ["Webhooks"], operationId: "deleteWebhook", summary: "Delete a webhook endpoint", parameters: [idParam], responses: { "200": { description: "Deleted." }, "404": errorRef("No such endpoint.") } },
      },
      "/api/v1/webhooks/{id}/test": {
        post: { tags: ["Webhooks"], operationId: "testWebhook", summary: "Send a signed test event now", parameters: [idParam], responses: { "200": { description: "What your server answered: `{ delivered, status_code, error }`." }, "404": errorRef("No such endpoint.") } },
      },
    },
    webhooks: {
      letterEvent: {
        post: {
          summary: "A letter changed state",
          description: `Events: ${WEBHOOK_EVENTS.join(", ")}. Header \`Sendletter-Signature: t=<unix>,v1=<hex>\`, where v1 = HMAC-SHA256(secret, "<t>.<raw body>"). Reject timestamps older than 5 minutes. Answer 2xx within 10 seconds or it is retried (7 attempts over about a day and a half). Events may repeat and arrive out of order.`,
          requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } } },
          responses: { "200": { description: "Acknowledged." } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "`sl_live_…` mails and bills real letters; `sl_test_…` never does. Create keys at https://sendletter.app/account/developers." },
      },
      schemas: {
        Address: addressSchema,
        FreeformAddress: { type: "object", required: ["lines"], properties: { lines: { type: "array", maxItems: 6, items: { type: "string", maxLength: 80 } } }, description: "A return address that does not fit the fields, e.g. an address outside Canada." },
        CreateLetter: {
          type: "object",
          required: ["mode", "from", "to"],
          properties: {
            mode: { enum: ["draft", "formatted", "upload"] },
            letter_size: { enum: ["standard", "large", "legal"], default: "standard", description: "standard = folded in a #10 window envelope; large = 8.5×11 flat (9×12); legal = 8.5×14 flat (10×15)." },
            colour: { type: "boolean", default: false, description: `Colour ${$(RATES.pageCents.colour)}/page; black and white ${$(RATES.pageCents.bw)}/page. \`color\` is accepted too.` },
            duplex: { type: "boolean", default: true },
            from: { oneOf: [{ $ref: "#/components/schemas/Address" }, { $ref: "#/components/schemas/FreeformAddress" }] },
            to: { $ref: "#/components/schemas/Address" },
            letter: { type: "object", description: "Draft mode.", required: ["body"], properties: { body: { type: "string", maxLength: 50000 }, date: { type: "string" }, salutation: { type: "string" }, subject: { type: "string" }, reference: { type: "string" }, closing: { type: "string" }, signature: { type: "string" }, cc: { type: "string" }, enclosures: { type: "string" }, ps: { type: "string" } } },
            html: { type: "string", maxLength: 500000, description: "Formatted mode." },
            css: { type: "string" },
            file: { type: "string", contentEncoding: "base64", description: `Upload mode. Up to ${MAX_FILE_BYTES / 1024 / 1024} MB.` },
            file_type: { enum: ["pdf", "docx"] },
            page_count: { type: "integer", minimum: 1, maximum: MAX_PAGES, description: "Required for docx; used for formatted. Measured by us for PDFs and drafts." },
            font: { enum: ["Times New Roman", "Georgia", "Arial", "Helvetica", "Courier New", "Verdana"] },
            font_size: { type: "number", minimum: 8, maximum: 24, default: 12 },
            vertical_center: { type: "boolean" },
            reference: { type: "string", maxLength: 200, description: "Your own reference; shown on invoices and order history." },
            metadata: { type: "object", additionalProperties: { type: "string", maxLength: 500 }, maxProperties: 20 },
          },
        },
        Batch: {
          type: "object",
          properties: {
            object: { const: "batch" }, total: { type: "integer" }, created: { type: "integer" }, replayed: { type: "integer" }, failed: { type: "integer" }, not_processed: { type: "integer" },
            results: { type: "array", items: { type: "object", properties: { index: { type: "integer" }, status: { enum: ["created", "replayed", "error", "not_processed"] }, letter: { $ref: "#/components/schemas/Letter" }, http_status: { type: "integer" }, code: { type: "string" }, error: { type: "string" } } } },
          },
        },
        Letter: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" }, object: { const: "letter" }, livemode: { type: "boolean" },
            status: { enum: ["queued", "printed", "mailed", "cancelled"] },
            created_at: { type: "string", format: "date-time" }, printed_at: { type: ["string", "null"], format: "date-time" },
            mailed_at: { type: ["string", "null"], format: "date-time" }, cancelled_at: { type: ["string", "null"], format: "date-time" },
            letter_size: { type: "string" }, pages: { type: "integer" }, mailings: { type: "integer" }, stamps: { type: "integer" },
            colour: { type: "boolean" }, duplex: { type: "boolean" }, currency: { const: "cad" }, amount_cents: { type: "integer" },
            price: { $ref: "#/components/schemas/Price" },
            to: { type: "object" }, from: { type: "object" },
            reference: { type: ["string", "null"] }, metadata: { type: "object" },
            warnings: { type: "array", items: { type: "object", properties: { field: { type: "string" }, code: { type: "string" }, message: { type: "string" } } } },
          },
        },
        Price: {
          type: "object",
          properties: {
            version: { type: "string" },
            volume: { type: "object", properties: { mailings_in_last_30_days: { type: "integer" }, base_fee_list_cents: { type: "integer" }, discount_cents: { type: "integer" } } },
            lines: { type: "array", items: { type: "object", properties: { item: { enum: ["base", "envelope", "pages", "postage"] }, qty: { type: "integer" }, unit_cents: { type: "integer" }, total_cents: { type: "integer" } } } },
          },
        },
        QuoteRequest: { type: "object", required: ["pages"], properties: { pages: { type: "integer", minimum: 1, maximum: MAX_PAGES }, letter_size: { enum: ["standard", "large", "legal"] }, colour: { type: "boolean" }, duplex: { type: "boolean" }, letters_in_last_30_days: { type: "integer", minimum: 0 } } },
        Quote: { type: "object", properties: { letter_size: { type: "string" }, pages: { type: "integer" }, mailings: { type: "integer" }, stamps: { type: "integer" }, currency: { const: "cad" }, amount_cents: { type: "integer" }, price: { $ref: "#/components/schemas/Price" } } },
        Event: { type: "object", properties: { id: { type: "string" }, object: { const: "event" }, type: { enum: [...WEBHOOK_EVENTS, "webhook.test"] }, livemode: { type: "boolean" }, created: { type: "integer" }, data: { type: "object", properties: { object: { $ref: "#/components/schemas/Letter" } } } } },
        Error: { type: "object", required: ["error", "code"], properties: { error: { type: "string" }, code: { type: "string", examples: ["daily_limit_exceeded"] } } },
      },
    },
    "x-limits": { requests_per_minute: RATE_LIMIT.perMinute, letters_per_batch: MAX_BATCH, default_daily_spend_cents: 50_000 },
  };
}

/** A Postman v2.1 collection of the main endpoints, with a {{baseUrl}} and a {{apiKey}} (a test key by default). */
export function buildPostman() {
  const hdr = (idem = false) => [
    { key: "Authorization", value: "Bearer {{apiKey}}" },
    { key: "Content-Type", value: "application/json" },
    ...(idem ? [{ key: "Idempotency-Key", value: "{{$guid}}" }] : []),
  ];
  const req = (name: string, method: string, path: string, body?: unknown, idem = false) => ({
    name,
    request: {
      method, header: hdr(idem),
      url: { raw: `{{baseUrl}}${path}`, host: ["{{baseUrl}}"], path: path.replace(/^\//, "").split("/") },
      ...(body ? { body: { mode: "raw", raw: JSON.stringify(body, null, 2), options: { raw: { language: "json" } } } } : {}),
    },
  });
  const addr = (name: string, city: string, prov: string, pc: string) => ({ name, line1: "123 Example St", city, province: prov, postal_code: pc, country: "CA" });
  return {
    info: {
      name: "sendletter API",
      description: `Send letters in Canada by API, from as low as ${$(API_FROM_ALL_IN_CENTS)}. Set apiKey to a test key (sl_test_...) to try everything without mailing or billing. Docs: ${SITE}/docs`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [{ key: "baseUrl", value: SITE }, { key: "apiKey", value: "sl_test_REPLACE_ME" }, { key: "letterId", value: "" }, { key: "webhookId", value: "" }],
    item: [
      req("Send a letter (draft)", "POST", "/api/v1/letters", { mode: "draft", letter_size: "standard", reference: "demo-1", from: addr("Jane Smith", "Toronto", "ON", "M5V 2T6"), to: addr("John Doe", "Vancouver", "BC", "V6B 1A1"), letter: { salutation: "Dear John,", body: "Hello from the sendletter API.", closing: "Sincerely,", signature: "Jane" } }, true),
      req("Send a batch of letters", "POST", "/api/v1/letters/batch", { letters: [{ mode: "draft", reference: "demo-a", from: addr("Jane Smith", "Toronto", "ON", "M5V 2T6"), to: addr("John Doe", "Vancouver", "BC", "V6B 1A1"), letter: { body: "Letter one." } }, { mode: "draft", reference: "demo-b", from: addr("Jane Smith", "Toronto", "ON", "M5V 2T6"), to: addr("Ana Roy", "Montreal", "QC", "H2X 1K4"), letter: { body: "Letter two." } }] }, true),
      req("Get a letter", "GET", "/api/v1/letters/{{letterId}}"),
      req("List letters", "GET", "/api/v1/letters?limit=20"),
      req("Cancel a letter", "DELETE", "/api/v1/letters/{{letterId}}"),
      req("Quote (public)", "POST", "/api/v1/quote", { pages: 1, letter_size: "standard", colour: false, letters_in_last_30_days: 100 }),
      req("Pricing and volume table", "GET", "/api/v1/pricing?letters_per_month=100&pages=1"),
      req("Create webhook", "POST", "/api/v1/webhooks", { url: "https://example.com/webhooks/sendletter", events: ["letter.mailed"] }),
      req("List webhooks", "GET", "/api/v1/webhooks"),
      req("Send test webhook event", "POST", "/api/v1/webhooks/{{webhookId}}/test", {}),
      req("Delete webhook", "DELETE", "/api/v1/webhooks/{{webhookId}}"),
    ],
  };
}
