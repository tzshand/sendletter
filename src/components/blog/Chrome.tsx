// Shared header, footer, and post shell for both locales.
//
// One component rather than two near-identical page files, so an EN-only tweak
// cannot silently drift the FR pages out of sync.

import Link from "next/link";
import { SnowGoose } from "@/components/SnowGoose";
import { CTA } from "@/components/blog/Prose";
import { POSTS, type Locale, type PostMeta, postPath, blogIndexPath } from "@/lib/blog";

const POSTS_BY_ID = new Map(POSTS.map((p) => [p.id, p]));

const T = {
  en: {
    apiDocs: "API Docs",
    blog: "Blog",
    terms: "Terms",
    send: "Send a letter",
    allPosts: "← All posts",
    keepReading: "Keep reading",
    otherLang: "Français",
  },
  fr: {
    apiDocs: "Docs API",
    blog: "Blogue",
    terms: "Conditions",
    send: "Envoyer une lettre",
    allPosts: "← Tous les articles",
    keepReading: "À lire ensuite",
    otherLang: "English",
  },
} as const;

export function formatDate(iso: string, locale: Locale): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function BlogHeader({ locale }: { locale: Locale }) {
  const t = T[locale];
  return (
    <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between">
      <Link href="/" className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
        <SnowGoose size={24} />
        <span className="text-[14px] font-bold tracking-tight text-gray-900">sendletter</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href={blogIndexPath(locale)}
          className="text-xs font-semibold text-white/70 hover:text-white transition-colors"
        >
          {t.blog}
        </Link>
        <Link href="/" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
          {t.send}
        </Link>
      </div>
    </header>
  );
}

export function BlogFooter({ locale }: { locale: Locale }) {
  const t = T[locale];
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-2xl mx-auto px-5 py-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <SnowGoose size={28} />
          <span className="font-bold text-sm">sendletter</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <Link href="/docs" className="hover:text-gray-600 transition-colors">{t.apiDocs}</Link>
          <span>·</span>
          <Link href={blogIndexPath(locale)} className="hover:text-gray-600 transition-colors">{t.blog}</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-gray-600 transition-colors">{t.terms}</Link>
        </div>
      </div>
    </footer>
  );
}

export function PostShell({
  locale,
  post,
  children,
}: {
  locale: Locale;
  post: PostMeta;
  children: React.ReactNode;
}) {
  const t = T[locale];
  const meta = post[locale];
  const other: Locale = locale === "fr" ? "en" : "fr";
  const related = post.related
    .map((id) => POSTS_BY_ID.get(id))
    .filter((p): p is PostMeta => Boolean(p));

  return (
    <article className="max-w-2xl mx-auto px-5 py-12">
      <nav className="mb-6 flex items-center justify-between">
        <Link
          href={blogIndexPath(locale)}
          className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          {t.allPosts}
        </Link>
        {/* Real link, not a client-side toggle — the alternate has to be
            crawlable for hreflang to mean anything. */}
        <Link
          href={postPath(post, other)}
          hrefLang={other === "fr" ? "fr-CA" : "en-CA"}
          className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          {t.otherLang}
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 leading-snug mb-2">{meta.title}</h1>
      <time
        dateTime={post.published}
        className="block text-[11px] text-gray-400 uppercase tracking-wide mb-8"
      >
        {formatDate(post.published, locale)}
      </time>

      {children}

      <CTA variant={post.cta} locale={locale} />

      {related.length > 0 && (
        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t.keepReading}
          </p>
          <div className="space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={postPath(r, locale)}
                className="block text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                {r[locale].title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
