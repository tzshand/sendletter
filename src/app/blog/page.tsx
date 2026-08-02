import type { Metadata } from "next";
import Link from "next/link";
import { SnowGoose } from "@/components/SnowGoose";
import { POSTS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Sending Mail in Canada | sendletter",
  description:
    "Practical guides to sending physical mail in Canada: what postage costs in 2026, when ordinary letter mail is not enough, and how to send mail from your own software.",
  alternates: { canonical: "https://sendletter.app/blog" },
  openGraph: {
    title: "Blog — Sending Mail in Canada | sendletter",
    description:
      "Practical guides to sending physical mail in Canada — postage costs, legal notices, and print-and-mail APIs.",
    url: "https://sendletter.app/blog",
    siteName: "sendletter",
    type: "website",
  },
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BlogIndex() {
  const posts = [...POSTS].sort((a, b) => b.published.localeCompare(a.published));

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
          <SnowGoose size={24} />
          <span className="text-[14px] font-bold tracking-tight text-gray-900">sendletter</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/docs" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
            API Docs
          </Link>
          <Link href="/" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
            Send a letter
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sending mail in Canada</h1>
        <p className="text-sm text-gray-500 mb-10">
          Short, specific guides to postage, delivery, and getting paper into the mail. No
          filler.
        </p>

        <div className="space-y-1">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-transparent hover:border-gray-200 hover:bg-white px-4 py-4 -mx-4 transition-colors"
            >
              <h2 className="text-[15px] font-semibold text-gray-900 mb-1">{post.title}</h2>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-2">{post.description}</p>
              <time dateTime={post.published} className="text-[11px] text-gray-400 uppercase tracking-wide">
                {formatDate(post.published)}
              </time>
            </Link>
          ))}
        </div>
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
