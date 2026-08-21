import type { Metadata } from "next";
import Link from "next/link";
import { SnowGoose } from "@/components/SnowGoose";
import { ORIGINS, originPath, SITE } from "@/lib/origins";
import { hubJsonLd } from "@/lib/origins/schema";

export const metadata: Metadata = {
  title: "Mail a Letter to Canada — Country Guides in 29 Languages | sendletter",
  description:
    "How to address and send mail to Canada from your country: the address format, the postal code, and what happens when a letter can't be delivered. In your language.",
  keywords: [
    "mail a letter to canada",
    "canadian address format",
    "send mail to canada from abroad",
    "canada postal code format",
  ],
  alternates: {
    canonical: `${SITE}/mail-to-canada`,
    languages: { "x-default": `${SITE}/mail-to-canada`, en: `${SITE}/mail-to-canada` },
  },
  openGraph: {
    title: "Mail a Letter to Canada — Country Guides in 29 Languages",
    description:
      "Address formats, postal codes, and delivery expectations for sending mail to Canada, written for senders in 29 languages.",
    url: `${SITE}/mail-to-canada`,
    siteName: "sendletter",
    type: "website",
  },
};

export default function MailToCanadaHub() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hubJsonLd(ORIGINS)) }}
      />

      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
          <SnowGoose size={24} />
          <span className="text-[14px] font-bold tracking-tight text-gray-900">sendletter</span>
        </Link>
        <Link href="/" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
          Send a letter
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mailing a letter to Canada</h1>
        <p className="text-[15px] leading-relaxed text-gray-600 mb-4">
          Canadian addresses have a strict shape, and almost every country&apos;s own
          conventions break it in a specific way — the order of the lines, where the
          postal code sits, whether the house number comes before or after the street.
          These guides show the conversion for your country, in your language.
        </p>
        <p className="text-[15px] leading-relaxed text-gray-600 mb-10">
          Getting it right matters more than usual. A letter posted inside Canada with a
          foreign return address <strong>cannot be returned</strong> if the Canadian
          address is wrong — no international return postage was ever paid, and under
          Canada Post&apos;s own rules the item is opened and destroyed if it has no
          obvious value. No notification is sent.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-9 mb-3">The Canadian address format</h2>
        <p className="text-[15px] leading-relaxed text-gray-600 mb-4">
          Every guide below converts your country&apos;s conventions into this shape:
        </p>
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-4 font-mono text-[13px] leading-relaxed whitespace-pre-line text-gray-900 mb-5" dir="ltr">
          {"JANE DOE\n4-123 MAIN ST NW\nMONTREAL QC  H3Z 2Y7\nCANADA"}
        </div>
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-[15px] leading-relaxed text-gray-600 mb-4">
          <li>
            <strong>Postal code last</strong>, on the city line, after the province.
            Format is letter-digit-letter, space, digit-letter-digit. Canada Post sorts on
            this before anything else, so a wrong one is worse than a missing house number.
          </li>
          <li>
            <strong>Province as a two-letter code</strong> — QC, ON, BC, AB, NS. Never
            spelled out.
          </li>
          <li>
            <strong>Unit number first</strong>, joined to the street number with a hyphen:
            <code className="mx-1">4-123 Main St</code>, not <code>123 Main St Apt 4</code>.
          </li>
          <li>
            <strong>Latin script only.</strong> Canadian sorting machinery cannot read any
            other writing system. The letter inside can be in any language you like.
          </li>
          <li>
            <strong>Country on its own final line</strong>, in capitals, when posting from
            outside Canada.
          </li>
        </ul>

        <h2 className="text-lg font-bold text-gray-900 mt-9 mb-3">A note on customs</h2>
        <p className="text-[15px] leading-relaxed text-gray-600 mb-4">
          Documents — plain paper correspondence — need no customs declaration. Anything
          with an object in it does, however small, and an undeclared item is a common
          reason inbound mail stalls. A card with something tucked inside is a parcel
          wearing an envelope. This does not apply when we print inside Canada: nothing
          crosses a border.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-9 mb-4">Choose your country</h2>
        <div className="grid sm:grid-cols-2 gap-x-6">
          {ORIGINS.map((o) => (
            <Link
              key={o.id}
              href={originPath(o)}
              hrefLang={o.hreflang}
              className="flex items-baseline justify-between gap-3 py-2.5 border-b border-gray-100 group"
            >
              <span className="text-sm text-gray-900 group-hover:text-brand transition-colors">
                {o.market}
              </span>
              <span lang={o.hreflang} className="text-xs text-gray-400 shrink-0">
                {o.ui.ctaButton}
              </span>
            </Link>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-8 leading-relaxed">
          Don&apos;t see your country? The format above applies wherever you write from —
          only the conversion from your own local habits differs. We deliver to Canadian
          addresses only; sending addresses can be anywhere in the world.
        </p>
      </div>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-5 py-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <SnowGoose size={28} />
            <span className="font-bold text-sm">sendletter</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/docs" className="hover:text-gray-600 transition-colors">API Docs</Link>
            <span>·</span>
            <Link href="/blog" className="hover:text-gray-600 transition-colors">Blog</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
