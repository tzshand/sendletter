// The API against a REAL Postgres (PGlite, a WASM build of Postgres), instead of the
// in-memory fake the other server tests use. It proves things the fake cannot:
// that the schema migration runs, that every generated SQL statement is valid,
// that unique constraints and UPDATE ... WHERE guards behave under concurrent
// requests, and that timestamps, jsonb, bigint and arrays round-trip as they do
// through node-postgres.
//
// Optional: it runs when PGLITE_DIR points at a directory where
// `npm i @electric-sql/pglite` has been run, and is skipped otherwise (PGlite is
// 27 MB, so it is not a dependency of the project).
//   PGLITE_DIR=/path/to/dir pnpm test
import test from "node:test";
import assert from "node:assert/strict";

const enabled = Boolean(process.env.PGLITE_DIR);
const t = (name: string, fn: () => Promise<void>) => test(name, { skip: !enabled && "set PGLITE_DIR to run against a real Postgres" }, fn);

process.env.DATABASE_URL = "postgres://test";
process.env.RESEND_API_KEY = "re_test";
process.env.CRON_SECRET = "s3cret-s3cret-s3cret";
delete process.env.CANNER_FILES_TOKEN;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let real: any;
if (enabled) {
  const { PGlite, types } = await import("@electric-sql/pglite");
  // node-postgres returns bigint (int8) as a string; make PGlite do the same.
  real = new PGlite({ parsers: { [types.INT8]: (v: string) => v } });
  (globalThis as unknown as { __pgBackend: unknown }).__pgBackend = real;
}

const resend = await import("./mocks/resend.mts");
const stripeMock = await import("./mocks/stripe.mts");
const nextMock = await import("./mocks/next-server.mts");
const { hashApiKey } = await import("../src/lib/api-auth.ts");
const { resetRateLimits } = await import("../src/lib/rate-limit.ts");
const { quote } = await import("../src/lib/pricing.ts");
const { volumeBaseCents } = await import("../src/lib/volume-curve.ts");
const { getDb } = await import("../src/lib/db.ts");
const send = await import("../src/app/api/v1/send/route.ts");
const batchRoute = await import("../src/app/api/v1/letters/batch/route.ts");
const lettersRoute = await import("../src/app/api/v1/letters/route.ts");
const letterRoute = await import("../src/app/api/v1/letters/[id]/route.ts");
const webhooksRoute = await import("../src/app/api/v1/webhooks/route.ts");
const quoteRoute = await import("../src/app/api/v1/quote/route.ts");
const fulfil = await import("../src/app/api/fulfil/route.ts");
const bill = await import("../src/app/api/cron/bill/route.ts");
const webhookCron = await import("../src/app/api/cron/webhooks/route.ts");
const purge = await import("../src/app/api/cron/purge-drafts/route.ts");
const wh = await import("../src/lib/webhooks.ts");
const { fulfilParams } = await import("../src/lib/fulfil-links.ts");
const { runMonthlyBilling, invoiceNumber } = await import("../src/lib/invoices.ts");
const { spentToday, recentMailings, torontoDayStart, torontoMonthStart } = await import("../src/lib/api-limits.ts");
const { advanceDueTestLetters } = await import("../src/lib/test-letters.ts");

const ACCT = "11111111-1111-4111-8111-111111111111";
const LIVE = "sl_live_" + "a".repeat(64);
const TEST = "sl_test_" + "b".repeat(64);
const addr = (name: string) => ({ name, line1: "1 Main St", city: "Toronto", province: "ON", postal_code: "M5V 1A1", country: "CA" });
const draft = (extra: Record<string, unknown> = {}, to = "Recipient") => ({ from: addr("Sender"), to: addr(to), mode: "draft", letter: { body: "Hello there." }, ...extra });
const post = (body: unknown, key = LIVE, headers: Record<string, string> = {}) =>
  new Request("http://x/api/v1/letters", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...headers }, body: JSON.stringify(body) });
const get = (url: string, key = LIVE) => new Request(url, { headers: { authorization: `Bearer ${key}` } });
const del = (key = LIVE) => new Request("http://x", { method: "DELETE", headers: { authorization: `Bearer ${key}` } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const cron = () => new Request("http://x", { method: "POST", headers: { "x-cron-key": process.env.CRON_SECRET! } });
const hook = (body: unknown, key = LIVE) => new Request("http://x/api/v1/webhooks", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

const q = async (sql: string, params: unknown[] = []) => (await real.query(sql, params)).rows as Record<string, unknown>[];
const count = async (table: string, where = "true", params: unknown[] = []) => Number((await q(`select count(*)::int as n from ${table} where ${where}`, params))[0].n);

async function reset({ paid = true, card = true }: { paid?: boolean; card?: boolean } = {}) {
  await getDb().from("sendletter_accounts").select("id").limit(1); // makes db.ts run the schema migration once
  await real.exec(`truncate sendletter_webhook_deliveries, sendletter_webhook_events, sendletter_webhook_endpoints, sendletter_idempotency,
    sendletter_invoice_lines, sendletter_invoices, sendletter_api_usage, sendletter_orders, sendletter_api_keys, sendletter_limit_requests, sendletter_billing_runs, sendletter_sessions, sendletter_accounts cascade`);
  await q("insert into sendletter_accounts (id, email, has_payment_method, stripe_customer_id) values ($1, 'dev@example.com', $2, 'cus_1')", [ACCT, card]);
  await q("insert into sendletter_api_keys (id, account_id, key_hash, key_prefix, livemode) values ('22222222-2222-4222-8222-222222222222', $1, $2, 'sl_live_aaa...', true), ('33333333-3333-4333-8333-333333333333', $1, $3, 'sl_test_bbb...', false)", [ACCT, hashApiKey(LIVE), hashApiKey(TEST)]);
  if (paid) await q("insert into sendletter_invoices (account_id, kind, status, letters, total_cents) values ($1, 'first_order', 'paid', 1, 300)", [ACCT]);
  resend.clear();
  stripeMock.clear();
  resetRateLimits();
  globalThis.fetch = (() => { throw new Error("unexpected network call"); }) as typeof fetch;
  wh.__setLookup(async () => [{ address: "93.184.216.34" }]);
}

t("schema: the migration creates every table and a first live letter works end to end", async () => {
  await reset({ paid: false });
  const res = await send.POST(post(draft({ reference: "r-1", metadata: { k: "v" } })));
  assert.equal(res.status, 200, await res.clone().text());
  const j = await res.json();
  assert.equal(j.amount_cents, 99 + 10 + 15 + 124);
  // charged up front, on a paid invoice, with its line
  assert.equal(stripeMock.intents.length, 1);
  const inv = (await q("select * from sendletter_invoices where kind = 'first_order' and status = 'paid' and stripe_payment_intent_id is not null"))[0];
  assert.ok(inv);
  assert.equal(typeof inv.seq, "string", "bigint arrives as a string, like node-postgres");
  assert.match(invoiceNumber(Number(inv.seq), String(inv.created_at)), /^SL-\d{4}-\d{6}$/);
  assert.equal(await count("sendletter_invoice_lines", "invoice_id = $1", [inv.id]), 1);
  // the stored order round-trips jsonb, booleans and metadata
  const o = (await q("select * from sendletter_orders where id = $1", [j.id]))[0];
  assert.equal(o.reference, "r-1");
  assert.deepEqual(o.metadata, { k: "v" });
  assert.equal(o.livemode, true);
  assert.equal((o.price_breakdown as { totalCents: number }).totalCents, 248);
  const u = (await q("select * from sendletter_api_usage where order_id = $1", [j.id]))[0];
  assert.equal(u.billed, true);
  assert.equal(u.mailings, 1);
  // and reads back through the API, with timestamps as ISO strings
  const got = await (await letterRoute.GET(get(`http://x/${j.id}`), ctx(j.id))).json();
  assert.equal(got.status, "queued");
  assert.match(got.created_at, /^\d{4}-\d\d-\d\dT/);
});

t("idempotency: six identical requests sent at once make exactly one letter", async () => {
  await reset();
  const results = await Promise.all(Array.from({ length: 6 }, () => send.POST(post(draft(), LIVE, { "idempotency-key": "race-1" }))));
  const statuses = results.map((r) => r.status).sort();
  assert.ok(statuses.every((s) => s === 200 || s === 409), `statuses ${statuses}`);
  assert.equal(await count("sendletter_orders", "api_account_id = $1 and livemode", [ACCT]), 1, "one order");
  assert.equal(await count("sendletter_api_usage"), 1, "billed once");
  assert.equal(resend.sent.length, 1, "printed once");
  // a retry after the dust settles replays the same letter
  const replay = await send.POST(post(draft(), LIVE, { "idempotency-key": "race-1" }));
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get("idempotent-replayed"), "true");
});

t("idempotency: a request older than 7 days is treated as new", async () => {
  await reset();
  const first = await (await send.POST(post(draft(), LIVE, { "idempotency-key": "old-key" }))).json();
  await q("update sendletter_idempotency set created_at = now() - interval '8 days'");
  const again = await (await send.POST(post(draft(), LIVE, { "idempotency-key": "old-key" }))).json();
  assert.notEqual(again.id, first.id);
  assert.equal(await count("sendletter_idempotency"), 1, "the expired record was replaced");
});

t("limits: concurrent letters cannot jointly overrun the daily limit", async () => {
  await reset();
  await q("update sendletter_accounts set daily_spend_limit_cents = 500"); // two $2.48 letters fit, a third does not
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => send.POST(post(draft({}, `R${i}`)))));
  const ok = results.filter((r) => r.status === 200).length;
  const limited = results.filter((r) => r.status === 429).length;
  assert.equal(ok + limited, 8);
  const spent = Number((await q("select coalesce(sum(amount_cents),0)::int as s from sendletter_api_usage where voided_at is null"))[0].s);
  assert.ok(spent <= 500, `spent ${spent} against a 500 limit (${ok} accepted)`);
  assert.equal(ok, 2);
});

t("volume: the window counts the last 30 days of real timestamps and ignores voided rows", async () => {
  await reset();
  const row = (age: number, voided = false) => q(
    `insert into sendletter_api_usage (account_id, api_key_id, letter_mode, letter_size, amount_cents, mailings, created_at, voided_at)
     values ($1, '22222222-2222-4222-8222-222222222222', 'draft', 'standard', 100, 2, now() - ($2 || ' days')::interval, ${voided ? "now()" : "null"})`, [ACCT, String(age)]);
  await row(1); await row(20); await row(29); await row(31); await row(2, true);
  assert.equal(await recentMailings(ACCT), 6, "three rows inside 30 days at 2 mailings each");
  const j = await (await send.POST(post(draft()))).json();
  assert.equal(j.price.lines[0].total_cents, volumeBaseCents(7));
});

t("limits: 'today' is the Toronto calendar day, not the UTC day", async () => {
  await reset();
  const start = torontoDayStart(new Date());
  const ins = (when: Date, cents: number) => q(
    `insert into sendletter_api_usage (account_id, api_key_id, letter_mode, letter_size, amount_cents, created_at) values ($1, '22222222-2222-4222-8222-222222222222', 'draft', 'standard', $2, $3)`, [ACCT, cents, when.toISOString()]);
  await ins(new Date(start.getTime() - 60_000), 1000); // one minute before Toronto midnight: yesterday
  await ins(new Date(start.getTime() + 60_000), 700);  // one minute after: today
  assert.equal(await spentToday(ACCT), 700);
});

t("batch: 25 letters, one bad, on a real database: priced in order, billed once, replayed safely", async () => {
  await reset();
  const letters = Array.from({ length: 25 }, (_, i) => draft({ reference: `b${i}` }, `R${i}`));
  letters[9] = { ...letters[9], to: { ...addr("Bad"), country: "US" } };
  const mk = (key: string) => new Request("http://x/api/v1/letters/batch", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${LIVE}`, "idempotency-key": key }, body: JSON.stringify({ letters }) });
  const j = await (await batchRoute.POST(mk("bulk-1"))).json();
  assert.equal(j.created, 24);
  assert.equal(j.failed, 1);
  assert.equal(j.results[9].code, "unsupported_destination");
  const fees = j.results.filter((r: { status: string }) => r.status === "created").map((r: { letter: { price: { lines: { total_cents: number }[] } } }) => r.letter.price.lines[0].total_cents);
  assert.deepEqual(fees, Array.from({ length: 24 }, (_, i) => volumeBaseCents(i + 1)), "each priced after the ones before it");
  assert.equal(await count("sendletter_api_usage"), 24);
  const again = await (await batchRoute.POST(mk("bulk-1"))).json();
  assert.equal(again.replayed, 24);
  assert.equal(again.created, 0);
  assert.equal(await count("sendletter_api_usage"), 24, "nothing duplicated");
  assert.equal(resend.sent.length, 24);
});

t("cancel: a cancelled paid letter is voided and refunded; DELETE and 'mark printed' racing leave exactly one outcome", async () => {
  await reset({ paid: false });
  const a = await (await send.POST(post(draft()))).json(); // first letter: charged up front
  const cancelled = await (await letterRoute.DELETE(del(), ctx(a.id))).json();
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.refunded_cents, 248);
  assert.equal(stripeMock.refunds.length, 1);
  assert.equal(Number((await q("select refunded_cents from sendletter_api_usage where order_id = $1", [a.id]))[0].refunded_cents), 248);
  assert.equal((await letterRoute.DELETE(del(), ctx(a.id))).status, 200, "cancelling twice is safe");
  assert.equal(stripeMock.refunds.length, 1, "refunded once");

  await q("insert into sendletter_invoices (account_id, kind, status, letters, total_cents) values ($1, 'monthly', 'paid', 1, 1)", [ACCT]);
  const b = await (await send.POST(post(draft({}, "Race")))).json();
  const fire = () => fulfil.POST(new Request("http://x/api/fulfil", { method: "POST", body: new URLSearchParams(fulfilParams(b.id, "printed")) }));
  const [d, f] = await Promise.all([letterRoute.DELETE(del(), ctx(b.id)), fire()]);
  const final = (await q("select status, printed_at, cancelled_at from sendletter_orders where id = $1", [b.id]))[0];
  assert.ok(final.status === "cancelled" || final.status === "printed", String(final.status));
  if (final.status === "cancelled") { assert.equal(final.printed_at, null); assert.equal(d.status, 200); }
  else { assert.equal(final.cancelled_at, null); assert.equal(d.status, 409); }
  assert.ok(f.status === 200 || f.status === 409);
});

t("billing: monthly run on real timestamps makes one invoice; two runs at once cannot both charge", async () => {
  await reset();
  const lastMonth = new Date(torontoMonthStart().getTime() - 5 * 86400_000).toISOString();
  for (let i = 0; i < 4; i++) {
    await q(`insert into sendletter_api_usage (account_id, api_key_id, letter_mode, letter_size, amount_cents, created_at) values ($1, '22222222-2222-4222-8222-222222222222', 'draft', 'standard', 250, $2)`, [ACCT, lastMonth]);
  }
  await q(`insert into sendletter_api_usage (account_id, api_key_id, letter_mode, letter_size, amount_cents) values ($1, '22222222-2222-4222-8222-222222222222', 'draft', 'standard', 250)`, [ACCT]); // this month
  const [r1, r2] = await Promise.all([runMonthlyBilling(), runMonthlyBilling()]);
  const charged = [...r1, ...r2].filter((r) => r.status === "succeeded");
  assert.equal(charged.length, 1, "exactly one run charged");
  assert.equal(stripeMock.intents.length, 1);
  assert.equal(stripeMock.intents[0].amount, 1000);
  assert.equal(await count("sendletter_api_usage", "billed"), 4);
  assert.equal(await count("sendletter_api_usage", "not billed"), 1, "this month's letter waits");
  assert.equal(await count("sendletter_invoices", "kind = 'monthly' and status = 'paid'"), 1);
  assert.equal(await count("sendletter_invoices", "status = 'void'") + await count("sendletter_invoices", "status = 'open'"), 0 + (await count("sendletter_invoices", "status = 'void'")));
});

t("billing: a failed monthly charge releases the claim, and the HTTP cron route retries it", async () => {
  await reset();
  await q(`insert into sendletter_api_usage (account_id, api_key_id, letter_mode, letter_size, amount_cents, created_at) values ($1, '22222222-2222-4222-8222-222222222222', 'draft', 'standard', 500, $2)`, [ACCT, daysAgo(40)]);
  stripeMock.failNext("insufficient funds");
  const first = await (await bill.POST(cron())).json();
  assert.equal(first.results[0].status, "failed");
  assert.equal((await q("select invoice_id, billed from sendletter_api_usage"))[0].invoice_id, null);
  const second = await (await bill.POST(cron())).json();
  assert.equal(second.results[0].status, "succeeded");
});

t("webhooks: events and deliveries persist; a failing endpoint is retried by due time; success completes", async () => {
  await reset();
  let status = 500;
  const seen: string[] = [];
  globalThis.fetch = (async (_u: URL, init: RequestInit) => { seen.push(String((init.headers as Record<string, string>)["sendletter-event"])); return new Response("", { status }); }) as typeof fetch;
  assert.equal((await webhooksRoute.POST(hook({ url: "https://example.com/h" }))).status, 201);
  const letter = await (await send.POST(post(draft()))).json();
  await nextMock.flushAfter();
  const ev = (await q("select * from sendletter_webhook_events"))[0];
  assert.equal(ev.type, "letter.created");
  assert.equal((ev.payload as { data: { object: { id: string } } }).data.object.id, letter.id);
  let d = (await q("select * from sendletter_webhook_deliveries"))[0];
  assert.equal(d.status, "pending");
  assert.equal(Number(d.attempts), 1);
  assert.equal(await webhookCron.POST(cron()).then((r) => r.json()).then((j) => j.attempted), 0, "not due yet");
  await q("update sendletter_webhook_deliveries set next_attempt_at = now() - interval '1 second'");
  status = 200;
  assert.equal((await (await webhookCron.POST(cron())).json()).attempted, 1);
  d = (await q("select * from sendletter_webhook_deliveries"))[0];
  assert.equal(d.status, "succeeded");
  assert.equal(Number(d.attempts), 2);
  assert.ok(d.delivered_at instanceof Date);
  assert.equal(seen.length, 2);
});

t("test letters: ageing them by SQL moves them along once each, firing their webhooks", async () => {
  await reset();
  const events: string[] = [];
  globalThis.fetch = (async (_u: URL, init: RequestInit) => { events.push(String((init.headers as Record<string, string>)["sendletter-event"])); return new Response("ok"); }) as typeof fetch;
  await webhooksRoute.POST(hook({ url: "https://example.com/t" }, TEST));
  const tl = await (await send.POST(post(draft(), TEST))).json();
  await nextMock.flushAfter();
  await q("update sendletter_orders set created_at = now() - interval '5 minutes' where id = $1", [tl.id]);
  assert.equal(await advanceDueTestLetters(), 1);
  assert.equal(await advanceDueTestLetters(), 0, "done once");
  assert.deepEqual(events, ["letter.created", "letter.printed", "letter.mailed"]);
  assert.equal((await q("select status from sendletter_orders where id = $1", [tl.id]))[0].status, "mailed");
  assert.equal(await count("sendletter_api_usage"), 0, "a test letter is never billed");
  assert.equal(stripeMock.intents.length, 0);
});

t("purge: expired idempotency keys and old webhook events are deleted, fresh ones kept", async () => {
  await reset();
  await q("insert into sendletter_idempotency (account_id, key, request_hash, created_at) values ($1, 'old', 'h', now() - interval '9 days'), ($1, 'new', 'h', now())", [ACCT]);
  await purge.POST(cron()); // the files store is not configured here, so it reports 500 after the housekeeping ran
  assert.deepEqual((await q("select key from sendletter_idempotency")).map((r) => r.key), ["new"]);
});

t("data: hostile and unusual text is stored and read back intact, and never breaks SQL", async () => {
  await reset();
  const nasty = "Robert'); DROP TABLE sendletter_orders;-- \"quoted\" \\ back\\slash 日本語 Zoë 😀";
  const res = await send.POST(post(draft({ reference: nasty, metadata: { note: nasty } }, nasty)));
  assert.equal(res.status, 200, await res.clone().text());
  const j = await res.json();
  assert.equal(j.reference, nasty);
  assert.equal(j.to.name, nasty);
  assert.equal(await count("sendletter_orders"), 1, "the table is still there");
  assert.deepEqual((await q("select metadata from sendletter_orders"))[0].metadata, { note: nasty });
  // HTML in the recipient name must not reach the fulfilment email unescaped
  const html = resend.sent[0].html;
  assert.equal(html.includes("<script"), false);
  const xss = await send.POST(post(draft({}, "<script>alert(1)</script>")));
  assert.equal(xss.status, 200);
  assert.equal(resend.sent.at(-1)!.html.includes("<script>alert(1)</script>"), false, "escaped in the email");
});

t("data: a 50,000-character letter body and a large metadata object are handled", async () => {
  await reset();
  const body = "Lorem ipsum dolor sit amet. ".repeat(1800).slice(0, 50_000);
  assert.equal(body.length, 50_000);
  const res = await send.POST(post({ ...draft(), letter: { body } }));
  assert.equal(res.status, 200, await res.clone().text());
  assert.ok((await res.json()).pages > 5);
  const tooBig = await send.POST(post({ ...draft(), letter: { body: body + "x" } }));
  assert.equal(tooBig.status, 400);
});

t("auth: a revoked key stops working at once, a replaced test key does not unlock the old one", async () => {
  await reset();
  assert.equal((await send.POST(post(draft()))).status, 200);
  await q("update sendletter_api_keys set is_active = false, revoked_at = now() where key_hash = $1", [hashApiKey(LIVE)]);
  assert.equal((await send.POST(post(draft()))).status, 401);
  assert.equal((await send.POST(post(draft(), TEST))).status, 200, "the test key is a separate key");
  await q("update sendletter_accounts set has_payment_method = false");
  assert.equal((await send.POST(post(draft(), TEST))).status, 200, "a test key needs no card");
});

t("the account pages' queries are valid SQL and scoped to the account", async () => {
  await reset();
  const other = "44444444-4444-4444-8444-444444444444";
  await q("insert into sendletter_accounts (id, email) values ($1, 'other@example.com')", [other]);
  await send.POST(post(draft({ reference: "mine" })));
  await q("insert into sendletter_orders (customer_email, letter_mode, amount_cents, from_name, from_line1, from_city, to_name, to_line1, to_city, api_account_id, livemode) values ('', 'draft', 1, 'a','b','c','NotMine','e','f',$1,true)", [other]);
  const db = getDb();
  // orders page
  const { data: orders } = await db.from("sendletter_orders")
    .select("id, created_at, status, livemode, printed_at, mailed_at, cancelled_at, reference, to_name, to_city, to_province, page_count, letter_size, colour, amount_cents")
    .eq("api_account_id", ACCT).eq("livemode", true).order("created_at", { ascending: false }).limit(1000);
  assert.deepEqual(orders.map((o: { reference: string }) => o.reference), ["mine"]);
  const { data: usage } = await db.from("sendletter_api_usage").select("order_id, invoice_id").in("order_id", orders.map((o: { id: string }) => o.id));
  assert.equal(usage.length, 1);
  // invoices page and detail
  const { data: invs } = await db.from("sendletter_invoices").select("*").eq("account_id", ACCT).order("created_at", { ascending: false }).limit(500);
  assert.equal(invs.length, 1);
  const { data: lines } = await db.from("sendletter_invoice_lines").select("order_id, description, amount_cents").eq("invoice_id", invs[0].id);
  assert.ok(Array.isArray(lines));
  const { data: pending } = await db.from("sendletter_api_usage").select("amount_cents").eq("account_id", ACCT).eq("billed", false).isNull("voided_at");
  assert.equal(pending.length, 1);
  // developers page: deliveries lookup with no endpoints uses a placeholder uuid
  const { data: dels } = await db.from("sendletter_webhook_deliveries").select("id").in("endpoint_id", ["00000000-0000-0000-0000-000000000000"]).limit(15);
  assert.deepEqual(dels, []);
  // another account's invoice is not visible through the scoped query
  const { data: foreign } = await db.from("sendletter_invoices").select("id").eq("id", invs[0].id).eq("account_id", other).single();
  assert.equal(foreign, null);
});

t("quote: public quotes and key-based quotes agree with what a real send is charged", async () => {
  await reset();
  for (let i = 0; i < 6; i++) await send.POST(post(draft({}, `R${i}`)));
  const quoted = await (await quoteRoute.POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${LIVE}` }, body: JSON.stringify({ pages: 1 }) }))).json();
  const sent = await (await send.POST(post(draft({}, "Next")))).json();
  assert.equal(quoted.amount_cents, sent.amount_cents, "the quote matches the next letter's real price");
  assert.equal(quoted.amount_cents, quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: 6 }).totalCents);
  const list = await (await lettersRoute.GET(get("http://x/api/v1/letters?limit=3"))).json();
  assert.equal(list.data.length, 3);
  assert.equal(list.has_more, true);
});

t("money: over 45 random letters with cancellations, the invoice, the Stripe charge, its lines and the usage rows agree to the cent", async () => {
  await reset();
  const { PDFDocument } = await import("pdf-lib");
  const pdfOf = async (n: number) => { const d = await PDFDocument.create(); for (let i = 0; i < n; i++) d.addPage([612, 792]); return Buffer.from(await d.save()).toString("base64"); };
  let seed = 424242;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const sizes = ["standard", "large", "legal"] as const;
  const made: { id: string; cents: number }[] = [];
  for (let i = 0; i < 45; i++) {
    const body = { from: addr("S"), to: addr(`R${i}`), mode: "upload", file_type: "pdf", file: await pdfOf(1 + Math.floor(rnd() * 25)), letter_size: sizes[Math.floor(rnd() * 3)], colour: rnd() < 0.4, duplex: rnd() < 0.6, reference: `m${i}` };
    const res = await send.POST(post(body));
    assert.equal(res.status, 200, await res.clone().text());
    const j = await res.json();
    made.push({ id: j.id, cents: j.amount_cents });
  }
  const cancelled = new Set<string>();
  for (const m of made.filter((_, i) => i % 9 === 4)) { assert.equal((await letterRoute.DELETE(del(), ctx(m.id))).status, 200); cancelled.add(m.id); }
  // age everything into last month
  const lastMonth = new Date(torontoMonthStart().getTime() - 3 * 86400_000).toISOString();
  await q("update sendletter_api_usage set created_at = $1", [lastMonth]);
  const results = await runMonthlyBilling();
  assert.equal(results.length, 1);
  assert.equal(results[0].status, "succeeded");
  const expected = made.filter((m) => !cancelled.has(m.id)).reduce((s, m) => s + m.cents, 0);
  const inv = (await q("select * from sendletter_invoices where kind = 'monthly'"))[0];
  const lines = await q("select amount_cents from sendletter_invoice_lines where invoice_id = $1", [inv.id]);
  const billed = Number((await q("select coalesce(sum(amount_cents),0)::int s from sendletter_api_usage where billed and voided_at is null"))[0].s);
  assert.equal(stripeMock.intents.length, 1);
  assert.equal(stripeMock.intents[0].amount, expected, "the card was charged the sum of the live letters");
  assert.equal(Number(inv.total_cents), expected);
  assert.equal(lines.reduce((s, l) => s + Number(l.amount_cents), 0), expected, "lines sum to the invoice");
  assert.equal(lines.length, made.length - cancelled.size, "one line per live letter");
  assert.equal(billed, expected, "usage marked billed sums to the invoice");
  assert.equal(await count("sendletter_api_usage", "voided_at is not null"), cancelled.size, "cancelled letters are voided, not billed");
  assert.equal(Number(inv.letters), made.length - cancelled.size);
});
