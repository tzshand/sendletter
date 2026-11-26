import type { Metadata } from "next";
import { SnowGoose } from "@/components/SnowGoose";
import { quote, formatCents, RATES, MAX_PAGES, MAX_FILE_BYTES, type LetterSize } from "@/lib/pricing";
import { VOLUME, volumeTable, API_FROM_ALL_IN_CENTS } from "@/lib/volume";
import { WEBHOOK_EVENTS, RETRY_DELAYS_MS, MAX_ATTEMPTS } from "@/lib/webhooks";
import { RATE_LIMIT } from "@/lib/rate-limit";
import { IDEMPOTENCY_TTL_DAYS } from "@/lib/idempotency";
import { MAX_BATCH } from "@/lib/letter-create";
import Link from "next/link";

// Every number below comes from the same rates the API charges.
const $ = (cents: number) => formatCents(cents);
const ex = (pages: number, size: LetterSize, colour: boolean) => quote({ pages, size, colour, duplex: true, channel: "api" });
const LOW = $(API_FROM_ALL_IN_CENTS);
/** Most pages one envelope carries (double-sided) before the letter is split across envelopes. */
function onePageLimit(size: LetterSize): number {
  let p = 1;
  while (p < MAX_PAGES && quote({ pages: p + 1, size, colour: true, duplex: true, channel: "api" }).mailings.length === 1) p++;
  return p;
}

export const metadata: Metadata = {
  title: "API Documentation — sendletter",
  description:
    "Send physical letters in Canada with one API call. Test keys, idempotency, delivery status, cancellation, webhooks and volume pricing from as low as $1.69 a letter.",
  alternates: { canonical: "https://sendletter.app/docs" },
};

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-gray-100 text-[13px] px-1.5 py-0.5 rounded font-mono">{children}</code>;
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-bold text-gray-900 mt-10 mb-3 scroll-mt-20">
      {children}
    </h2>
  );
}

function H3({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-sm font-bold text-gray-900 mt-6 mb-2 scroll-mt-20">
      {children}
    </h3>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="bg-gray-950 text-gray-200 text-[13px] rounded-lg p-4 overflow-x-auto leading-relaxed my-3">
      {children}
    </pre>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200">
            {headers.map((h) => (
              <th key={h} className="pb-2 pr-4 font-medium text-gray-500 text-xs">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-2 pr-4 ${j === 0 ? "font-mono text-[13px]" : "text-gray-600"}`}
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
          <SnowGoose size={24} />
          <span className="text-[14px] font-bold tracking-tight text-gray-900">sendletter</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/signup" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
            Create Account
          </Link>
          <Link href="/profile" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">API Reference</h1>
        <p className="text-sm text-gray-500 mb-8">
          Send physical letters anywhere in Canada programmatically. One endpoint, three modes. Letters from as low as{" "}
          <strong>{LOW}</strong> all in (postage included) with <Link href="/blog/api-volume-pricing" className="text-blue-600 hover:underline">automatic volume pricing</Link>, no monthly fee.
        </p>

        {/* TOC */}
        <nav className="bg-white rounded-xl border border-gray-200 p-4 mb-8 text-sm">
          <p className="font-semibold text-gray-900 mb-2">Contents</p>
          <ul className="space-y-1 text-gray-600">
            <li><a href="#quickstart" className="hover:text-gray-900">Quick Start</a></li>
            <li><a href="#auth" className="hover:text-gray-900">Authentication &amp; test keys</a></li>
            <li><a href="#endpoint" className="hover:text-gray-900">POST /api/v1/letters</a></li>
            <li><a href="#idempotency" className="hover:text-gray-900">Idempotency</a></li>
            <li><a href="#test-mode" className="hover:text-gray-900">Test mode</a></li>
            <li><a href="#letters" className="hover:text-gray-900">Status, history &amp; cancellation</a></li>
            <li><a href="#webhooks" className="hover:text-gray-900">Webhooks</a></li>
            <li><a href="#modes" className="hover:text-gray-900">Modes</a></li>
            <li><a href="#addresses" className="hover:text-gray-900">Addresses</a></li>
            <li><a href="#options" className="hover:text-gray-900">Options</a></li>
            <li><a href="#pricing" className="hover:text-gray-900">Pricing</a></li>
            <li><a href="#volume" className="hover:text-gray-900">Volume pricing</a></li>
            <li><a href="#quote" className="hover:text-gray-900">POST /api/v1/quote</a></li>
            <li><a href="#rate-limits" className="hover:text-gray-900">Rate limits &amp; bulk sending</a></li>
            <li><a href="#spend" className="hover:text-gray-900">Spending limits</a></li>
            <li><a href="#tooling" className="hover:text-gray-900">OpenAPI, Postman, MCP &amp; llms.txt</a></li>
            <li><a href="#errors" className="hover:text-gray-900">Error Codes</a></li>
            <li><a href="#billing" className="hover:text-gray-900">Billing</a></li>
            <li><a href="#limits" className="hover:text-gray-900">Rate Limits &amp; Constraints</a></li>
          </ul>
        </nav>

        <H2 id="quickstart">Quick Start</H2>
        <p className="text-sm text-gray-600 mb-3">
          Send a letter in one API call. Start with a <strong>test key</strong>: it checks your request and prices the letter
          but mails and bills nothing, and it needs no card.
        </p>
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1 mb-3">
          <li>Create an account at <Link href="/signup" className="text-blue-600 hover:underline">sendletter.app/signup</Link></li>
          <li>Create a test key on <Link href="/account/developers" className="text-blue-600 hover:underline">Developers</Link></li>
          <li>Send a POST request (below), then <Code>GET</Code> the letter and watch its status</li>
          <li>When it works, add a card and create a live key. Your first live letter is charged when you send it</li>
        </ol>
        <Pre>{`curl -X POST https://sendletter.app/api/v1/letters \\
  -H "Authorization: Bearer sl_test_YOUR_KEY" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "draft",
    "letter_size": "standard",
    "from": {
      "name": "Jane Smith",
      "line1": "123 Maple St",
      "city": "Toronto",
      "province": "ON",
      "postal_code": "M5V 2T6",
      "country": "CA"
    },
    "to": {
      "name": "John Doe",
      "line1": "456 Oak Ave",
      "city": "Vancouver",
      "province": "BC",
      "postal_code": "V6B 1A1",
      "country": "CA"
    },
    "letter": {
      "date": "2026-03-23",
      "salutation": "Dear John,",
      "body": "This is a test letter sent via the sendletter API.",
      "closing": "Sincerely,",
      "signature": "Jane Smith"
    }
  }'`}</Pre>

        <H2 id="auth">Authentication</H2>
        <p className="text-sm text-gray-600 mb-2">
          All requests require a Bearer token in the <Code>Authorization</Code> header.
        </p>
        <Pre>{`Authorization: Bearer sl_live_YOUR_API_KEY`}</Pre>
        <p className="text-sm text-gray-600 mt-2">
          Live keys start with <Code>sl_live_</Code> and mail and bill real letters. Test keys start with <Code>sl_test_</Code> and
          never print, mail or bill (see <a href="#test-mode" className="text-blue-600 hover:underline">Test mode</a>). You have at most one of each.
          Keep keys secret. If one is compromised, replace it on <Link href="/account/developers" className="text-blue-600 hover:underline">Developers</Link>; the old key stops working immediately.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          A live key needs a valid payment method on file; without one requests return <Code>402</Code>. Test keys need no card.
          Every authenticated <Code>/api/v1</Code> endpoint is limited to {RATE_LIMIT.perMinute} requests a minute per key (<Code>/api/v1/quote</Code> without a key and <Code>/api/v1/pricing</Code> are public and not limited this way). To send many letters, use the{" "}
          <a href="#rate-limits" className="text-blue-600 hover:underline">batch endpoint</a>: a batch of up to {MAX_BATCH} letters counts as one request.
        </p>

        <H2 id="endpoint">POST /api/v1/letters</H2>
        <p className="text-sm text-gray-600 mb-2">
          Creates a letter. It is queued for printing and mailed within 1 business day via Canada Post. <Code>POST /api/v1/send</Code> is the
          same endpoint under its original name and keeps working. Send an <Code>Idempotency-Key</Code> header so a retry cannot mail a second letter.
        </p>

        <H3>Request Body</H3>
        <Table
          headers={["Field", "Type", "Required", "Description"]}
          rows={[
            ["mode", "string", "Yes", '<code>"draft"</code>, <code>"formatted"</code>, or <code>"upload"</code>'],
            ["letter_size", "string", "No", '<code>"standard"</code> (default), <code>"large"</code>, or <code>"legal"</code>: see <a href="#options" class="text-blue-600">Options</a>'],
            ["colour", "boolean", "No", `Print in colour (<code>true</code>, ${$(RATES.pageCents.colour)}/page) or black and white (default <code>false</code>, ${$(RATES.pageCents.bw)}/page). <code>color</code> is accepted too.`],
            ["duplex", "boolean", "No", "Print double-sided (default <code>true</code>). Same price per page; uses fewer sheets and can lower postage."],
            ["from", "object", "Yes", "Return address (see <a href='#addresses' class='text-blue-600'>Addresses</a>)"],
            ["to", "object", "Yes", "Delivery address — must be in Canada"],
            ["letter", "object", "Draft only", "Letter content fields (see Draft mode)"],
            ["html", "string", "Formatted only", "HTML content for the letter body"],
            ["css", "string", "No", "Additional CSS (formatted mode only)"],
            ["file", "string", "Upload only", "Base64-encoded PDF or DOCX"],
            ["file_type", "string", "Upload only", '<code>"pdf"</code> or <code>"docx"</code>'],
            ["page_count", "number", "docx, formatted", `Number of pages, 1&ndash;${MAX_PAGES}. <strong>Required for <code>docx</code> uploads</strong> (we can't paginate them). For PDFs and drafts we count the pages ourselves and ignore it. For <code>formatted</code> HTML, send it: otherwise we estimate.`],
            ["font", "string", "No", "Font family (see <a href='#options' class='text-blue-600'>Options</a>)"],
            ["font_size", "number", "No", "Font size in pt (8–24, default 12)"],
            ["vertical_center", "boolean", "No", "Vertically center content on page"],
            ["reference", "string", "No", "Your own reference, up to 200 characters. Shown on invoices and in order history, and returned on every read and webhook."],
            ["metadata", "object", "No", "Up to 20 string key/value pairs (keys 40 characters, values 500), returned on every read and webhook."],
          ]}
        />

        <H3>Response</H3>
        <p className="text-sm text-gray-600 mb-2">
          The letter object, the same one every other endpoint and webhook returns. <Code>warnings</Code> appears only when something looks wrong but
          we did not refuse it, for example a postal code that belongs to another province.
        </p>
        <Pre>{`{
  "id": "uuid-of-letter",
  "object": "letter",
  "livemode": true,
  "status": "queued",
  "created_at": "2026-12-01T14:03:11.000Z",
  "printed_at": null,
  "mailed_at": null,
  "cancelled_at": null,
  "letter_size": "standard",
  "pages": 1,
  "mailings": 1,
  "stamps": 1,
  "colour": false,
  "duplex": true,
  "currency": "cad",
  "amount_cents": ${ex(1, "standard", false).totalCents},
  "price": {
    "version": "${ex(1, "standard", false).version}",
    "lines": [
${ex(1, "standard", false).lines.map((l) => `      { "item": "${l.key}", "qty": ${l.qty}, "unit_cents": ${l.unitCents}, "total_cents": ${l.totalCents} }`).join(",\n")}
    ]
  },
  "to": { "name": "John Doe", "line1": "456 Oak Ave", "city": "Vancouver", "province": "BC", "postal_code": "V6B 1A1", "country": "CA", "line2": null },
  "from": { "name": "Jane Smith", "line1": "123 Maple St", "city": "Toronto", "province": "ON", "postal_code": "M5V 2T6", "country": "CA", "line2": null },
  "reference": "INV-1042",
  "metadata": {}
}`}</Pre>

        <H2 id="idempotency">Idempotency</H2>
        <p className="text-sm text-gray-600 mb-2">
          A letter is physical: a retry that is not recognised as a retry mails a second one, and a second one cannot be recalled. Send an{" "}
          <Code>Idempotency-Key</Code> header (1 to 255 printable characters, no spaces; a UUID is ideal) with every <Code>POST</Code>:
        </p>
        <Table
          headers={["Situation", "Result"]}
          rows={[
            ["Same key, same request, already finished", `The original response again, with <code>Idempotent-Replayed: true</code>. No second letter, no second charge.`],
            ["Same key, same request, still running", "<code>409 request_in_progress</code>. Retry shortly with the same key."],
            ["Same key, different request", "<code>422 idempotency_key_reuse</code>. A key means one request."],
            ["The first attempt failed validation or payment", "The key is released: fix the request and retry with the same key."],
          ]}
        />
        <p className="text-sm text-gray-600 mt-2">
          Keys are remembered for {IDEMPOTENCY_TTL_DAYS} days and are separate for test and live keys. JSON key order does not matter. Network
          errors, timeouts and <Code>5xx</Code> responses are safe to retry with the same key; use backoff and honour <Code>Retry-After</Code>.
        </p>

        <H2 id="test-mode">Test mode</H2>
        <p className="text-sm text-gray-600 mb-2">
          A test key (<Code>sl_test_</Code>) runs the whole path: validation, page counting, pricing (including your volume discount), the response,
          status, cancellation and webhooks. It never prints, mails or bills, writes no invoice, and needs no card. Test letters
          are only visible to test keys, and live letters only to live keys.
        </p>
        <p className="text-sm text-gray-600 mb-2">
          Test letters move through their statuses on their own so you can build against them: <Code>queued</Code>, then <Code>printed</Code> after
          30 seconds, then <Code>mailed</Code> after 2 minutes. A test letter fires <Code>letter.created</Code> when you send it, <Code>letter.printed</Code> and <Code>letter.mailed</Code> as it reaches those steps (when you next <Code>GET</Code> it, or within about five minutes, whichever is first), and <Code>letter.cancelled</Code> if you cancel it. Use <Code>POST /api/v1/webhooks/&#123;id&#125;/test</Code> to send a signed <Code>webhook.test</Code> event to an endpoint on demand.
        </p>
        <p className="text-sm text-gray-600">
          What test mode does not check: whether the street address exists. It does flag a postal code that belongs to another province.
        </p>

        <H2 id="letters">Status, history &amp; cancellation</H2>
        <Table
          headers={["Request", "What it does"]}
          rows={[
            ["GET /api/v1/letters/{id}", "The letter, with its current status and price."],
            ["GET /api/v1/letters", "Your letters, newest first. <code>?limit=</code> (1&ndash;100, default 20) and <code>?starting_after=&lt;id&gt;</code>. Returns <code>{object: &quot;list&quot;, data, has_more}</code>."],
            ["POST /api/v1/letters/batch", `Send up to ${MAX_BATCH} letters in one request, counted as <strong>one</strong> request against your rate limit. See <a href="#rate-limits" class="text-blue-600">Rate limits &amp; bulk sending</a>.`],
            ["DELETE /api/v1/letters/{id}", "Cancel a letter that is still <code>queued</code>. Its billing is voided, or refunded if already paid. A printed letter cannot be recalled (<code>409 not_cancellable</code>)."],
          ]}
        />
        <Table
          headers={["Status", "Meaning"]}
          rows={[
            ["queued", "Accepted and waiting to be printed. Can still be cancelled."],
            ["printed", "Printed and being stamped. Can no longer be cancelled."],
            ["mailed", "Handed to Canada Post. <code>mailed_at</code> is set."],
            ["cancelled", "Cancelled before printing."],
          ]}
        />
        <p className="text-sm text-gray-600 mt-2">
          Ordinary Lettermail has no delivery tracking: <Code>mailed</Code> is the last status we can know. You can see and export every letter, and
          your invoices, on <Link href="/account/orders" className="text-blue-600 hover:underline">Orders</Link> and{" "}
          <Link href="/account/invoices" className="text-blue-600 hover:underline">Invoices</Link>.
        </p>

        <H2 id="webhooks">Webhooks</H2>
        <p className="text-sm text-gray-600 mb-2">
          Create endpoints on <Link href="/account/developers" className="text-blue-600 hover:underline">Developers</Link> or with{" "}
          <Code>POST /api/v1/webhooks</Code> (<Code>{`{ "url": "https://...", "events": ["letter.mailed"] }`}</Code>; omit <Code>events</Code> for all). The signing secret is
          returned once. Events: {WEBHOOK_EVENTS.map((e) => e).join(", ")}. A test key creates an endpoint that receives test letters.
        </p>
        <Pre>{`POST https://your-server.example/webhooks/sendletter
Sendletter-Event: letter.mailed
Sendletter-Signature: t=1764600000,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
Content-Type: application/json

{ "id": "evt-uuid", "object": "event", "type": "letter.mailed", "livemode": true,
  "created": 1764600000, "data": { "object": { ...the letter... } } }`}</Pre>
        <p className="text-sm text-gray-600 mt-2">
          <strong>Verify the signature.</strong> Compute <Code>HMAC-SHA256(secret, timestamp + &quot;.&quot; + raw_body)</Code> as hex and compare it, in constant
          time, with <Code>v1</Code>. Reject timestamps more than 5 minutes old.
        </p>
        <Pre>{`import { createHmac, timingSafeEqual } from "node:crypto";

function verify(secret, header, rawBody) {
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const want = createHmac("sha256", secret).update(t + "." + rawBody).digest("hex");
  return want.length === v1.length && timingSafeEqual(Buffer.from(want), Buffer.from(v1));
}`}</Pre>
        <p className="text-sm text-gray-600 mt-2">
          Answer with any <Code>2xx</Code> within 10 seconds. Anything else is retried after {RETRY_DELAYS_MS.map((m) => (m < 3600000 ? `${m / 60000} min` : `${m / 3600000} h`)).join(", ")}
          ({MAX_ATTEMPTS} attempts in all). Endpoints must be <Code>https</Code> on a public address; redirects are not followed. Events can arrive more than once, and out of order, so use the
          letter&apos;s <Code>id</Code> and <Code>status</Code> rather than assuming sequence.
        </p>

        <H2 id="modes">Modes</H2>

        <H3 id="mode-draft">Draft Mode</H3>
        <p className="text-sm text-gray-600 mb-2">
          Provide structured letter fields. We render them into a properly formatted letter page.
        </p>
        <Table
          headers={["letter.*", "Type", "Required", "Description"]}
          rows={[
            ["body", "string", "Yes", "Main letter text (max 50,000 chars). Whitespace is preserved."],
            ["date", "string", "No", "Date line (top-right)"],
            ["salutation", "string", "No", 'Greeting, e.g. "Dear John,"'],
            ["subject", "string", "No", "Subject line (rendered as bold Re: ...)"],
            ["reference", "string", "No", "Reference number"],
            ["closing", "string", "No", 'Sign-off, e.g. "Sincerely,"'],
            ["signature", "string", "No", "Printed name below closing"],
            ["cc", "string", "No", "CC line"],
            ["enclosures", "string", "No", "Enclosures note"],
            ["ps", "string", "No", "Post-script (italic)"],
          ]}
        />

        <H3 id="mode-formatted">Formatted Mode</H3>
        <p className="text-sm text-gray-600 mb-2">
          Send your own HTML content. We wrap it in a print-safe page template with proper dimensions
          (8.5&times;11&quot; or 8.5&times;14&quot; at 72dpi, 1&quot; margins). Max 500 KB.
        </p>
        <Pre>{`{
  "mode": "formatted",
  "html": "<h1>Hello World</h1><p>Custom HTML letter content.</p>",
  "css": "h1 { color: navy; }",
  "font": "Georgia",
  "font_size": 14
}`}</Pre>

        <H3 id="mode-upload">Upload Mode</H3>
        <p className="text-sm text-gray-600 mb-2">
          Upload a pre-formatted PDF or DOCX file as a base64 string. Max {MAX_FILE_BYTES / 1024 / 1024} MB, max {MAX_PAGES} pages.
          A PDF is printed as sent and its page count is measured on our side. For a DOCX, send <Code>page_count</Code>.
        </p>
        <Pre>{`{
  "mode": "upload",
  "file": "JVBERi0xLjQK...",
  "file_type": "pdf",
  "page_count": 2
}`}</Pre>

        <H2 id="addresses">Addresses</H2>
        <Table
          headers={["Field", "Type", "Required", "Description"]}
          rows={[
            ["name", "string", "Yes", "Full name (max 200 chars)"],
            ["line1", "string", "Yes", "Street address (max 200 chars)"],
            ["line2", "string", "No", "Apt, suite, unit (max 200 chars)"],
            ["city", "string", "Yes", "City (max 200 chars)"],
            ["province", "string", "CA/US", "Province or state code (required for CA and US)"],
            ["postal_code", "string", "CA/US", "Postal or ZIP code (required for CA and US)"],
            ["country", "string", "No", '2-letter ISO code. Defaults to <code>"CA"</code>'],
          ]}
        />
        <p className="text-sm text-gray-600 mt-3">
          A return address that doesn&apos;t fit these fields can be sent as a few free-form lines instead:{" "}
          <Code>{`"from": { "lines": ["Ana García", "Calle 17 #4-77", "Bogotá D.C.", "Colombia"] }`}</Code> (up to 6 lines).
          Undeliverable mail can only be returned to an address in Canada.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mt-3">
          <strong>Important:</strong> The <Code>to</Code> address must be in Canada (<Code>&quot;country&quot;: &quot;CA&quot;</Code>).
          The <Code>from</Code> (return) address can be in any country. The <Code>to</Code> postal code must be a <strong>full</strong> Canadian code
          (<Code>K1A 0B1</Code>, with or without the space): Canada Post charges an item with a missing or incorrect postal code at higher rates, so a partial code would leave the letter short on postage.
          A return address may be looser. A postal code whose first letter does not match the province
          (for example <Code>V6B</Code> with <Code>ON</Code>) is accepted but returned as a <Code>warnings</Code> entry: this is a typo check, not address verification.
        </div>

        <H2 id="options">Options</H2>

        <H3>Letter Sizes &amp; Envelopes</H3>
        <Table
          headers={["Value", "Paper", "Envelope", "One envelope carries", "Address"]}
          rows={[
            ["standard", "8.5 × 11 in, folded", "#10 window", `up to ${onePageLimit("standard")} pages double-sided`, "Printed address page, shown through the window"],
            ["large", "8.5 × 11 in, flat", "9 × 12 mailer", `up to ${onePageLimit("large")} pages`, "Hand-addressed"],
            ["legal", "8.5 × 14 in, flat", "10 × 15 mailer", `up to ${onePageLimit("legal")} pages`, "Hand-addressed"],
          ]}
        />
        <p className="text-sm text-gray-600 mt-2">
          A letter too long for its envelope is split across as few envelopes as needed (a flat mailer takes far more
          than a #10, so it is usually cheaper to choose one). Each envelope is a mailing with its own fee, envelope and
          stamps, and the response reports <Code>mailings</Code>.
        </p>

        <H3>Fonts</H3>
        <p className="text-sm text-gray-600 mb-2">
          Available for <Code>draft</Code> and <Code>formatted</Code> modes:
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
          <li>Times New Roman (default)</li>
          <li>Georgia</li>
          <li>Arial</li>
          <li>Helvetica</li>
          <li>Courier New</li>
          <li>Verdana</li>
        </ul>

        <H2 id="pricing">Pricing</H2>
        <p className="text-sm text-gray-600 mb-2">
          All prices are in Canadian dollars (CAD), with no GST/HST charged on top. You pay for what a letter takes:
        </p>
        <Pre>{`total = (mailing fee + envelope) x mailings + pages x page rate + stamps x ${$(RATES.stampCents)}`}</Pre>
        <Table
          headers={["Item", "Price"]}
          rows={[
            ["Mailing fee (API), per mailing, list price", `${$(RATES.baseCents.api)} (falls to ${$(VOLUME.floorCents)} with volume, see below)`],
            ["Printing, black and white, per page", $(RATES.pageCents.bw)],
            ["Printing, colour, per page", $(RATES.pageCents.colour)],
            ["Envelope: #10 window / 9×12 mailer / 10×15 mailer", `${$(RATES.envelopeCents.standard)} / ${$(RATES.envelopeCents.large)} / ${$(RATES.envelopeCents.legal)}`],
            ["Canada Post postage, per stamp (passed through at cost)", $(RATES.stampCents)],
          ]}
        />
        <p className="text-sm text-gray-600 mt-2">
          Pages are billed per printed page, whether or not you print double-sided. The address page of a window
          envelope is free. Postage is charged at cost: how many stamps a mailing needs depends on its weight and
          envelope under Canada Post&apos;s Lettermail rates (one stamp covers a #10 up to 5 double-sided pages; flat
          mailers are oversize and start at {ex(1, "large", false).stamps} stamps).
        </p>
        <Table
          headers={["Example", "Stamps", "Total"]}
          rows={[
            ["1 page, colour, #10", String(ex(1, "standard", true).stamps), $(ex(1, "standard", true).totalCents)],
            ["1 page, black and white, #10", String(ex(1, "standard", false).stamps), $(ex(1, "standard", false).totalCents)],
            ["6 pages, black and white, #10", String(ex(6, "standard", false).stamps), $(ex(6, "standard", false).totalCents)],
            ["30 pages, black and white, 9×12 flat", String(ex(30, "large", false).stamps), $(ex(30, "large", false).totalCents)],
          ]}
        />

        <H2 id="volume">Volume pricing</H2>
        <p className="text-sm text-gray-600 mb-2">
          The more you mail, the less you pay, automatically. Only the mailing fee is discounted: postage stays at cost. It falls from {$(VOLUME.listCents)} on
          your first letter to {$(VOLUME.floorCents)} on your {VOLUME.fullDiscountAt}th mailing in any {VOLUME.windowDays} days, and stays there while you keep sending.
          The count is a rolling {VOLUME.windowDays} days, not a calendar month, so a steady sender stays at the lowest fee. Cancelled letters do not count.
          At the floor, a one-page black-and-white letter is <strong>{LOW}</strong> all in.
        </p>
        <Table
          headers={["Your mailing number (in 30 days)", "Mailing fee", "Discount", "1 page, B&W, #10, all in"]}
          rows={volumeTable().map((t) => [
            String(t.mailing_number),
            $(t.base_fee_cents),
            `${t.discount_pct}%`,
            $(quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: t.mailing_number - 1 }).totalCents),
          ])}
        />
        <p className="text-sm text-gray-600 mt-2">
          Every response shows how the fee was set (<Code>price.volume</Code>). <Code>GET /api/v1/pricing</Code> returns this table and, with{" "}
          <Code>?letters_per_month=250&amp;pages=1</Code>, a worked estimate. There is a calculator on the{" "}
          <Link href="/blog/api-volume-pricing" className="text-blue-600 hover:underline">volume pricing page</Link>.
        </p>

        <H2 id="quote">POST /api/v1/quote</H2>
        <p className="text-sm text-gray-600 mb-2">
          Price a letter without sending it. No API key needed (add one and the quote uses your real 30-day volume; without one, add{" "}
          <Code>letters_in_last_30_days</Code> to see a discounted price). Send <Code>pages</Code> (1&ndash;{MAX_PAGES}) and optionally{" "}
          <Code>letter_size</Code>, <Code>colour</Code> and <Code>duplex</Code>; you get the same price breakdown that
          <Code>/api/v1/send</Code> returns.
        </p>
        <Pre>{`curl -X POST https://sendletter.app/api/v1/quote \\
  -H "Content-Type: application/json" \\
  -d '{ "pages": 6, "letter_size": "standard", "colour": false }'`}</Pre>

        <H2 id="errors">Error Codes</H2>
        <Table
          headers={["Status", "code", "Meaning"]}
          rows={[
            ["400", "invalid_request, invalid_address, unsupported_destination, invalid_body, invalid_cursor, invalid_volume, pricing_error, idempotency_key_required, invalid_batch, batch_too_large, invalid_json, invalid_letter_size, invalid_options, invalid_pages, invalid_reference, invalid_metadata, invalid_idempotency_key, invalid_webhook", "The request is wrong: missing or invalid fields, a non-Canadian delivery address, invalid postal code, content too large."],
            ["401", "invalid_api_key", "Missing or invalid API key."],
            ["402", "payment_method_required, payment_failed", "A live key with no card on file; or your first letter&apos;s up-front charge was declined (nothing was sent)."],
            ["404", "letter_not_found, webhook_not_found", "No such letter or endpoint for this key (test and live letters are separate)."],
            ["409", "request_in_progress, not_cancellable", "An identical request is still running; or the letter is already printed."],
            ["422", "idempotency_key_reuse", "That Idempotency-Key was used with a different request."],
            ["429", "rate_limited, daily_limit_exceeded", "Too many requests (see <code>Retry-After</code>); or this letter would take today&apos;s spending over your daily limit."],
            ["500", "internal_error, billing_record_failed", "Our fault. Nothing was sent or charged when it is <code>billing_record_failed</code>. Safe to retry with the same Idempotency-Key. <a href='mailto:support@sendletter.app' class='text-blue-600'>support@sendletter.app</a>"],
            ["503", "service_unavailable", "Temporarily unavailable. Retry after <code>Retry-After</code> with the same Idempotency-Key."],
          ]}
        />
        <p className="text-sm text-gray-600 mt-2">
          Every error has a human-readable <Code>error</Code> and a stable <Code>code</Code> to branch on:
        </p>
        <Pre>{`{ "error": "to.postal_code is not a valid Canadian postal code. Expected format: A1A 1A1", "code": "invalid_address" }`}</Pre>

        <H2 id="rate-limits">Rate limits &amp; bulk sending</H2>
        <p className="text-sm text-gray-600 mb-2">
          Each key may make {RATE_LIMIT.perMinute} requests a minute (a sliding one-minute window; test and live keys have separate allowances). Every response says where you stand,
          and a request over the limit is refused, not queued:
        </p>
        <Table
          headers={["Header", "Meaning"]}
          rows={[
            ["X-RateLimit-Limit", `Requests allowed per minute for this key (${RATE_LIMIT.perMinute}).`],
            ["X-RateLimit-Remaining", "Requests left in the current window."],
            ["Retry-After", "On a <code>429 rate_limited</code>: the number of seconds to wait before trying again."],
          ]}
        />
        <H3>Sending in bulk: use the batch endpoint</H3>
        <p className="text-sm text-gray-600 mb-2">
          <Code>POST /api/v1/letters/batch</Code> takes up to {MAX_BATCH} letters in one request and counts as <strong>one</strong> request, so you can send thousands of
          letters without coming near the limit: 5,000 letters is 50 requests. Each letter is created exactly as it would be by{" "}
          <Code>POST /api/v1/letters</Code> (same validation, volume pricing, daily limit and webhooks), one after another, so letter 40 is priced after letters 1 to 39.
        </p>
        <Pre>{`curl -X POST https://sendletter.app/api/v1/letters/batch \\
  -H "Authorization: Bearer sl_live_YOUR_KEY" \\
  -H "Idempotency-Key: statements-2026-12-batch-0007" \\
  -H "Content-Type: application/json" \\
  -d '{ "letters": [
    { "mode": "draft", "reference": "stmt-1001", "from": { ... }, "to": { ... }, "letter": { "body": "..." } },
    { "mode": "draft", "reference": "stmt-1002", "from": { ... }, "to": { ... }, "letter": { "body": "..." } }
  ] }'`}</Pre>
        <p className="text-sm text-gray-600 mt-2">
          An <Code>Idempotency-Key</Code> (1 to 240 characters on a batch) is <strong>required</strong>. Letter <Code>i</Code> is created under the key <Code>&quot;&lt;key&gt;:&lt;i&gt;&quot;</Code>, so if a request times out or your
          process crashes you simply send the <em>same batch with the same key</em>: letters already created come back as <Code>replayed</Code> (no second letter, no second charge) and
          only the missing ones are created. The response is <Code>200</Code> with a result for every letter, in order:
        </p>
        <Pre>{`{
  "object": "batch", "total": 3, "created": 1, "replayed": 0, "failed": 2, "not_processed": 0,
  "results": [
    { "index": 0, "status": "created",  "letter": { "id": "...", "status": "queued", ... } },
    { "index": 1, "status": "error", "http_status": 400, "code": "invalid_address", "error": "to.postal_code is not a valid Canadian postal code..." },
    { "index": 2, "status": "error", "http_status": 429, "code": "daily_limit_exceeded", "error": "..." }
  ]
}`}</Pre>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-2">
          <li>A letter that fails does not stop the others. Fix it and re-send the batch with the same key to create just that one.</li>
          <li>Once your daily spending limit is reached, the rest of the batch is refused at once with <Code>daily_limit_exceeded</Code>.</li>
          <li>If a batch runs long (about 45 seconds) the remaining letters come back as <Code>not_processed</Code>. Re-send the same batch to create them.</li>
          <li>Only whole-request problems return a non-200 status: a bad key (<Code>401</Code>), no card on a live key (<Code>402</Code>), bad JSON, no Idempotency-Key or more than {MAX_BATCH} letters (<Code>400</Code>), the rate limit (<Code>429</Code>), or our database being unreachable (<Code>503</Code>).</li>
        </ul>
        <H3>Staying under the limit</H3>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
          <li><strong>Batch.</strong> One request for up to {MAX_BATCH} letters is the single biggest saving. Send batches one after another, not in parallel, so volume pricing and the daily limit are applied in order.</li>
          <li><strong>Use webhooks, not polling.</strong> Every status check is a request. Subscribe to <Code>letter.mailed</Code> instead of calling <Code>GET</Code> in a loop.</li>
          <li><strong>Honour <Code>Retry-After</Code>.</strong> On a <Code>429 rate_limited</Code>, wait that many seconds. If it is absent (a <Code>503</Code>, a network error), back off exponentially with jitter: 1 s, 2 s, 4 s, 8 s, up to about a minute.</li>
          <li><strong>Reuse the same Idempotency-Key on every retry</strong> of the same request. Retrying with a new key is how a duplicate letter is made.</li>
          <li><strong>Do not retry a <Code>429 daily_limit_exceeded</Code></strong> until tomorrow (Toronto time) or until you raise your limit on Developers; it will keep failing.</li>
          <li><strong>Need more than {RATE_LIMIT.perMinute} requests a minute?</strong> Batching almost always removes the need. If it does not, email <a href="mailto:support@sendletter.app" className="text-blue-600 hover:underline">support@sendletter.app</a> with what you are doing.</li>
        </ul>
        <Pre>{`// Node: send a long list in batches, retrying politely.
import { randomUUID } from "node:crypto";

async function sendAll(letters, runId = randomUUID()) {
  for (let i = 0; i < letters.length; i += ${MAX_BATCH}) {
    const chunk = letters.slice(i, i + ${MAX_BATCH});
    const key = runId + "-" + i;                       // the same key on every retry of this chunk
    for (let attempt = 0; ; attempt++) {
      const res = await fetch("https://sendletter.app/api/v1/letters/batch", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.SENDLETTER_KEY, "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ letters: chunk }),
      });
      if (res.ok) {
        const out = await res.json();
        if (out.not_processed === 0) break;           // done; inspect out.results for errors
        continue;                                      // ran out of time: send the same chunk again
      }
      if (res.status === 429 || res.status >= 500) {
        const wait = Number(res.headers.get("retry-after")) || Math.min(60, 2 ** attempt) + Math.random();
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      throw new Error("batch failed: " + (await res.text()));   // 4xx: fix the request, do not retry blindly
    }
  }
}`}</Pre>

        <H2 id="spend">Spending limits</H2>
        <p className="text-sm text-gray-600 mb-2">
          Every account starts with a limit of <strong>$500 a day</strong> (Toronto time) across its live keys, so a bug in your code cannot run up a
          bill. You can set your own limit anywhere up to your approved maximum on <Link href="/account/developers" className="text-blue-600 hover:underline">Developers</Link>.
          A letter that would take the day&apos;s spending over the limit is refused with <Code>429 daily_limit_exceeded</Code> and nothing is created. To go above $500 a day,
          use <em>Request a higher maximum</em> on the same page and tell us what you are sending; we reply by email.
        </p>

        <H2 id="billing">Billing</H2>
        <p className="text-sm text-gray-600 mb-2">
          No subscription and no minimum. <strong>Your first live letter is charged when you send it</strong>, before it is accepted, so a card that will not pay is
          found out on letter one (if it is declined, nothing is sent and you get <Code>402 payment_failed</Code>). After that, usage is invoiced{" "}
          <strong>once a month</strong>, on the 1st, for the month just ended, as one charge to your saved card. Every invoice lists its letters and is on{" "}
          <Link href="/account/invoices" className="text-blue-600 hover:underline">Invoices</Link>, printable and exportable as CSV. Cancelling a queued letter removes it from billing,
          or refunds it if it was already charged. No GST/HST is charged.
        </p>

        <H2 id="tooling">OpenAPI, Postman, MCP &amp; llms.txt</H2>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
          <li><a href="/openapi.json" className="text-blue-600 hover:underline">/openapi.json</a>: the OpenAPI 3.1 description of every endpoint, for code generators and API clients.</li>
          <li><a href="/postman.json" className="text-blue-600 hover:underline">/postman.json</a>: a Postman collection with a test-key environment.</li>
          <li><a href="/llms.txt" className="text-blue-600 hover:underline">/llms.txt</a>: a plain-text summary for AI assistants.</li>
          <li><strong>MCP server</strong> so an AI agent can quote, send, check and cancel letters: <Code>node mcp/sendletter-mcp.mjs</Code> with <Code>SENDLETTER_API_KEY</Code> set (defaults to your test key; see <Link href="/docs/changelog#mcp" className="text-blue-600 hover:underline">changelog</Link>).</li>
          <li><Link href="/docs/changelog" className="text-blue-600 hover:underline">Changelog</Link>. Questions: <a href="mailto:support@sendletter.app" className="text-blue-600 hover:underline">support@sendletter.app</a>, answered by the people who run it.</li>
        </ul>

        <H2 id="limits">Rate Limits &amp; Constraints</H2>
        <Table
          headers={["Constraint", "Limit"]}
          rows={[
            ["Request body", "JSON, Content-Type: application/json"],
            ["File upload (base64)", `${MAX_FILE_BYTES / 1024 / 1024} MB`],
            ["HTML content", "500 KB"],
            ["Draft body text", "50,000 characters"],
            ["Page count", `1–${MAX_PAGES}`],
            ["Font size", "8–24 pt"],
            ["Address fields", "200 characters each"],
            ["Delivery country", "Canada only (to.country = \"CA\")"],
            ["Requests per key", `${RATE_LIMIT.perMinute} a minute; a batch of up to ${MAX_BATCH} letters counts as one`],
            ["Letters per batch", String(MAX_BATCH)],
            ["Daily spending", "$500 a day to start; set your own limit, or request a higher maximum"],
            ["Idempotency keys", `1&ndash;255 characters, remembered ${IDEMPOTENCY_TTL_DAYS} days`],
            ["Webhook endpoints", "10 per account, https only"],
          ]}
        />

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Questions? <a href="mailto:support@sendletter.app" className="hover:text-gray-600">support@sendletter.app</a>
          </p>
        </div>
      </div>
    </div>
  );
}
