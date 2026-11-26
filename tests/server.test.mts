// The real route handlers and db.ts, run against in-memory fakes of Postgres,
// Stripe, the mailer and API-key auth (see tests/resolve-ts.mjs and tests/mocks).
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
const { quote } = await import("../src/lib/pricing.ts");
const send = await import("../src/app/api/v1/send/route.ts");
const quoteRoute = await import("../src/app/api/v1/quote/route.ts");
const bill = await import("../src/app/api/cron/bill/route.ts");
const purge = await import("../src/app/api/cron/purge-drafts/route.ts");
const { getDb } = await import("../src/lib/db.ts");

const ORDER_ID = "11111111-2222-3333-4444-555555555555";
const respondInsertReturning = () => pg.setResponder((text) => (/^INSERT INTO "sendletter_orders".*RETURNING/s.test(text) ? [{ id: ORDER_ID }] : []));

const post = (body: unknown, url = "http://x/api/v1/send") =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const addr = (name: string) => ({ name, line1: "1 Main St", city: "Toronto", province: "ON", postal_code: "M5V 1A1", country: "CA" });
const base = { from: addr("Sender"), to: addr("Recipient") };

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

test.beforeEach(() => {
  pg.reset();
  resend.clear();
  stripeMock.clear();
  respondInsertReturning();
});

// ── POST /api/v1/send ───────────────────────────────────────────

test("send: a one-page draft is priced by the shared quote and recorded in full", async () => {
  const res = await send.POST(post({ ...base, mode: "draft", letter: { body: "Hello there." } }));
  assert.equal(res.status, 200);
  const j = await res.json();
  const q = quote({ pages: 1, size: "standard", colour: true, duplex: true, channel: "api" });
  assert.equal(j.pages, 1);
  assert.equal(j.mailings, 1);
  assert.equal(j.stamps, 1);
  assert.equal(j.amount_cents, q.totalCents);
  assert.equal(j.amount_cents, 99 + 10 + 50 + 124); // API base $0.99
  assert.deepEqual(j.price.lines.map((l: { item: string }) => l.item), ["base", "envelope", "pages", "postage"]);

  const o = orderInsert();
  assert.equal(col(o, "amount_cents"), q.totalCents);
  assert.equal(col(o, "colour"), true);
  assert.equal(col(o, "duplex"), true);
  assert.equal(col(o, "mailings"), 1);
  assert.equal(col(o, "stamps"), 1);
  assert.equal(col(o, "page_count"), 1);
  assert.equal(col(o, "pricing_version"), q.version);
  assert.equal((col(o, "price_breakdown") as { totalCents: number }).totalCents, q.totalCents);
  assert.equal(col(usageInsert(), "amount_cents"), q.totalCents);
});

test("send: the fulfilment email attaches the print-ready PDF and says how many stamps", async () => {
  await send.POST(post({ ...base, mode: "draft", letter: { body: "Hello there." } }));
  assert.equal(resend.sent.length, 1);
  const mail = resend.sent[0];
  assert.match(mail.html, /Print &amp; stamp/);
  assert.match(mail.html, /1 &times; \$1\.24 stamp/);
  const att = mail.attachments?.find((a) => a.filename === "print.pdf");
  assert.ok(att, "print.pdf attached");
  const doc = await PDFDocument.load(Buffer.from(att!.content, "base64"));
  assert.equal(doc.getPageCount(), 2); // address page + the letter
});

test("send: black-and-white, single-sided, flat legal", async () => {
  const res = await send.POST(post({ ...base, mode: "draft", letter_size: "legal", colour: false, duplex: false, letter: { body: "Short." } }));
  const j = await res.json();
  const q = quote({ pages: 1, size: "legal", colour: false, duplex: false, channel: "api" });
  assert.equal(j.amount_cents, q.totalCents);
  assert.equal(j.stamps, 3); // flat mailers are oversize: 3 coil stamps
  assert.equal(col(orderInsert(), "colour"), false);
  assert.equal(col(orderInsert(), "duplex"), false);
});

test("send: a long draft is paginated by us and priced by its real page count", async () => {
  const body = Array.from({ length: 90 }, (_, i) => `Paragraph ${i + 1}. The quick brown fox jumps over the lazy dog.`).join("\n\n");
  const res = await send.POST(post({ ...base, mode: "draft", letter_size: "large", colour: false, letter: { body } }));
  const j = await res.json();
  assert.ok(j.pages > 2, `pages ${j.pages}`);
  assert.equal(j.amount_cents, quote({ pages: j.pages, size: "large", colour: false, duplex: true, channel: "api" }).totalCents);
});

test("send: a PDF upload's page count is measured, never taken from the caller", async () => {
  const res = await send.POST(post({ ...base, mode: "upload", file_type: "pdf", file: await pdfB64(3), page_count: 99 }));
  const j = await res.json();
  assert.equal(j.pages, 3);
  assert.equal(col(orderInsert(), "page_count"), 3);
});

test("send: a .docx needs page_count; with it, it prices on that", async () => {
  const file = Buffer.from("not really a docx").toString("base64");
  const no = await send.POST(post({ ...base, mode: "upload", file_type: "docx", file }));
  assert.equal(no.status, 400);
  assert.match((await no.json()).error, /page_count is required/);
  const yes = await send.POST(post({ ...base, mode: "upload", file_type: "docx", file, page_count: 4 }));
  assert.equal(yes.status, 200);
  assert.equal((await yes.json()).pages, 4);
});

test("send: a PDF that can't be read is refused", async () => {
  const res = await send.POST(post({ ...base, mode: "upload", file_type: "pdf", file: Buffer.from("garbage").toString("base64") }));
  assert.equal(res.status, 400);
  assert.equal(pg.queries.some((q) => q.text.startsWith('INSERT INTO "sendletter_orders"')), false, "no order recorded");
});

test("send: formatted HTML uses the caller's page_count, else a conservative estimate", async () => {
  const html = Array.from({ length: 120 }, (_, i) => `<p>Paragraph ${i + 1} of a long formatted letter that runs onto several pages.</p>`).join("");
  const est = await (await send.POST(post({ ...base, mode: "formatted", html }))).json();
  assert.ok(est.pages >= 2);
  assert.match(resend.sent[0].html, /ESTIMATE/);
  const given = await (await send.POST(post({ ...base, mode: "formatted", html, page_count: 5 }))).json();
  assert.equal(given.pages, 5);
});

test("send: a free-form (international) return address is accepted and kept", async () => {
  const res = await send.POST(post({ to: addr("Recipient"), from: { lines: ["Ana García", "Calle 17 #4-77", "Bogotá", "Colombia"] }, mode: "draft", letter: { body: "Hola." } }));
  assert.equal(res.status, 200);
  assert.equal(col(orderInsert(), "from_lines"), "Ana García\nCalle 17 #4-77\nBogotá\nColombia");
  assert.match(resend.sent[0].html, /Calle 17 #4-77/);
});

test("send: bad input is refused before anything is stored", async () => {
  const bad: Record<string, unknown>[] = [
    { ...base, mode: "draft", letter: { body: "x" }, letter_size: "huge" },
    { ...base, mode: "draft", letter: { body: "x" }, colour: "yes" },
    { ...base, mode: "draft", letter: { body: "x" }, duplex: 1 },
    { ...base, to: { ...addr("R"), country: "US" }, mode: "draft", letter: { body: "x" } },
    { ...base, mode: "formatted", html: "<p>x</p>", page_count: 201 },
    { ...base, mode: "formatted", html: "<p>x</p>", page_count: 0 },
    { ...base, mode: "nope" },
  ];
  for (const b of bad) assert.equal((await send.POST(post(b))).status, 400, JSON.stringify(b).slice(0, 80));
  assert.equal(pg.queries.some((q) => q.text.startsWith("INSERT")), false);
});

test("send: a free-text date in a draft is printed as written, not 'Invalid Date'", async () => {
  const res = await send.POST(post({ ...base, mode: "draft", letter: { body: "Hi.", date: "March 5, 2026" } }));
  assert.equal(res.status, 200);
  const att = resend.sent[0].attachments?.find((a) => a.filename === "print.pdf");
  const text = pdfText(Buffer.from(att!.content, "base64"));
  assert.ok(text.includes("March 5, 2026"), "the date is printed as written");
  assert.equal(text.includes("Invalid Date"), false);
});

// ── POST /api/v1/quote ──────────────────────────────────────────

test("quote: public, same arithmetic as send", async () => {
  const res = await quoteRoute.POST(post({ pages: 6, colour: false }, "http://x/api/v1/quote"));
  const j = await res.json();
  const q = quote({ pages: 6, size: "standard", colour: false, duplex: true, channel: "api" });
  assert.equal(j.amount_cents, q.totalCents);
  assert.equal(j.stamps, 2);
  assert.equal((await quoteRoute.POST(post({ pages: 0 }, "http://x/q"))).status, 400);
});

// ── cron/bill: charge at $10 owed or a week old ─────────────────

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
const cronReq = (secret = process.env.CRON_SECRET!) => new Request("http://x/api/cron/bill", { method: "POST", headers: { "x-cron-key": secret } });

function usageRows(rows: { id: string; account_id: string; amount_cents: number; created_at: string }[]) {
  pg.setResponder((text) => {
    if (text.startsWith('SELECT "id", "account_id", "amount_cents", "created_at" FROM "sendletter_api_usage"')) return rows;
    if (text.includes('FROM "sendletter_accounts"')) return [{ stripe_customer_id: "cus_1" }];
    if (/^INSERT INTO "sendletter_billing_runs".*RETURNING/s.test(text)) return [{ id: "run-1" }];
    return [];
  });
}

test("bill: rejects a wrong or missing secret", async () => {
  usageRows([]);
  assert.equal((await bill.POST(cronReq("wrong-wrong-wrong-wrong"))).status, 401);
  assert.equal((await bill.POST(new Request("http://x/api/cron/bill", { method: "POST" }))).status, 401);
});

test("bill: a small, recent balance is deferred (no card fee for a few dollars)", async () => {
  usageRows([{ id: "u1", account_id: "a", amount_cents: 283, created_at: daysAgo(1) }, { id: "u2", account_id: "a", amount_cents: 283, created_at: daysAgo(0) }]);
  const j = await (await bill.POST(cronReq())).json();
  assert.equal(j.results[0].status, "deferred");
  assert.equal(stripeMock.intents.length, 0);
});

test("bill: $10 or more is charged, and exactly those usage rows are marked billed", async () => {
  usageRows([{ id: "u1", account_id: "a", amount_cents: 600, created_at: daysAgo(1) }, { id: "u2", account_id: "a", amount_cents: 500, created_at: daysAgo(0) }]);
  const j = await (await bill.POST(cronReq())).json();
  assert.equal(j.results[0].status, "succeeded");
  assert.equal(stripeMock.intents[0].amount, 1100);
  const upd = pg.queries.find((q) => q.text.startsWith('UPDATE "sendletter_api_usage"'))!;
  assert.deepEqual(upd.params[2], ["u1", "u2"]);
});

test("bill: a small balance is charged once its oldest letter is a week old", async () => {
  usageRows([{ id: "u1", account_id: "a", amount_cents: 283, created_at: daysAgo(8) }]);
  const j = await (await bill.POST(cronReq())).json();
  assert.equal(j.results[0].status, "succeeded");
  assert.equal(stripeMock.intents[0].amount, 283);
});

// ── db.ts: the new filters produce the SQL the purge needs ──────

test("db: lt() and notNull() build the right WHERE clause", async () => {
  await getDb().from("sendletter_orders").update({ letter_html: null }).lt("created_at", "2026-01-01T00:00:00Z").notNull("letter_html").select("id");
  const q = pg.queries.find((x) => x.text.startsWith("UPDATE"))!;
  assert.equal(q.text, 'UPDATE "sendletter_orders" SET "letter_html" = $1 WHERE "created_at" < $2 AND "letter_html" IS NOT NULL RETURNING "id"');
  assert.deepEqual(q.params, [null, "2026-01-01T00:00:00Z"]);
});

test("purge: rejects a wrong secret, and survives the files store being unreachable", async () => {
  assert.equal((await purge.POST(new Request("http://x", { method: "POST", headers: { "x-cron-key": "nope-nope-nope-nope-n" } }))).status, 401);
  const res = await purge.POST(new Request("http://x", { method: "POST", headers: { "x-cron-key": process.env.CRON_SECRET! } }));
  assert.equal(res.status, 500); // no CANNER_FILES_TOKEN here: reported, not a crash
});
