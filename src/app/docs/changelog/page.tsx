import type { Metadata } from "next";
import Link from "next/link";
import { SnowGoose } from "@/components/SnowGoose";

export const metadata: Metadata = {
  title: "API changelog — sendletter",
  description: "What changed in the sendletter API, newest first.",
  alternates: { canonical: "https://sendletter.app/docs/changelog" },
};

const ENTRIES: { date: string; title: string; items: string[] }[] = [
  {
    date: "2026-11-26",
    title: "Test keys, idempotency, status, webhooks, volume pricing",
    items: [
      "Test keys (sl_test_): validate and price a letter, fire webhooks for test letters, and mail and bill nothing. No card needed.",
      "Idempotency-Key header on POST: a retry returns the original response instead of mailing a second letter. Kept 7 days.",
      "Letter status: GET /api/v1/letters/{id} and GET /api/v1/letters. Statuses: queued, printed, mailed, cancelled.",
      "Cancellation: DELETE /api/v1/letters/{id} while a letter is queued. Voids or refunds its billing.",
      "Webhooks: letter.created, letter.printed, letter.mailed, letter.cancelled. Signed with HMAC-SHA256, retried over about a day and a half (seven attempts). Test letters fire created, printed, mailed and cancelled events too. Create them on Developers or with POST /api/v1/webhooks.",
      "Automatic volume pricing: the mailing fee falls from $0.99 to $0.20 by your 100th mailing in any 30 days. Letters as low as $1.69 all in. GET /api/v1/pricing returns the table; /api/v1/quote accepts letters_in_last_30_days.",
      "Bulk sending: POST /api/v1/letters/batch takes up to 100 letters in one request, counted as one request against your rate limit. Requires an Idempotency-Key; re-send the same batch to create only what is missing.",
      "Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After) on every response, with guidance on backoff and batching in the docs.",
      "Billing: your first live letter is charged up front; after that, one invoice a month. Invoices and order history, with CSV export, in your account.",
      "Spending limits: $500 a day to start, set your own, or request a higher maximum.",
      "POST /api/v1/letters is the new name for POST /api/v1/send; both work.",
      "The letter object is returned by every endpoint and webhook. New fields: object, livemode, created_at, printed_at, mailed_at, cancelled_at, currency, to, from, reference, metadata, warnings.",
      "Requests accept reference and metadata. Errors now always carry a stable code.",
      "Province/postal-code mismatches are returned as warnings. Per-key rate limit of 120 requests a minute.",
      "OpenAPI 3.1 at /openapi.json, a Postman collection at /postman.json, /llms.txt, and an MCP server (mcp/sendletter-mcp.mjs).",
    ],
  },
  {
    date: "2026-11-26",
    title: "Change: colour is now opt-in",
    items: ["colour now defaults to false (black and white) on /api/v1/letters, /api/v1/send and /api/v1/quote. Send colour: true for colour. Prices of explicit requests are unchanged."],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
          <SnowGoose size={24} />
          <span className="text-[14px] font-bold tracking-tight text-gray-900">sendletter</span>
        </Link>
        <Link href="/docs" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">API reference</Link>
      </header>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">API changelog</h1>
        <p className="text-sm text-gray-500 mb-8">Newest first. Breaking changes are called out as <strong>Change</strong>.</p>
        {ENTRIES.map((e) => (
          <section key={e.title} className="mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{e.date}</p>
            <h2 className="text-base font-bold text-gray-900 mb-2">{e.title}</h2>
            <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-gray-600">
              {e.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </section>
        ))}

        <section id="mcp" className="mb-8 scroll-mt-20">
          <h2 className="text-base font-bold text-gray-900 mb-2">MCP server for AI agents</h2>
          <p className="text-sm text-gray-600 mb-2">
            <code className="bg-gray-100 px-1 rounded text-[13px]">mcp/sendletter-mcp.mjs</code> is a dependency-free Model Context Protocol server over stdio with six tools:
            <code className="bg-gray-100 px-1 rounded text-[13px]"> quote_letter</code>, <code className="bg-gray-100 px-1 rounded text-[13px]">send_letter</code>, <code className="bg-gray-100 px-1 rounded text-[13px]">send_letters</code> (bulk), <code className="bg-gray-100 px-1 rounded text-[13px]">get_letter</code>,{" "}
            <code className="bg-gray-100 px-1 rounded text-[13px]">list_letters</code>, <code className="bg-gray-100 px-1 rounded text-[13px]">cancel_letter</code>. Set <code className="bg-gray-100 px-1 rounded text-[13px]">SENDLETTER_API_KEY</code>. With a
            test key it mails nothing. With a live key, <code className="bg-gray-100 px-1 rounded text-[13px]">send_letter</code> refuses unless the call includes <code className="bg-gray-100 px-1 rounded text-[13px]">confirm_live: true</code>.
          </p>
          <pre className="bg-gray-950 text-gray-200 text-[13px] rounded-lg p-4 overflow-x-auto">{`{
  "mcpServers": {
    "sendletter": {
      "command": "node",
      "args": ["path/to/mcp/sendletter-mcp.mjs"],
      "env": { "SENDLETTER_API_KEY": "sl_test_..." }
    }
  }
}`}</pre>
        </section>
      </div>
    </div>
  );
}
