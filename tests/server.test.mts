// The real route handlers and db.ts, run against in-memory fakes of Postgres,
// Stripe, the mailer and the Next runtime (see tests/resolve-ts.mjs and tests/mocks).
// The fake Postgres keeps state, so these tests read back what the routes wrote.
// Run: pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { PDFDocument, StandardFonts } from "pdf-lib";

process.env.DATABASE_URL = "postgres://test";
process.env.RESEND_API_KEY = "re_test";
process.env.CRON_SECRET = "s3cret-s3cret-s3cret";
delete process.env.CANNER_FILES_TOKEN; // staging is best-effort; these tests don't touch the real store

const pg = await import("./mocks/pg.mts");
const resend = await import("./mocks/resend.mts");
const stripeMock = await import("./mocks/stripe.mts");
const nextMock = await import("./mocks/next-server.mts");
const testLetters = await import("../src/lib/test-letters.ts");
const { quote } = await import("../src/lib/pricing.ts");
const { hashApiKey } = await import("../src/lib/api-auth.ts");
const { resetRateLimits } = await import("../src/lib/rate-limit.ts");
const { volumeBaseCents } = await import("../src/lib/volume-curve.ts");
const send = await import("../src/app/api/v1/send/route.ts");
const lettersRoute = await import("../src/app/api/v1/letters/route.ts");
const letterRoute = await import("../src/app/api/v1/letters/[id]/route.ts");
const batchRoute = await import("../src/app/api/v1/letters/batch/route.ts");
const webhooksRoute = await import("../src/app/api/v1/webhooks/route.ts");
const webhookRoute = await import("../src/app/api/v1/webhooks/[id]/route.ts");
const webhookTestRoute = await import("../src/app/api/v1/webhooks/[id]/test/route.ts");
const quoteRoute = await import("../src/app/api/v1/quote/route.ts");
const pricingRoute = await import("../src/app/api/v1/pricing/route.ts");
const fulfil = await import("../src/app/api/fulfil/route.ts");
const bill = await import("../src/app/api/cron/bill/route.ts");
const webhookCron = await import("../src/app/api/cron/webhooks/route.ts");
const purge = await import("../src/app/api/cron/purge-drafts/route.ts");
const wh = await import("../src/lib/webhooks.ts");
const { fulfilParams, verifyFulfil } = await import("../src/lib/fulfil-links.ts");
const { torontoDayStart, torontoMonthStart } = await import("../src/lib/api-limits.ts");
const { invoiceNumber, runMonthlyBilling } = await import("../src/lib/invoices.ts");
const { toCsv } = await import("../src/lib/csv.ts");
const { checkCanadianAddress } = await import("../src/lib/address-checks.ts");
const { getDb } = await import("../src/lib/db.ts");

const ACCT = "acct-1";
const LIVE = "sl_live_" + "a".repeat(64);
const TEST = "sl_test_" + "b".repeat(64);

const post = (body: unknown, key = LIVE, headers: Record<string, string> = {}, url = "http://x/api/v1/letters") =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...headers }, body: JSON.stringify(body) });
const get = (url: string, key = LIVE) => new Request(url, { headers: { authorization: `Bearer ${key}` } });
const del = (url: string, key = LIVE) => new Request(url, { method: "DELETE", headers: { authorization: `Bearer ${key}` } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const addr = (name: string) => ({ name, line1: "1 Main St", city: "Toronto", province: "ON", postal_code: "M5V 1A1", country: "CA" });
const base = { from: addr("Sender"), to: addr("Recipient") };
const draft = (extra: Record<string, unknown> = {}) => ({ ...base, mode: "draft", letter: { body: "Hello there." }, ...extra });

const orderInsert = () => pg.queries.find((q) => q.text.startsWith('INSERT INTO "sendletter_orders"'))!;
const usageInsert = () => pg.queries.find((q) => q.text.startsWith('INSERT INTO "sendletter_api_usage"'))!;
const col = (q: { text: string; params: unknown[] }, name: string) => {
  const cols = q.text.slice(q.text.indexOf("(") + 1, q.text.indexOf(")")).split(",").map((c) => c.trim().replace(/"/g, ""));
  return q.params[cols.indexOf(name)];
};

async function pdfB64(pages: number) {
  const d = await PDFDocument.create();
  const f = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) d.addPage([612, 792]).drawText(`p${i}`, { x: 72, y: 700, size: 14, font: f });
  return Buffer.from(await d.save()).toString("base64");
}

/** The text drawn on a PDF's pages: inflate every Flate stream and join them (enough to find literal strings). */
function pdfText(pdf: Buffer): string {
  const raw = pdf.toString("latin1");
  let out = "";
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try { out += inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch { /* not a Flate stream */ }
  }
  return out;
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

/** An account with a card, a live key and a test key. `firstOrder:false` gives it an earlier letter so nothing is charged up front. */
function setup({ firstOrder = false }: { firstOrder?: boolean } = {}) {
  pg.seed("sendletter_accounts", [{ id: ACCT, email: "dev@example.com", has_payment_method: true, stripe_customer_id: "cus_1" }]);
  pg.seed("sendletter_api_keys", [
    { id: "key-live", account_id: ACCT, key_hash: hashApiKey(LIVE), key_prefix: "sl_live_aaaaaaaa...", livemode: true },
    { id: "key-test", account_id: ACCT, key_hash: hashApiKey(TEST), key_prefix: "sl_test_bbbbbbbb...", livemode: false },
  ]);
  if (!firstOrder) {
    // An established customer: an earlier letter, and something already paid.
    pg.seed("sendletter_orders", [{ id: "00000000-0000-4000-8000-000000000001", api_account_id: ACCT, livemode: true, status: "mailed", customer_email: "", to_name: "Earlier", to_city: "Ottawa", amount_cents: 300 }]);
    pg.seed("sendletter_invoices", [{ account_id: ACCT, kind: "first_order", status: "paid", letters: 1, total_cents: 300 }]);
  }
}

test.beforeEach(() => {
  pg.reset();
  resend.clear();
  stripeMock.clear();
  resetRateLimits();
  globalThis.fetch = (() => { throw new Error("unexpected network call"); }) as typeof fetch;
  wh.__setLookup(async () => [{ address: "93.184.216.34" }]);
});

// ── POST /api/v1/letters: pricing and recording ─────────────────

test("send: a one-page draft is priced by the shared quote and recorded in full", async () => {
  setup();
  const res = await send.POST(post(draft()));
  assert.equal(res.status, 200);
  const j = await res.json();
  const q = quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: 0 });
  assert.equal(j.object, "letter");
  assert.equal(j.livemode, true);
  assert.equal(j.status, "queued");
  assert.equal(j.pages, 1);
  assert.equal(j.mailings, 1);
  assert.equal(j.stamps, 1);
  assert.equal(j.amount_cents, q.totalCents);
  assert.equal(j.amount_cents, 99 + 10 + 15 + 124); // black and white by default; first letter pays the list fee
  assert.deepEqual(j.price.lines.map((l: { item: string }) => l.item), ["base", "envelope", "pages", "postage"]);

  const o = orderInsert();
  assert.equal(col(o, "amount_cents"), q.totalCents);
  assert.equal(col(o, "colour"), false);
  assert.equal(col(o, "livemode"), true);
  assert.equal(col(o, "api_key_id"), "key-live");
  assert.equal(col(usageInsert(), "amount_cents"), q.totalCents);
  assert.equal(col(usageInsert(), "mailings"), 1);
});

test("send: the fulfilment email attaches the print-ready PDF, says how many stamps, and carries the status links", async () => {
  setup();
  await send.POST(post(draft()));
  assert.equal(resend.sent.length, 1);
  const mail = resend.sent[0];
  assert.match(mail.html, /Print &amp; stamp/);
  assert.match(mail.html, /1 &times; \$1\.24 stamp/);
  assert.match(mail.html, /api\/fulfil\?o=[^"]+&amp;a=printed/);
  assert.match(mail.html, /api\/fulfil\?o=[^"]+&amp;a=mailed/);
  const att = mail.attachments?.find((a) => a.filename === "print.pdf");
  assert.ok(att, "print.pdf attached");
  const doc = await PDFDocument.load(Buffer.from(att!.content, "base64"));
  assert.equal(doc.getPageCount(), 2); // address page + the letter
});

test("send: colour is opt-in; flat legal; single-sided", async () => {
  setup();
  const res = await send.POST(post(draft({ letter_size: "legal", colour: true, duplex: false })));
  const j = await res.json();
  assert.equal(j.amount_cents, quote({ pages: 1, size: "legal", colour: true, duplex: false, channel: "api", priorMailings: 0 }).totalCents);
  assert.equal(j.stamps, 3); // flat mailers are oversize: 3 coil stamps
  assert.equal(col(orderInsert(), "colour"), true);
  assert.equal(col(orderInsert(), "duplex"), false);
});

test("send: a long draft is paginated by us and priced by its real page count", async () => {
  setup();
  const body = Array.from({ length: 90 }, (_, i) => `Paragraph ${i + 1}. The quick brown fox jumps over the lazy dog.`).join("\n\n");
  const j = await (await send.POST(post(draft({ letter_size: "large", letter: { body } })))).json();
  assert.ok(j.pages > 2, `pages ${j.pages}`);
  assert.equal(j.amount_cents, quote({ pages: j.pages, size: "large", colour: false, duplex: true, channel: "api", priorMailings: 0 }).totalCents);
});

test("send: a PDF upload's page count is measured, never taken from the caller", async () => {
  setup();
  const j = await (await send.POST(post({ ...base, mode: "upload", file_type: "pdf", file: await pdfB64(3), page_count: 99 }))).json();
  assert.equal(j.pages, 3);
  assert.equal(col(orderInsert(), "page_count"), 3);
});

test("send: a .docx needs page_count; with it, it prices on that", async () => {
  setup();
  const file = Buffer.from("not really a docx").toString("base64");
  const no = await send.POST(post({ ...base, mode: "upload", file_type: "docx", file }));
  assert.equal(no.status, 400);
  assert.match((await no.json()).error, /page_count is required/);
  const yes = await send.POST(post({ ...base, mode: "upload", file_type: "docx", file, page_count: 4 }));
  assert.equal(yes.status, 200);
  assert.equal((await yes.json()).pages, 4);
});

test("send: a PDF that can't be read is refused", async () => {
  setup();
  const res = await send.POST(post({ ...base, mode: "upload", file_type: "pdf", file: Buffer.from("garbage").toString("base64") }));
  assert.equal(res.status, 400);
  assert.equal(pg.queries.some((q) => q.text.startsWith('INSERT INTO "sendletter_orders"')), false, "no order recorded");
});

test("send: formatted HTML uses the caller's page_count, else a conservative estimate", async () => {
  setup();
  const html = Array.from({ length: 120 }, (_, i) => `<p>Paragraph ${i + 1} of a long formatted letter that runs onto several pages.</p>`).join("");
  const est = await (await send.POST(post({ ...base, mode: "formatted", html }))).json();
  assert.ok(est.pages >= 2);
  assert.match(resend.sent[0].html, /ESTIMATE/);
  const given = await (await send.POST(post({ ...base, mode: "formatted", html, page_count: 5 }))).json();
  assert.equal(given.pages, 5);
});

test("send: a free-form (international) return address is accepted and kept", async () => {
  setup();
  const res = await send.POST(post({ to: addr("Recipient"), from: { lines: ["Ana García", "Calle 17 #4-77", "Bogotá", "Colombia"] }, mode: "draft", letter: { body: "Hola." } }));
  assert.equal(res.status, 200);
  assert.equal(col(orderInsert(), "from_lines"), "Ana García\nCalle 17 #4-77\nBogotá\nColombia");
  assert.match(resend.sent[0].html, /Calle 17 #4-77/);
});

test("send: bad input is refused before anything is stored", async () => {
  setup();
  const bad: Record<string, unknown>[] = [
    { ...base, mode: "draft", letter: { body: "x" }, letter_size: "huge" },
    { ...base, mode: "draft", letter: { body: "x" }, colour: "yes" },
    { ...base, mode: "draft", letter: { body: "x" }, duplex: 1 },
    { ...base, to: { ...addr("R"), country: "US" }, mode: "draft", letter: { body: "x" } },
    { ...base, mode: "formatted", html: "<p>x</p>", page_count: 201 },
    { ...base, mode: "formatted", html: "<p>x</p>", page_count: 0 },
    { ...base, mode: "nope" },
    { ...draft(), reference: "x".repeat(201) },
    { ...draft(), metadata: { a: 1 } },
  ];
  for (const b of bad) assert.equal((await send.POST(post(b))).status, 400, JSON.stringify(b).slice(0, 80));
  assert.equal(pg.queries.some((q) => q.text.startsWith("INSERT INTO \"sendletter_orders\"")), false);
});

test("send: a free-text date in a draft is printed as written, not 'Invalid Date'", async () => {
  setup();
  const res = await send.POST(post(draft({ letter: { body: "Hi.", date: "March 5, 2026" } })));
  assert.equal(res.status, 200);
  const att = resend.sent[0].attachments?.find((a) => a.filename === "print.pdf");
  const text = pdfText(Buffer.from(att!.content, "base64"));
  assert.ok(text.includes("March 5, 2026"), "the date is printed as written");
  assert.equal(text.includes("Invalid Date"), false);
});

test("send: reference and metadata are kept and echoed", async () => {
  setup();
  const j = await (await send.POST(post(draft({ reference: "INV-1042", metadata: { customer: "c_9" } })))).json();
  assert.equal(j.reference, "INV-1042");
  assert.deepEqual(j.metadata, { customer: "c_9" });
});

test("send: a postal code from another province is a warning, not a refusal", async () => {
  setup();
  const res = await send.POST(post(draft({ to: { ...addr("R"), province: "BC" } }))); // M... is Toronto
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.warnings[0].code, "province_postal_mismatch");
  assert.equal(j.warnings[0].field, "to.postal_code");
});

test("address checks: the first-letter table agrees with Canada Post's", () => {
  assert.deepEqual(checkCanadianAddress("to", { province: "ON", postal_code: "K1A 0B1" }), []);
  assert.deepEqual(checkCanadianAddress("to", { province: "QC", postal_code: "H2X 1K4" }), []);
  assert.deepEqual(checkCanadianAddress("to", { province: "NU", postal_code: "X0A 0H0" }), []);
  assert.equal(checkCanadianAddress("to", { province: "ON", postal_code: "V6B 1A1" })[0].code, "province_postal_mismatch");
  assert.equal(checkCanadianAddress("to", { province: "Ontario", postal_code: "M5V 1A1" }).length, 0);
  assert.equal(checkCanadianAddress("to", { province: "ZZ", postal_code: "M5V 1A1" })[0].code, "unrecognised_province");
});

// ── Auth, test keys, rate limits ────────────────────────────────

test("auth: no key, a bad key, and a live key with no card are all refused with a code", async () => {
  setup();
  const none = await send.POST(new Request("http://x", { method: "POST", body: "{}" }));
  assert.equal(none.status, 401);
  assert.equal((await none.json()).code, "invalid_api_key");
  assert.equal((await send.POST(post(draft(), "sl_live_" + "f".repeat(64)))).status, 401);
  pg.rows("sendletter_accounts")[0].has_payment_method = false;
  const nocard = await send.POST(post(draft()));
  assert.equal(nocard.status, 402);
  assert.equal((await nocard.json()).code, "payment_method_required");
  // A test key needs no card.
  assert.equal((await send.POST(post(draft(), TEST))).status, 200);
});

test("test mode: a test key validates and prices a letter but prints, bills and emails nothing", async () => {
  setup({ firstOrder: true });
  const res = await send.POST(post(draft(), TEST));
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.livemode, false);
  assert.equal(j.amount_cents, quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: 0 }).totalCents);
  assert.equal(pg.rows("sendletter_api_usage").length, 0, "no usage row");
  assert.equal(stripeMock.intents.length, 0, "no charge, even on a first order");
  assert.equal(resend.sent.length, 0, "no fulfilment email");
  assert.equal(col(orderInsert(), "livemode"), false);
});

test("test mode: status advances with time, and test and live letters are invisible to each other", async () => {
  setup();
  const t = await (await send.POST(post(draft(), TEST))).json();
  const l = await (await send.POST(post(draft(), LIVE))).json();
  assert.equal((await (await letterRoute.GET(get(`http://x/${t.id}`, TEST), ctx(t.id))).json()).status, "queued");
  pg.rows("sendletter_orders").find((o) => o.id === t.id)!.created_at = new Date(Date.now() - 60_000).toISOString();
  assert.equal((await (await letterRoute.GET(get(`http://x/${t.id}`, TEST), ctx(t.id))).json()).status, "printed");
  pg.rows("sendletter_orders").find((o) => o.id === t.id)!.created_at = new Date(Date.now() - 300_000).toISOString();
  const done = await (await letterRoute.GET(get(`http://x/${t.id}`, TEST), ctx(t.id))).json();
  assert.equal(done.status, "mailed");
  assert.ok(done.mailed_at && done.printed_at);
  assert.equal((await letterRoute.GET(get(`http://x/${l.id}`, TEST), ctx(l.id))).status, 404);
  assert.equal((await letterRoute.GET(get(`http://x/${t.id}`, LIVE), ctx(t.id))).status, 404);
});

test("rate limit: the 121st request in a minute is refused with Retry-After", async () => {
  setup();
  for (let i = 0; i < 120; i++) await lettersRoute.GET(get("http://x/api/v1/letters"));
  const res = await lettersRoute.GET(get("http://x/api/v1/letters"));
  assert.equal(res.status, 429);
  assert.equal((await res.json()).code, "rate_limited");
  assert.ok(Number(res.headers.get("retry-after")) >= 1);
});

// ── Idempotency ─────────────────────────────────────────────────

test("idempotency: the same key and request mails one letter and replays the response", async () => {
  setup();
  const a = await send.POST(post(draft(), LIVE, { "idempotency-key": "order-1042" }));
  const b = await send.POST(post(draft(), LIVE, { "idempotency-key": "order-1042" }));
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(b.headers.get("idempotent-replayed"), "true");
  assert.equal((await a.json()).id, (await b.json()).id);
  assert.equal(pg.rows("sendletter_orders").filter((o) => o.livemode === true && o.to_name === "Recipient").length, 1, "one order");
  assert.equal(pg.rows("sendletter_api_usage").length, 1, "billed once");
  assert.equal(resend.sent.length, 1, "printed once");
});

test("idempotency: key order in the JSON does not matter, but a different request does", async () => {
  setup();
  await send.POST(post(draft({ reference: "a" }), LIVE, { "idempotency-key": "k1" }));
  const reordered = { reference: "a", letter: { body: "Hello there." }, mode: "draft", to: addr("Recipient"), from: addr("Sender") };
  assert.equal((await send.POST(post(reordered, LIVE, { "idempotency-key": "k1" }))).headers.get("idempotent-replayed"), "true");
  const different = await send.POST(post(draft({ reference: "b" }), LIVE, { "idempotency-key": "k1" }));
  assert.equal(different.status, 422);
  assert.equal((await different.json()).code, "idempotency_key_reuse");
});

test("idempotency: a request still in flight is refused with 409, and a failed one can be retried with the same key", async () => {
  setup();
  const { hashRequest } = await import("../src/lib/idempotency.ts");
  pg.seed("sendletter_idempotency", [{ account_id: ACCT, key: "live:busy", request_hash: hashRequest("POST /api/v1/letters", draft()) }]);
  const busy = await send.POST(post(draft(), LIVE, { "idempotency-key": "busy" }));
  assert.equal(busy.status, 409);
  assert.equal((await busy.json()).code, "request_in_progress");

  // A validation failure creates nothing, so the key is released for a corrected retry.
  const bad = await send.POST(post({ ...draft(), letter_size: "huge" }, LIVE, { "idempotency-key": "fixme" }));
  assert.equal(bad.status, 400);
  assert.equal((await send.POST(post(draft(), LIVE, { "idempotency-key": "fixme" }))).status, 200);
});

test("idempotency: a malformed key is refused, and test and live keys do not share a key space", async () => {
  setup();
  assert.equal((await send.POST(post(draft(), LIVE, { "idempotency-key": "has space" }))).status, 400);
  await send.POST(post(draft(), LIVE, { "idempotency-key": "same" }));
  const t = await send.POST(post(draft(), TEST, { "idempotency-key": "same" }));
  assert.equal(t.status, 200);
  assert.equal(t.headers.get("idempotent-replayed"), null);
});

// ── Volume discount, spend limits, billing ──────────────────────

test("volume: the mailing fee follows the account's mailings in the last 30 days, not older or voided ones", async () => {
  setup();
  const rows = (n: number, age: number, extra: Record<string, unknown> = {}) =>
    Array.from({ length: n }, () => ({ account_id: ACCT, api_key_id: "key-live", letter_mode: "draft", letter_size: "standard", amount_cents: 100, mailings: 1, created_at: daysAgo(age), ...extra }));
  pg.seed("sendletter_api_usage", [...rows(9, 5), ...rows(50, 45), ...rows(20, 2, { voided_at: daysAgo(1) })]);
  const j = await (await send.POST(post(draft()))).json();
  assert.equal(j.price.volume.mailings_in_last_30_days, 9); // 9 recent; the 45-day-old and the voided do not count
  assert.equal(j.price.lines[0].total_cents, volumeBaseCents(10));
  assert.equal(j.amount_cents, volumeBaseCents(10) + 10 + 15 + 124);
});

test("limits: a letter that would push today's spend over the daily limit is refused with 429", async () => {
  setup();
  pg.rows("sendletter_accounts")[0].daily_spend_limit_cents = 500; // $5.00
  pg.seed("sendletter_api_usage", [{ account_id: ACCT, api_key_id: "key-live", letter_mode: "draft", letter_size: "standard", amount_cents: 300, mailings: 1 }]);
  const res = await send.POST(post(draft())); // $2.48 more -> $5.48
  assert.equal(res.status, 429);
  const j = await res.json();
  assert.equal(j.code, "daily_limit_exceeded");
  assert.equal(j.spent_today_cents, 300);
  assert.equal(pg.rows("sendletter_orders").filter((o) => o.to_name === "Recipient").length, 0, "nothing recorded");
});

test("limits: the default is $500 a day, and test letters never count", async () => {
  setup();
  pg.seed("sendletter_api_usage", [{ account_id: ACCT, api_key_id: "key-live", letter_mode: "draft", letter_size: "standard", amount_cents: 49_900, mailings: 1 }]);
  assert.equal((await send.POST(post(draft()))).status, 429); // $499.00 + $2.48 > $500.00
  assert.equal((await send.POST(post(draft(), TEST))).status, 200);
});

test("billing: the first live letter is charged up front, on its own paid invoice, before it is accepted", async () => {
  setup({ firstOrder: true });
  const res = await send.POST(post(draft()));
  assert.equal(res.status, 200);
  assert.equal(stripeMock.intents.length, 1);
  assert.equal(stripeMock.intents[0].amount, 99 + 10 + 15 + 124);
  const inv = pg.rows("sendletter_invoices")[0];
  assert.equal(inv.kind, "first_order");
  assert.equal(inv.status, "paid");
  assert.equal(inv.stripe_payment_intent_id, "pi_1");
  assert.equal(pg.rows("sendletter_api_usage")[0].billed, true);
  assert.match(String(pg.rows("sendletter_invoice_lines")[0].description), /Letter to Recipient, Toronto ON/);
});

test("billing: a first letter whose card fails is refused with 402, voided, and never printed", async () => {
  setup({ firstOrder: true });
  stripeMock.failNext("Your card was declined.");
  const res = await send.POST(post(draft()));
  assert.equal(res.status, 402);
  assert.equal((await res.json()).code, "payment_failed");
  assert.equal(resend.sent.length, 0, "nothing sent to fulfilment");
  assert.ok(pg.rows("sendletter_api_usage")[0].voided_at, "usage voided");
  assert.equal(pg.rows("sendletter_orders")[0].status, "cancelled");
  assert.equal(pg.rows("sendletter_invoices")[0].status, "failed");
});

test("billing: later letters are not charged on the spot; they wait for the monthly invoice", async () => {
  setup();
  await send.POST(post(draft()));
  assert.equal(stripeMock.intents.length, 0);
  assert.equal(pg.rows("sendletter_api_usage")[0].billed, false);
});

const cronReq = (secret = process.env.CRON_SECRET!) => new Request("http://x/api/cron/bill", { method: "POST", headers: { "x-cron-key": secret } });
const usage = (id: string, amount: number, created_at: string, extra: Record<string, unknown> = {}) =>
  ({ id, account_id: ACCT, api_key_id: "key-live", order_id: null, letter_mode: "draft", letter_size: "standard", amount_cents: amount, mailings: 1, created_at, ...extra });
const lastMonth = () => { const d = torontoMonthStart(); return new Date(d.getTime() - 3 * 86400_000).toISOString(); };

test("bill: rejects a wrong or missing secret", async () => {
  assert.equal((await bill.POST(cronReq("wrong-wrong-wrong-wrong"))).status, 401);
  assert.equal((await bill.POST(new Request("http://x/api/cron/bill", { method: "POST" }))).status, 401);
});

test("bill: last month's usage becomes one invoice and one charge; this month's waits", async () => {
  setup();
  pg.seed("sendletter_api_usage", [
    usage("u1", 283, lastMonth()), usage("u2", 351, lastMonth()),
    usage("u3", 283, new Date().toISOString()), // this month: not yet
  ]);
  const j = await (await bill.POST(cronReq())).json();
  assert.equal(j.results.length, 1);
  assert.equal(j.results[0].status, "succeeded");
  assert.equal(stripeMock.intents.length, 1, "one charge, so one fixed card fee");
  assert.equal(stripeMock.intents[0].amount, 634);
  const byId = (id: string) => pg.rows("sendletter_api_usage").find((u) => u.id === id)!;
  assert.equal(byId("u1").billed, true);
  assert.equal(byId("u2").billed, true);
  assert.equal(byId("u3").billed, false);
  const inv = pg.rows("sendletter_invoices").find((i) => i.kind === "monthly")!;
  assert.equal(inv.kind, "monthly");
  assert.equal(inv.letters, 2);
  assert.equal(inv.total_cents, 634);
  assert.equal(pg.rows("sendletter_invoice_lines").length, 2);
});

test("bill: a failed charge releases the usage, marks the invoice failed, and the next run retries it", async () => {
  setup();
  pg.seed("sendletter_api_usage", [usage("u1", 500, lastMonth())]);
  stripeMock.failNext("insufficient funds");
  const first = await (await bill.POST(cronReq())).json();
  assert.equal(first.results[0].status, "failed");
  assert.equal(pg.rows("sendletter_invoices").find((i) => i.kind === "monthly")!.status, "failed");
  assert.equal(pg.rows("sendletter_api_usage")[0].invoice_id, null, "claim released");
  assert.equal(pg.rows("sendletter_api_usage")[0].billed, false);
  const second = await (await bill.POST(cronReq())).json();
  assert.equal(second.results[0].status, "succeeded");
  assert.equal(pg.rows("sendletter_api_usage")[0].billed, true);
});

test("bill: usage already claimed by another invoice, or voided, is never charged again", async () => {
  setup();
  pg.seed("sendletter_api_usage", [usage("u1", 500, lastMonth(), { invoice_id: "inv-elsewhere" }), usage("u2", 500, lastMonth(), { voided_at: daysAgo(1) })]);
  const results = await runMonthlyBilling();
  assert.equal(results.length, 0);
  assert.equal(stripeMock.intents.length, 0);
});

test("invoices: numbers are SL-year-sequence, and the day and month boundaries are Toronto time", () => {
  assert.equal(invoiceNumber(42, "2026-12-01T05:00:00Z"), "SL-2026-000042");
  // 03:00 UTC on Nov 26 is 22:00 on Nov 25 in Toronto (EST): the Toronto day began Nov 25 05:00 UTC.
  assert.equal(torontoDayStart(new Date("2026-11-26T03:00:00Z")).toISOString(), "2026-11-25T05:00:00.000Z");
  assert.equal(torontoDayStart(new Date("2026-07-15T12:00:00Z")).toISOString(), "2026-07-15T04:00:00.000Z"); // EDT
  assert.equal(torontoMonthStart(new Date("2026-11-15T12:00:00Z")).toISOString(), "2026-11-01T04:00:00.000Z"); // still EDT on Nov 1
  assert.equal(torontoMonthStart(new Date("2026-12-15T12:00:00Z")).toISOString(), "2026-12-01T05:00:00.000Z");
});

// ── Status, history, cancellation ───────────────────────────────

test("letters: GET returns the letter and the list is newest-first with a cursor, scoped to the account", async () => {
  setup();
  pg.rows("sendletter_orders")[0].created_at = daysAgo(30); // the earlier letter setup() adds is the oldest
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) { const j = await (await send.POST(post(draft({ reference: `r${i}` })))).json(); ids.push(j.id); pg.rows("sendletter_orders").find((o) => o.id === j.id)!.created_at = new Date(Date.now() - (3 - i) * 1000).toISOString(); }
  pg.seed("sendletter_accounts", [{ id: "acct-2", email: "b@example.com", has_payment_method: true }]);
  pg.seed("sendletter_orders", [{ id: "00000000-0000-4000-8000-0000000000aa", api_account_id: "acct-2", livemode: true, to_name: "Not yours" }]);

  const one = await letterRoute.GET(get(`http://x/${ids[0]}`), ctx(ids[0]));
  assert.equal((await one.json()).reference, "r0");
  assert.equal((await letterRoute.GET(get("http://x/nope"), ctx("nope"))).status, 404);
  assert.equal((await letterRoute.GET(get("http://x/y"), ctx("00000000-0000-4000-8000-0000000000aa"))).status, 404, "another account's letter");

  const list = await (await lettersRoute.GET(get("http://x/api/v1/letters?limit=2"))).json();
  assert.equal(list.object, "list");
  assert.deepEqual(list.data.map((l: { reference: string }) => l.reference), ["r2", "r1"]);
  assert.equal(list.has_more, true);
  const next = await (await lettersRoute.GET(get(`http://x/api/v1/letters?limit=2&starting_after=${list.data[1].id}`))).json();
  assert.deepEqual(next.data.map((l: { reference: string | null }) => l.reference), ["r0", null]);
  assert.equal(next.has_more, false);
});

test("cancel: a queued letter is cancelled, its usage voided, the printer told, and the event fired", async () => {
  setup();
  const j = await (await send.POST(post(draft()))).json();
  await nextMock.flushAfter();
  resend.clear();
  const res = await letterRoute.DELETE(del(`http://x/${j.id}`), ctx(j.id));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "cancelled");
  assert.ok(pg.rows("sendletter_api_usage")[0].voided_at);
  assert.match(resend.sent[0].subject, /CANCELLED/);
  // Events are recorded whether or not an endpoint is listening, so there is a history to read.
  assert.deepEqual(pg.rows("sendletter_webhook_events").map((e) => e.type), ["letter.created", "letter.cancelled"]);
  // Cancelling again is safe; billing for it is gone.
  assert.equal((await letterRoute.DELETE(del(`http://x/${j.id}`), ctx(j.id))).status, 200);
  assert.equal(await runMonthlyBilling().then((r) => r.length), 0);
});

test("cancel: a letter that has been printed can no longer be cancelled", async () => {
  setup();
  const j = await (await send.POST(post(draft()))).json();
  pg.rows("sendletter_orders").find((o) => o.id === j.id)!.status = "printed";
  const res = await letterRoute.DELETE(del(`http://x/${j.id}`), ctx(j.id));
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "not_cancellable");
});

test("cancel: a letter that was already paid for is refunded", async () => {
  setup({ firstOrder: true });
  const j = await (await send.POST(post(draft()))).json(); // charged up front
  const res = await letterRoute.DELETE(del(`http://x/${j.id}`), ctx(j.id));
  assert.equal((await res.json()).refunded_cents, 99 + 10 + 15 + 124);
  assert.equal(stripeMock.refunds[0].payment_intent, "pi_1");
  assert.equal(stripeMock.refunds[0].amount, 248);
});

// ── Fulfilment links ────────────────────────────────────────────

const OID = "11111111-2222-3333-4444-555555555555";
const fulfilReq = (method: "GET" | "POST", action: "printed" | "mailed", over: Record<string, string> = {}) => {
  const p = { ...fulfilParams(OID, action), ...over };
  return method === "GET"
    ? new Request(`http://x/api/fulfil?${new URLSearchParams(p)}`)
    : new Request("http://x/api/fulfil", { method: "POST", body: new URLSearchParams(p) });
};

test("fulfil: a GET only shows a confirmation page; the POST marks the letter and fires the events", async () => {
  setup();
  pg.seed("sendletter_orders", [{ id: OID, api_account_id: ACCT, livemode: true, status: "pending", to_name: "Jane", to_city: "Montreal", price_breakdown: quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api" }) }]);
  const page = await fulfil.GET(fulfilReq("GET", "mailed"));
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Yes, mark mailed/);
  assert.equal(pg.rows("sendletter_orders").find((o) => o.id === OID)!.status, "pending", "a GET changes nothing");

  const done = await fulfil.POST(fulfilReq("POST", "mailed"));
  assert.equal(done.status, 200);
  const o = pg.rows("sendletter_orders").find((x) => x.id === OID)!;
  assert.equal(o.status, "mailed");
  assert.ok(o.mailed_at && o.printed_at, "mailed implies printed");
  await nextMock.flushAfter();
  assert.deepEqual(pg.rows("sendletter_webhook_events").map((e) => e.type), ["letter.printed", "letter.mailed"]); // recorded; no endpoint, so nothing delivered
  assert.equal(pg.rows("sendletter_webhook_deliveries").length, 0);
});

test("fulfil: bad signatures, tampered actions and expired links are refused; a cancelled order cannot be marked", async () => {
  setup();
  pg.seed("sendletter_orders", [{ id: OID, api_account_id: ACCT, status: "pending", to_name: "Jane", to_city: "Montreal" }]);
  assert.equal((await fulfil.POST(fulfilReq("POST", "mailed", { s: "00".repeat(32) }))).status, 400);
  assert.equal((await fulfil.POST(fulfilReq("POST", "printed", { a: "mailed" }))).status, 400, "the action is part of the signature");
  assert.equal(verifyFulfil({ o: OID, a: "mailed", e: "1", s: "00" }).ok, false);
  const old = fulfilParams(OID, "mailed", Date.now() - 90 * 86400_000);
  assert.equal(verifyFulfil(old).ok, false, "expired");
  pg.rows("sendletter_orders").find((o) => o.id === OID)!.status = "cancelled";
  assert.equal((await fulfil.POST(fulfilReq("POST", "mailed"))).status, 409);
});

// ── Webhooks ────────────────────────────────────────────────────

const hookPost = (body: unknown, key = LIVE) => post(body, key, {}, "http://x/api/v1/webhooks");

test("webhooks: endpoints must be public https; the secret is shown once", async () => {
  setup();
  for (const url of ["http://example.com/h", "https://localhost/h", "https://127.0.0.1/h", "https://10.0.0.5/h", "https://169.254.169.254/latest", "https://user:pw@example.com/h", "not a url"]) {
    assert.equal((await webhooksRoute.POST(hookPost({ url }))).status, 400, url);
  }
  wh.__setLookup(async () => [{ address: "10.1.2.3" }]);
  assert.equal((await webhooksRoute.POST(hookPost({ url: "https://sneaky.example.com/h" }))).status, 400, "a name that resolves inward");
  wh.__setLookup(async () => [{ address: "93.184.216.34" }]);
  assert.equal((await webhooksRoute.POST(hookPost({ url: "https://example.com/h", events: ["letter.exploded"] }))).status, 400);

  const ok = await webhooksRoute.POST(hookPost({ url: "https://example.com/hooks/sendletter", events: ["letter.mailed"] }));
  assert.equal(ok.status, 201);
  const j = await ok.json();
  assert.match(j.secret, /^whsec_[0-9a-f]{48}$/);
  const list = await (await webhooksRoute.GET(get("http://x/api/v1/webhooks"))).json();
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].secret, undefined, "never listed again");
});

test("webhooks: a letter's events are delivered signed, only to endpoints that want them, and test endpoints get test letters", async () => {
  setup();
  const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
  globalThis.fetch = (async (url: URL, init: RequestInit) => { calls.push({ url: String(url), headers: init.headers as Record<string, string>, body: String(init.body) }); return new Response("ok", { status: 200 }); }) as typeof fetch;

  const all = await (await webhooksRoute.POST(hookPost({ url: "https://example.com/all" }))).json();
  await webhooksRoute.POST(hookPost({ url: "https://example.com/mailed-only", events: ["letter.mailed"] }));
  await webhooksRoute.POST(hookPost({ url: "https://example.com/test-endpoint" }, TEST));

  const letter = await (await send.POST(post(draft()))).json();
  await nextMock.flushAfter();
  assert.deepEqual(calls.map((c) => c.url), ["https://example.com/all"], "live letter.created: the all-events endpoint only");
  const c = calls[0];
  const evt = JSON.parse(c.body);
  assert.equal(evt.type, "letter.created");
  assert.equal(evt.data.object.id, letter.id);
  assert.equal(c.headers["sendletter-event"], "letter.created");
  // The signature verifies with the endpoint's secret and rejects a tampered body.
  const m = c.headers["sendletter-signature"].match(/^t=(\d+),v1=([0-9a-f]{64})$/)!;
  assert.equal(wh.signPayload(all.secret, c.body, Number(m[1])), c.headers["sendletter-signature"]);
  assert.notEqual(wh.signPayload(all.secret, c.body + " ", Number(m[1])), c.headers["sendletter-signature"]);

  calls.length = 0;
  await send.POST(post(draft(), TEST));
  await nextMock.flushAfter();
  assert.deepEqual(calls.map((c2) => c2.url), ["https://example.com/test-endpoint"], "a test letter reaches only test endpoints");
});

test("webhooks: a failing endpoint is retried with backoff, then succeeds; seven failures give up", async () => {
  setup();
  let status = 500;
  let n = 0;
  globalThis.fetch = (async () => { n++; return new Response("", { status }); }) as typeof fetch;
  await webhooksRoute.POST(hookPost({ url: "https://example.com/flaky" }));
  await send.POST(post(draft()));
  await nextMock.flushAfter();
  assert.equal(n, 1);
  let d = pg.rows("sendletter_webhook_deliveries")[0];
  assert.equal(d.status, "pending");
  assert.equal(d.attempts, 1);
  assert.equal(d.last_status_code, 500);
  assert.ok(Date.parse(String(d.next_attempt_at)) > Date.now() + 30_000, "scheduled for later");

  // Not due yet: the job does nothing. Due: it retries, and a 200 completes it.
  assert.equal((await (await webhookCron.POST(cronReq())).json()).attempted, 0);
  d.next_attempt_at = new Date(Date.now() - 1000).toISOString();
  status = 200;
  assert.equal((await (await webhookCron.POST(cronReq())).json()).attempted, 1);
  d = pg.rows("sendletter_webhook_deliveries")[0];
  assert.equal(d.status, "succeeded");
  assert.equal(d.attempts, 2);

  // A permanently dead endpoint stops after MAX_ATTEMPTS.
  status = 500;
  await send.POST(post(draft()));
  await nextMock.flushAfter();
  const dead = pg.rows("sendletter_webhook_deliveries").find((x) => x.status === "pending")!;
  for (let i = 0; i < 10; i++) { dead.next_attempt_at = new Date(Date.now() - 1000).toISOString(); await webhookCron.POST(cronReq()); }
  assert.equal(dead.status, "failed");
  assert.equal(dead.attempts, wh.MAX_ATTEMPTS);
});

test("webhooks: delete an endpoint, and send it a test event", async () => {
  setup();
  const calls: string[] = [];
  globalThis.fetch = (async (_u: URL, init: RequestInit) => { calls.push(String((init.headers as Record<string, string>)["sendletter-event"])); return new Response(null, { status: 204 }); }) as typeof fetch;
  const ep = await (await webhooksRoute.POST(hookPost({ url: "https://example.com/h" }))).json();
  const t = await (await webhookTestRoute.POST(post({}, LIVE, {}, "http://x"), ctx(ep.id))).json();
  assert.deepEqual(t, { delivered: true, status_code: 204, error: null });
  assert.deepEqual(calls, ["webhook.test"]);
  assert.equal((await webhookRoute.DELETE(del("http://x"), ctx(ep.id))).status, 200);
  assert.equal((await webhookRoute.DELETE(del("http://x"), ctx(ep.id))).status, 404);
});

test("webhooks: private addresses are recognised", () => {
  for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.5.5", "192.168.1.1", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "0.0.0.0"]) assert.equal(wh.isPrivateAddress(ip), true, ip);
  for (const ip of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:4700:4700::1111"]) assert.equal(wh.isPrivateAddress(ip), false, ip);
});

// ── Quote and pricing ───────────────────────────────────────────

const qpost = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://x/api/v1/quote", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

test("quote: public, black and white by default, same arithmetic as send", async () => {
  const j = await (await quoteRoute.POST(qpost({ pages: 6 }))).json();
  const q = quote({ pages: 6, size: "standard", colour: false, duplex: true, channel: "api" });
  assert.equal(j.amount_cents, q.totalCents);
  assert.equal(j.stamps, 2);
  assert.equal(j.price.volume_basis, "list_price");
  assert.equal((await quoteRoute.POST(qpost({ pages: 0 }))).status, 400);
});

test("quote: letters_in_last_30_days shows the discount; with a key it uses the account's real count", async () => {
  const assumed = await (await quoteRoute.POST(qpost({ pages: 1, letters_in_last_30_days: 99 }))).json();
  assert.equal(assumed.amount_cents, 20 + 10 + 15 + 124);
  assert.equal(assumed.price.volume_basis, "assumed");
  setup();
  pg.seed("sendletter_api_usage", Array.from({ length: 4 }, () => ({ account_id: ACCT, api_key_id: "key-live", letter_mode: "draft", letter_size: "standard", amount_cents: 100, mailings: 1 })));
  const mine = await (await quoteRoute.POST(qpost({ pages: 1 }, { authorization: `Bearer ${LIVE}` }))).json();
  assert.equal(mine.price.volume_basis, "your_account");
  assert.equal(mine.price.lines[0].total_cents, volumeBaseCents(5));
  assert.equal((await quoteRoute.POST(qpost({ pages: 1 }, { authorization: "Bearer nope" }))).status, 401);
});

test("pricing: the public table has the $1.69 floor, the curve and a worked estimate", async () => {
  const j = await (await pricingRoute.GET(new Request("http://x/api/v1/pricing?letters_per_month=250&pages=1"))).json();
  assert.equal(j.as_low_as_cents, 169);
  assert.equal(j.volume_discount.floor_cents, 20);
  assert.equal(j.volume_discount.table.at(-1).base_fee_cents, 20);
  assert.equal(j.limits.default_daily_spend_cents, 50_000);
  assert.equal(j.estimate.steady_state_letter_cents, 169);
  assert.equal((await pricingRoute.GET(new Request("http://x/api/v1/pricing?letters_per_month=0"))).status, 400);
});

// ── CSV ─────────────────────────────────────────────────────────

test("csv: quotes, newlines and formula injection are neutralised", () => {
  assert.equal(toCsv(["a", "b"], [["x,y", 'he said "hi"'], ["=HYPERLINK(\"http://evil\")", "line\nbreak"]]),
    'a,b\r\n"x,y","he said ""hi"""\r\n"\'=HYPERLINK(""http://evil"")","line\nbreak"\r\n');
});

// ── db.ts: the filters produce the SQL the code relies on ───────

test("db: the comparison filters and delete build the right SQL", async () => {
  await getDb().from("sendletter_orders").update({ letter_html: null }).lt("created_at", "2026-01-01T00:00:00Z").notNull("letter_html").select("id");
  const q = pg.queries.find((x) => x.text.startsWith("UPDATE"))!;
  assert.equal(q.text, 'UPDATE "sendletter_orders" SET "letter_html" = $1 WHERE "created_at" < $2 AND "letter_html" IS NOT NULL RETURNING "id"');
  assert.deepEqual(q.params, [null, "2026-01-01T00:00:00Z"]);

  pg.queries.length = 0;
  await getDb().from("t").select("a").gte("x", 1).lte("y", 2).gt("z", 3).neq("w", 4).isNull("v");
  assert.equal(pg.queries[0].text, 'SELECT "a" FROM "t" WHERE "x" >= $1 AND "y" <= $2 AND "z" > $3 AND "w" <> $4 AND "v" IS NULL');

  pg.queries.length = 0;
  await getDb().from("sendletter_idempotency").delete().eq("id", "k");
  assert.equal(pg.queries[0].text, 'DELETE FROM "sendletter_idempotency" WHERE "id" = $1');
  assert.throws(() => { (getDb().from("t").delete() as unknown as { build(): unknown }).build(); }, /unfiltered DELETE/);
});

test("purge: rejects a wrong secret, and survives the files store being unreachable", async () => {
  assert.equal((await purge.POST(new Request("http://x", { method: "POST", headers: { "x-cron-key": "nope-nope-nope-nope-n" } }))).status, 401);
  const res = await purge.POST(new Request("http://x", { method: "POST", headers: { "x-cron-key": process.env.CRON_SECRET! } }));
  assert.equal(res.status, 500); // no CANNER_FILES_TOKEN here: reported, not a crash
});

test("purge: expired idempotency keys are removed, fresh ones kept", async () => {
  pg.seed("sendletter_idempotency", [{ account_id: ACCT, key: "old", request_hash: "h", created_at: daysAgo(9) }, { account_id: ACCT, key: "new", request_hash: "h" }]);
  await purge.POST(new Request("http://x", { method: "POST", headers: { "x-cron-key": process.env.CRON_SECRET! } }));
  assert.deepEqual(pg.rows("sendletter_idempotency").map((r) => r.key), ["new"]);
});

// ── Batch sending ───────────────────────────────────────────────

const bpost = (letters: unknown, key: string | null = "batch-1", apiKey = LIVE) =>
  new Request("http://x/api/v1/letters/batch", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, ...(key ? { "idempotency-key": key } : {}) },
    body: JSON.stringify({ letters }),
  });
const item = (name: string) => ({ ...draft({ to: addr(name) }) });

test("batch: many letters in one request count as one against the rate limit, and are priced one after another", async () => {
  setup();
  const res = await batchRoute.POST(bpost([item("A"), item("B"), item("C")]));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-ratelimit-remaining"), "119", "one request, not three");
  const j = await res.json();
  assert.equal(j.object, "batch");
  assert.equal(j.created, 3);
  assert.equal(j.failed, 0);
  const fees = j.results.map((r: { letter: { price: { lines: { total_cents: number }[] } } }) => r.letter.price.lines[0].total_cents);
  assert.deepEqual(fees, [volumeBaseCents(1), volumeBaseCents(2), volumeBaseCents(3)], "each letter is priced after the ones before it");
  assert.equal(pg.rows("sendletter_api_usage").length, 3);
  assert.equal(resend.sent.length, 3);
});

test("batch: re-sending the same batch creates nothing twice", async () => {
  setup();
  const first = await (await batchRoute.POST(bpost([item("A"), item("B")], "retry-me"))).json();
  const again = await (await batchRoute.POST(bpost([item("A"), item("B")], "retry-me"))).json();
  assert.equal(again.created, 0);
  assert.equal(again.replayed, 2);
  assert.deepEqual(again.results.map((r: { letter: { id: string } }) => r.letter.id), first.results.map((r: { letter: { id: string } }) => r.letter.id));
  assert.equal(pg.rows("sendletter_api_usage").length, 2, "billed once");
  assert.equal(resend.sent.length, 2, "printed once");
});

test("batch: a bad letter fails alone; the rest are still created, and a corrected re-send fills the gap", async () => {
  setup();
  const bad = { ...item("B"), to: { ...addr("B"), country: "US" } };
  const j = await (await batchRoute.POST(bpost([item("A"), bad, item("C")], "partial"))).json();
  assert.deepEqual(j.results.map((r: { status: string }) => r.status), ["created", "error", "created"]);
  assert.equal(j.results[1].http_status, 400);
  const fixed = await (await batchRoute.POST(bpost([item("A"), item("B"), item("C")], "partial"))).json();
  assert.deepEqual(fixed.results.map((r: { status: string }) => r.status), ["replayed", "created", "replayed"]);
});

test("batch: once the daily limit is reached the remaining letters are refused without more work", async () => {
  setup();
  pg.rows("sendletter_accounts")[0].daily_spend_limit_cents = 500; // two letters fit, the third does not
  const j = await (await batchRoute.POST(bpost([item("A"), item("B"), item("C"), item("D")], "limited"))).json();
  assert.deepEqual(j.results.map((r: { status: string }) => r.status), ["created", "created", "error", "error"]);
  assert.equal(j.results[2].code, "daily_limit_exceeded");
  assert.equal(j.results[3].code, "daily_limit_exceeded");
  assert.equal(pg.rows("sendletter_api_usage").length, 2);
});

test("batch: needs an Idempotency-Key, a non-empty array, and at most 100 letters", async () => {
  setup();
  const nokey = await batchRoute.POST(bpost([item("A")], null));
  assert.equal(nokey.status, 400);
  assert.equal((await nokey.json()).code, "idempotency_key_required");
  assert.equal((await batchRoute.POST(bpost([]))).status, 400);
  assert.equal((await batchRoute.POST(bpost("nope"))).status, 400);
  const big = await batchRoute.POST(bpost(Array.from({ length: 101 }, () => item("X")), "big"));
  assert.equal(big.status, 400);
  assert.equal((await big.json()).code, "batch_too_large");
  assert.equal(pg.rows("sendletter_api_usage").length, 0, "nothing created");
});

test("batch: test keys work the same way and bill nothing", async () => {
  setup({ firstOrder: true });
  const j = await (await batchRoute.POST(bpost([item("A"), item("B")], "t", TEST))).json();
  assert.equal(j.created, 2);
  assert.equal(pg.rows("sendletter_api_usage").length, 0);
  assert.equal(stripeMock.intents.length, 0);
});

// ── Fixes found by the fact-check ───────────────────────────────

test("billing: a declined first letter does not let the retry skip the up-front charge", async () => {
  setup({ firstOrder: true });
  stripeMock.failNext("Your card was declined.");
  assert.equal((await send.POST(post(draft(), LIVE, { "idempotency-key": "first" }))).status, 402);
  // The cancelled order is still in the table; nothing has ever been paid, so the retry is charged up front again.
  const retry = await send.POST(post(draft(), LIVE, { "idempotency-key": "first" }));
  assert.equal(retry.status, 200);
  assert.equal(stripeMock.intents.length, 1, "charged this time");
  assert.equal(pg.rows("sendletter_invoices").filter((i) => i.status === "paid").length, 1);
});

test("test mode: printed and mailed webhooks fire for test letters, once each, as the letter is read", async () => {
  setup();
  const events: string[] = [];
  globalThis.fetch = (async (_u: URL, init: RequestInit) => { events.push(String((init.headers as Record<string, string>)["sendletter-event"])); return new Response("ok", { status: 200 }); }) as typeof fetch;
  await webhooksRoute.POST(hookPost({ url: "https://example.com/t" }, TEST));
  const t = await (await send.POST(post(draft(), TEST))).json();
  await nextMock.flushAfter();
  assert.deepEqual(events, ["letter.created"]);

  const order = () => pg.rows("sendletter_orders").find((o) => o.id === t.id)!;
  order().created_at = new Date(Date.now() - 60_000).toISOString();
  await letterRoute.GET(get(`http://x/${t.id}`, TEST), ctx(t.id));
  assert.deepEqual(events, ["letter.created", "letter.printed"]);
  await letterRoute.GET(get(`http://x/${t.id}`, TEST), ctx(t.id));
  assert.equal(events.length, 2, "reading again fires nothing new");

  order().created_at = new Date(Date.now() - 300_000).toISOString();
  await letterRoute.GET(get(`http://x/${t.id}`, TEST), ctx(t.id));
  assert.deepEqual(events, ["letter.created", "letter.printed", "letter.mailed"]);
  assert.equal(order().status, "mailed");
});

test("test mode: the retry job moves aged test letters along even if nobody reads them", async () => {
  setup();
  const events: string[] = [];
  globalThis.fetch = (async (_u: URL, init: RequestInit) => { events.push(String((init.headers as Record<string, string>)["sendletter-event"])); return new Response("ok", { status: 200 }); }) as typeof fetch;
  await webhooksRoute.POST(hookPost({ url: "https://example.com/t", events: ["letter.mailed"] }, TEST));
  const t = await (await send.POST(post(draft(), TEST))).json();
  pg.rows("sendletter_orders").find((o) => o.id === t.id)!.created_at = new Date(Date.now() - 300_000).toISOString();
  const r = await (await webhookCron.POST(cronReq())).json();
  assert.equal(r.testLettersAdvanced, 1);
  assert.deepEqual(events, ["letter.mailed"], "only the subscribed event is delivered");
  assert.equal(await testLetters.advanceDueTestLetters(), 0, "nothing left to do");
});

test("volume: the calculator is exact beyond 5,000 letters and counts every envelope of a split letter", async () => {
  const { estimateVolume } = await import("../src/lib/volume.ts");
  const big = estimateVolume({ lettersPerMonth: 100_000, pages: 1, size: "standard", colour: false, duplex: true });
  assert.ok(big.first_30_days_average_cents >= big.steady_state_letter_cents);
  assert.ok(big.first_30_days_average_cents - big.steady_state_letter_cents < 5, "the ramp-up is spread over 100,000 letters, so the average barely moves");
  const split = estimateVolume({ lettersPerMonth: 50, pages: 40, size: "standard", colour: false, duplex: true });
  assert.ok(split.mailings_per_letter > 1);
  // 50 letters of several envelopes each is well past 100 mailings: the steady fee is the floor.
  assert.equal(quote({ pages: 40, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: 50 * split.mailings_per_letter - 1 }).totalCents, split.steady_state_letter_cents);
});

// ── Charging the card (the production bug: no payment_method) ───

test("charge: the card is passed explicitly: the customer's default, else the first attached; with a receipt email", async () => {
  setup();
  pg.rows("sendletter_accounts")[0].email = "buyer@example.com";
  stripeMock.setCustomer("cus_1", { default: "pm_default_visa", cards: ["pm_other", "pm_default_visa"] });
  pg.seed("sendletter_api_usage", [usage("u1", 500, lastMonth())]);
  await bill.POST(cronReq());
  assert.equal(stripeMock.intents[0].payment_method, "pm_default_visa");
  assert.equal(stripeMock.intents[0].receipt_email, "buyer@example.com");
  assert.equal(stripeMock.intents[0].off_session, true);
  assert.equal(stripeMock.intents[0].customer, "cus_1");

  pg.rows("sendletter_api_usage").length = 0; pg.rows("sendletter_invoices").length = 0; stripeMock.clear();
  stripeMock.setCustomer("cus_1", { default: null, cards: ["pm_first", "pm_second"] });
  pg.seed("sendletter_api_usage", [usage("u2", 500, lastMonth())]);
  await bill.POST(cronReq());
  assert.equal(stripeMock.intents[0].payment_method, "pm_first", "no default: the first card");
});

test("charge: a customer with no card at all fails cleanly, keeps the usage, and the owner is emailed", async () => {
  setup();
  stripeMock.setCustomer("cus_1", { default: null, cards: [] });
  pg.seed("sendletter_api_usage", [usage("u1", 500, lastMonth())]);
  const j = await (await bill.POST(cronReq())).json();
  assert.equal(j.results[0].status, "failed");
  assert.match(j.results[0].error, /No card on file/);
  assert.equal(pg.rows("sendletter_api_usage")[0].billed, false);
  assert.equal(pg.rows("sendletter_api_usage")[0].invoice_id, null);
  assert.equal(stripeMock.intents.length, 0);
  assert.match(resend.sent.at(-1)!.subject, /billing: 1 charge FAILED/);
});

test("charge: a first letter for a customer with no card is a clean 402 and nothing is sent", async () => {
  setup({ firstOrder: true });
  stripeMock.setCustomer("cus_1", { default: null, cards: [] });
  const res = await send.POST(post(draft()));
  assert.equal(res.status, 402);
  assert.equal((await res.json()).code, "payment_failed");
  assert.equal(resend.sent.length, 0);
});

test("bill: ?dry_run=1 shows what would be charged and charges and writes nothing", async () => {
  setup();
  pg.seed("sendletter_api_usage", [usage("u1", 379, daysAgo(60)), usage("u2", 379, daysAgo(59)), usage("u3", 300, new Date().toISOString())]);
  const before = JSON.stringify(pg.rows("sendletter_api_usage"));
  const j = await (await bill.POST(new Request("http://x/api/cron/bill?dry_run=1", { method: "POST", headers: { "x-cron-key": process.env.CRON_SECRET! } }))).json();
  assert.equal(j.dry_run, true);
  assert.deepEqual(j.accounts.map((a: { letters: number; cents: number }) => [a.letters, a.cents]), [[2, 758]], "this month's letter is not included");
  assert.equal(stripeMock.intents.length, 0);
  assert.equal(pg.rows("sendletter_invoices").filter((i) => i.kind === "monthly").length, 0);
  assert.equal(JSON.stringify(pg.rows("sendletter_api_usage")), before, "nothing written");
});
