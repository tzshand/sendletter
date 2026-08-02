import type { Metadata } from "next";
import Link from "next/link";
import { BlogHeader, BlogFooter, formatDate } from "@/components/blog/Chrome";
import { POSTS, postPath, SITE } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blogue — Envoyer du courrier au Canada | sendletter",
  description:
    "Guides pratiques sur l'envoi de courrier papier au Canada : ce que coûte l'affranchissement en 2026, quand le Poste-lettres ordinaire ne suffit pas, et comment poster depuis votre logiciel.",
  alternates: {
    canonical: `${SITE}/fr/blog`,
    languages: {
      "en-CA": `${SITE}/blog`,
      "fr-CA": `${SITE}/fr/blog`,
      "x-default": `${SITE}/blog`,
    },
  },
  openGraph: {
    title: "Blogue — Envoyer du courrier au Canada | sendletter",
    description:
      "Guides pratiques sur l'envoi de courrier papier au Canada — tarifs, mises en demeure et API d'impression et de postage.",
    url: `${SITE}/fr/blog`,
    siteName: "sendletter",
    type: "website",
    locale: "fr_CA",
    alternateLocale: "en_CA",
  },
};

export default function BlogueIndex() {
  const posts = [...POSTS].sort((a, b) => b.published.localeCompare(a.published));

  // Only the root layout can render <html>, and it is lang="en". Scoping lang
  // on this subtree is valid HTML and is what screen readers and search engines
  // actually read for the content below.
  return (
    <div lang="fr-CA" className="min-h-screen bg-[#fafafa]">
      <BlogHeader locale="fr" />

      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Envoyer du courrier au Canada</h1>
          <Link
            href="/blog"
            hrefLang="en-CA"
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            English
          </Link>
        </div>
        <p className="text-sm text-gray-500 mb-10">
          Des guides courts et précis sur l&apos;affranchissement, les délais et la façon de
          mettre du papier à la poste. Sans remplissage.
        </p>

        <div className="space-y-1">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={postPath(post, "fr")}
              className="block rounded-xl border border-transparent hover:border-gray-200 hover:bg-white px-4 py-4 -mx-4 transition-colors"
            >
              <h2 className="text-[15px] font-semibold text-gray-900 mb-1">{post.fr.title}</h2>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-2">
                {post.fr.description}
              </p>
              <time
                dateTime={post.published}
                className="text-[11px] text-gray-400 uppercase tracking-wide"
              >
                {formatDate(post.published, "fr")}
              </time>
            </Link>
          ))}
        </div>
      </div>

      <BlogFooter locale="fr" />
    </div>
  );
}
