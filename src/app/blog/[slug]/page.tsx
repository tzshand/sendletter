import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SnowGoose } from "@/components/SnowGoose";
import { CTA } from "@/components/blog/Prose";
import { POSTS, getPost } from "@/lib/blog";
import { BODIES } from "@/content/registry";

// Every post is known at build time, so the whole blog is prerendered.
export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

// params is a Promise in Next 16 and must be awaited — in both the page and
// generateMetadata.
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = `https://sendletter.app/blog/${post.slug}`;
  return {
    title: `${post.title} | sendletter`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: "sendletter",
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
      locale: "en_CA",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  const Body = BODIES[slug];
  if (!post || !Body) notFound();

  const url = `https://sendletter.app/blog/${post.slug}`;
  const related = post.related
    .map((s) => getPost(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.published,
      dateModified: post.updated ?? post.published,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      inLanguage: "en-CA",
      author: { "@type": "Organization", name: "sendletter", url: "https://sendletter.app" },
      publisher: {
        "@type": "Organization",
        name: "sendletter",
        url: "https://sendletter.app",
        logo: { "@type": "ImageObject", url: "https://sendletter.app/favicon.png" },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "sendletter", item: "https://sendletter.app" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://sendletter.app/blog" },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
          <SnowGoose size={24} />
          <span className="text-[14px] font-bold tracking-tight text-gray-900">sendletter</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/blog" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
            Blog
          </Link>
          <Link href="/" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
            Send a letter
          </Link>
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-5 py-12">
        <nav className="mb-6">
          <Link href="/blog" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
            ← All posts
          </Link>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 leading-snug mb-2">{post.title}</h1>
        <time dateTime={post.published} className="block text-[11px] text-gray-400 uppercase tracking-wide mb-8">
          {formatDate(post.published)}
        </time>

        <Body />

        <CTA variant={post.cta} />

        {related.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Keep reading
            </p>
            <div className="space-y-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="block text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {r.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

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
