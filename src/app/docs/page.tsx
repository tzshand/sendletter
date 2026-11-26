import type { Metadata } from "next";
import { SnowGoose } from "@/components/SnowGoose";
import { quote, formatCents, RATES, MAX_PAGES, MAX_FILE_BYTES, type LetterSize } from "@/lib/pricing";
import Link from "next/link";

// Every number below comes from the same rates the API charges.
const $ = (cents: number) => formatCents(cents);
const ex = (pages: number, size: LetterSize, colour: boolean) => quote({ pages, size, colour, duplex: true, channel: "api" });
/** Most pages one envelope carries (double-sided) before the letter is split across envelopes. */
function onePageLimit(size: LetterSize): number {
  let p = 1;
  while (p < MAX_PAGES && quote({ pages: p + 1, size, colour: true, duplex: true, channel: "api" }).mailings.length === 1) p++;
  return p;
}

export const metadata: Metadata = {
  title: "API Documentation — sendletter",
  description:
    "Send physical letters programmatically via the sendletter API. Full reference for authentication, endpoints, modes, and error codes.",
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
          Send physical letters anywhere in Canada programmatically. One endpoint, three modes.
        </p>

        {/* TOC */}
        <nav className="bg-white rounded-xl border border-gray-200 p-4 mb-8 text-sm">
          <p className="font-semibold text-gray-900 mb-2">Contents</p>
          <ul className="space-y-1 text-gray-600">
            <li><a href="#quickstart" className="hover:text-gray-900">Quick Start</a></li>
            <li><a href="#auth" className="hover:text-gray-900">Authentication</a></li>
            <li><a href="#endpoint" className="hover:text-gray-900">POST /api/v1/send</a></li>
            <li><a href="#modes" className="hover:text-gray-900">Modes</a></li>
            <li><a href="#addresses" className="hover:text-gray-900">Addresses</a></li>
            <li><a href="#options" className="hover:text-gray-900">Options</a></li>
            <li><a href="#pricing" className="hover:text-gray-900">Pricing</a></li>
            <li><a href="#quote" className="hover:text-gray-900">POST /api/v1/quote</a></li>
            <li><a href="#errors" className="hover:text-gray-900">Error Codes</a></li>
            <li><a href="#billing" className="hover:text-gray-900">Billing</a></li>
            <li><a href="#limits" className="hover:text-gray-900">Rate Limits &amp; Constraints</a></li>
          </ul>
        </nav>

        <H2 id="quickstart">Quick Start</H2>
        <p className="text-sm text-gray-600 mb-3">
          Send a letter in one API call. You need an account with a payment method and an API key.
        </p>
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1 mb-3">
          <li>Create an account at <Link href="/signup" className="text-blue-600 hover:underline">sendletter.app/signup</Link></li>
          <li>Add a payment method on your <Link href="/profile" className="text-blue-600 hover:underline">profile</Link></li>
          <li>Generate an API key on your profile</li>
          <li>Send a POST request:</li>
        </ol>
        <Pre>{`curl -X POST https://sendletter.app/api/v1/send \\
  -H "Authorization: Bearer sl_live_YOUR_KEY" \\
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
          API keys start with <Code>sl_live_</Code>. Keep your key secret. If compromised, regenerate it from your profile — this
          immediately invalidates the old key.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Your account must have a valid payment method on file. Requests without one return <Code>402</Code>.
        </p>

        <H2 id="endpoint">POST /api/v1/send</H2>
        <p className="text-sm text-gray-600 mb-2">
          Creates a letter order. The letter is queued for printing and mailed within 1 business day via Canada Post.
        </p>

        <H3>Request Body</H3>
        <Table
          headers={["Field", "Type", "Required", "Description"]}
          rows={[
            ["mode", "string", "Yes", '<code>"draft"</code>, <code>"formatted"</code>, or <code>"upload"</code>'],
            ["letter_size", "string", "No", '<code>"standard"</code> (default), <code>"large"</code>, or <code>"legal"</code>: see <a href="#options" class="text-blue-600">Options</a>'],
            ["colour", "boolean", "No", `Print in colour (default <code>true</code>, ${$(RATES.pageCents.colour)}/page) or black and white (<code>false</code>, ${$(RATES.pageCents.bw)}/page). <code>color</code> is accepted too.`],
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
          ]}
        />

        <H3>Response</H3>
        <Pre>{`{
  "id": "uuid-of-order",
  "status": "queued",
  "letter_size": "standard",
  "pages": 1,
  "mailings": 1,
  "stamps": 1,
  "colour": true,
  "duplex": true,
  "amount_cents": ${ex(1, "standard", true).totalCents},
  "price": {
    "version": "${ex(1, "standard", true).version}",
    "lines": [
${ex(1, "standard", true).lines.map((l) => `      { "item": "${l.key}", "qty": ${l.qty}, "unit_cents": ${l.unitCents}, "total_cents": ${l.totalCents} }`).join(",\n")}
    ]
  }
}`}</Pre>

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
          The <Code>from</Code> (return) address can be in any country. Canadian postal codes must match at least the
          FSA format (e.g. <Code>K1A</Code>) or full format (<Code>K1A 0B1</Code>).
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
          All prices are in Canadian dollars (CAD), tax included. You pay for what a letter takes:
        </p>
        <Pre>{`total = (mailing fee + envelope) x mailings + pages x page rate + stamps x ${$(RATES.stampCents)}`}</Pre>
        <Table
          headers={["Item", "Price"]}
          rows={[
            ["Mailing fee (API), per mailing", $(RATES.baseCents.api)],
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

        <H2 id="quote">POST /api/v1/quote</H2>
        <p className="text-sm text-gray-600 mb-2">
          Price a letter without sending it. No API key needed. Send <Code>pages</Code> (1&ndash;{MAX_PAGES}) and optionally{" "}
          <Code>letter_size</Code>, <Code>colour</Code> and <Code>duplex</Code>; you get the same price breakdown that
          <Code>/api/v1/send</Code> returns.
        </p>
        <Pre>{`curl -X POST https://sendletter.app/api/v1/quote \\
  -H "Content-Type: application/json" \\
  -d '{ "pages": 6, "letter_size": "standard", "colour": false }'`}</Pre>

        <H2 id="errors">Error Codes</H2>
        <Table
          headers={["Status", "Meaning", "Common Causes"]}
          rows={[
            ["400", "Bad Request", "Missing/invalid fields, non-CA delivery address, invalid postal code, content too large"],
            ["401", "Unauthorized", "Missing or invalid API key"],
            ["402", "Payment Required", "No payment method on file — add one at <a href='/profile' class='text-blue-600'>sendletter.app/profile</a>"],
            ["500", "Server Error", "Internal error — contact <a href='mailto:support@sendletter.app' class='text-blue-600'>support</a>"],
          ]}
        />
        <p className="text-sm text-gray-600 mt-2">
          All error responses include an <Code>error</Code> field with a human-readable message:
        </p>
        <Pre>{`{ "error": "to.postal_code is not a valid Canadian postal code. Expected format: A1A 1A1" }`}</Pre>

        <H2 id="billing">Billing</H2>
        <p className="text-sm text-gray-600 mb-2">
          Each letter is charged at the price returned by the API. To keep card fees from eating small letters, usage is
          billed once your account owes at least $10.00, or once the oldest unbilled letter is a week old, whichever
          comes first. Charges are processed automatically against your saved payment method. You can view usage and billing history on your <Link href="/profile" className="text-blue-600 hover:underline">profile</Link>.
        </p>

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
