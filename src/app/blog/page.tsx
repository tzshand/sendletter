import type { Metadata } from "next";
import Link from "next/link";
import { BlogHeader, BlogFooter, formatDate } from "@/components/blog/Chrome";
import { POSTS, liveHubs, postPath, SITE } from "@/lib/blog";
import { hubPath } from "@/lib/hubs";

export const metadata: Metadata = {
  title: "Blog — Sending Mail in Canada | sendletter",
  description:
    "Practical guides to sending physical mail in Canada: what postage costs in 2026, when ordinary letter mail is not enough, and how to send mail from your own software.",
  alternates: {
    canonical: `${SITE}/blog`,
    languages: {
      "en-CA": `${SITE}/blog`,
      "fr-CA": `${SITE}/fr/blog`,
      "x-default": `${SITE}/blog`,
    },
  },
  openGraph: {
    title: "Blog — Sending Mail in Canada | sendletter",
    description:
      "Practical guides to sending physical mail in Canada — postage costs, legal notices, and print-and-mail APIs.",
    url: `${SITE}/blog`,
    siteName: "sendletter",
    type: "website",
    locale: "en_CA",
    alternateLocale: "fr_CA",
  },
};

export default function BlogIndex() {
  const posts = [...POSTS].sort((a, b) => b.published.localeCompare(a.published));

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <BlogHeader locale="en" />

      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Sending mail in Canada</h1>
          <Link
            href="/fr/blog"
            hrefLang="fr-CA"
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Français
          </Link>
        </div>
        <p className="text-sm text-gray-500 mb-10">
          Short, specific guides to postage, delivery, and getting paper into the mail. No
          filler.
        </p>

        <div className="mb-10 grid gap-2 sm:grid-cols-2">
          {liveHubs().map((h) => (
            <Link
              key={h.id}
              href={hubPath(h)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] font-semibold text-gray-800 hover:border-gray-300 transition-colors"
            >
              {h.title}
            </Link>
          ))}
        </div>

        <div className="space-y-1">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={postPath(post, "en")}
              className="block rounded-xl border border-transparent hover:border-gray-200 hover:bg-white px-4 py-4 -mx-4 transition-colors"
            >
              <h2 className="text-[15px] font-semibold text-gray-900 mb-1">{post.en.title}</h2>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-2">
                {post.en.description}
              </p>
              <time
                dateTime={post.published}
                className="text-[11px] text-gray-400 uppercase tracking-wide"
              >
                {formatDate(post.published, "en")}
              </time>
            </Link>
          ))}
        </div>
      </div>

      <BlogFooter locale="en" />
    </div>
  );
}
