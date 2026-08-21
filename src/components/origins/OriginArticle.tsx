// Renderer for a "mail to Canada from X" page.
//
// The information architecture is shared across every origin; the content is
// not. That distinction is the whole basis for these pages existing as separate
// URLs rather than one page with a country dropdown.

import Link from "next/link";
import { SnowGoose } from "@/components/SnowGoose";
import type { OriginPage } from "@/lib/origins/types";
import { originPath, ORIGINS } from "@/lib/origins";

function AddressCard({ label, lines, muted }: { label: string; lines: string[]; muted?: boolean }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div
        className={`rounded-lg border p-4 font-mono text-[13px] leading-relaxed whitespace-pre-line ${
          muted ? "border-gray-200 bg-gray-50 text-gray-500" : "border-brand/30 bg-brand/5 text-gray-900"
        }`}
        // Address blocks are always shown left-to-right, even on RTL pages:
        // that is the point being taught. A Canadian envelope is written LTR.
        dir="ltr"
      >
        {lines.join("\n")}
      </div>
    </div>
  );
}

export function OriginArticle({ page }: { page: OriginPage }) {
  const rtl = page.dir === "rtl";
  const others = ORIGINS.filter((o) => o.id !== page.id).slice(0, 6);

  return (
    <div lang={page.hreflang} dir={rtl ? "rtl" : undefined} className="min-h-screen bg-[#fafafa]">
      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
          <SnowGoose size={24} />
          <span className="text-[14px] font-bold tracking-tight text-gray-900">sendletter</span>
        </Link>
        <Link
          href="/mail-to-canada"
          className="text-xs font-semibold text-white/70 hover:text-white transition-colors"
        >
          {page.ui.hubLink}
        </Link>
      </header>

      <article className="max-w-2xl mx-auto px-5 py-12">
        <h1 className="text-2xl font-bold text-gray-900 leading-snug mb-4">{page.title}</h1>

        <p className="text-base leading-relaxed text-gray-800 font-medium mb-8">{page.lede}</p>

        <h2 className="text-lg font-bold text-gray-900 mt-9 mb-3">{page.ui.addressHeading}</h2>
        <p className="text-[15px] leading-relaxed text-gray-600 mb-5">{page.addressProblem}</p>

        <div className="flex flex-col sm:flex-row gap-4 my-6">
          <AddressCard label={page.localExample.label} lines={page.localExample.lines} muted />
          <AddressCard label={page.canadianExample.label} lines={page.canadianExample.lines} />
        </div>

        <h2 className="text-lg font-bold text-gray-900 mt-9 mb-3">{page.ui.stepsHeading}</h2>
        <ol className="list-decimal list-outside ps-5 space-y-2 text-[15px] leading-relaxed text-gray-600 mb-4">
          {page.conversionSteps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>

        {page.scriptNote && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mt-9 mb-3">{page.ui.scriptHeading}</h2>
            <p className="text-[15px] leading-relaxed text-gray-600 mb-4">{page.scriptNote}</p>
          </>
        )}

        <h2 className="text-lg font-bold text-gray-900 mt-9 mb-3">{page.ui.deliveryHeading}</h2>
        <p className="text-[15px] leading-relaxed text-gray-600 mb-4">{page.transit}</p>
        <p className="text-[15px] leading-relaxed text-gray-600 mb-4">{page.diaspora}</p>

        {/* The commercially important disclosure. Given visual weight to match:
            a foreign sender has no way to discover this on their own. */}
        <h2 className="text-lg font-bold text-gray-900 mt-9 mb-3">{page.ui.warningHeading}</h2>
        <div className="rounded-xl border border-amber/40 bg-amber/5 p-4 mb-4">
          <p className="text-[15px] leading-relaxed text-gray-700">{page.returnWarning}</p>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mt-9 mb-3">{page.ui.faqHeading}</h2>
        <div className="space-y-4 mb-4">
          {page.faq.map((f, i) => (
            <div key={i}>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{f.q}</h3>
              <p className="text-[15px] leading-relaxed text-gray-600">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-900 mb-1">{page.ui.ctaTitle}</p>
          <p className="text-[13px] text-gray-500 mb-4">{page.ui.ctaBody}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-brand text-white text-sm font-bold px-4 h-10 rounded-xl hover:bg-brand-dark transition-colors"
          >
            {page.ui.ctaButton}
          </Link>
        </div>

        {page.reviewNeeded && (
          <p className="mt-6 text-[11px] text-gray-400 leading-relaxed">
            This page was translated without a native reviewer. If something reads
            wrongly, please tell us at{" "}
            <a href="mailto:support@sendletter.app" className="underline">
              support@sendletter.app
            </a>{" "}
            and we will correct it.
          </p>
        )}

        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {page.ui.otherLanguages}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {others.map((o) => (
              <Link
                key={o.id}
                href={originPath(o)}
                hrefLang={o.hreflang}
                lang={o.hreflang}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {o.market}
              </Link>
            ))}
          </div>
        </div>
      </article>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-5 py-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <SnowGoose size={28} />
            <span className="font-bold text-sm">sendletter</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/mail-to-canada" className="hover:text-gray-600 transition-colors">
              {page.ui.hubLink}
            </Link>
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
