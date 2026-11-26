import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogHeader, BlogFooter } from "@/components/blog/Chrome";
import { CTA } from "@/components/blog/Prose";
import { POSTS, liveHubs, postPath, SITE } from "@/lib/blog";
import { getHubBySlug, hubPath } from "@/lib/hubs";

export function generateStaticParams() {
  return liveHubs().map((h) => ({ hub: h.slug }));
}

export const dynamicParams = false;

// params is a Promise in Next 16 — in the page and in generateMetadata.
type Props = { params: Promise<{ hub: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hub: slug } = await params;
  const hub = getHubBySlug(slug);
  if (!hub) return {};
  const title = `${hub.title} | sendletter`;
  return {
    title,
    description: hub.description,
    alternates: {
      canonical: `${SITE}${hubPath(hub)}`,
      ...(hub.fr && POSTS.filter((p) => p.hub === hub.id && p.fr).length >= 2
        ? { languages: { "en-CA": `${SITE}${hubPath(hub, "en")}`, "fr-CA": `${SITE}${hubPath(hub, "fr")}`, "x-default": `${SITE}${hubPath(hub, "en")}` } }
        : {}),
    },
    openGraph: {
      title: hub.title,
      description: hub.description,
      url: `${SITE}${hubPath(hub)}`,
      siteName: "sendletter",
      type: "website",
      locale: "en_CA",
    },
  };
}

export default async function HubPage({ params }: Props) {
  const { hub: slug } = await params;
  const hub = getHubBySlug(slug);
  const guides = hub ? POSTS.filter((p) => p.hub === hub.id) : [];
  if (!hub || !liveHubs().some((h) => h.id === hub.id)) notFound();

  const url = `${SITE}${hubPath(hub)}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: hub.title,
      description: hub.description,
      url,
      inLanguage: "en-CA",
      isPartOf: { "@type": "WebSite", name: "sendletter", url: SITE },
      hasPart: guides.map((g) => ({ "@type": "Article", headline: g.en.title, url: `${SITE}${postPath(g, "en")}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "sendletter", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
        { "@type": "ListItem", position: 3, name: hub.title, item: url },
      ],
    },
  ];

  const others = liveHubs().filter((h) => h.id !== hub.id);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogHeader locale="en" />

      <div className="max-w-2xl mx-auto px-5 py-12">
        <nav className="mb-6">
          <Link href="/blog" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
            ← All guides
          </Link>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">{hub.title}</h1>
        {hub.intro.map((para) => (
          <p key={para} className="text-[15px] leading-relaxed text-gray-600 mb-4">
            {para}
          </p>
        ))}

        <div className="mt-8 space-y-1">
          {guides.map((g) => (
            <Link
              key={g.id}
              href={postPath(g, "en")}
              className="block rounded-xl border border-transparent hover:border-gray-200 hover:bg-white px-4 py-4 -mx-4 transition-colors"
            >
              <h2 className="text-[15px] font-semibold text-gray-900 mb-1">{g.en.title}</h2>
              <p className="text-[13px] text-gray-500 leading-relaxed">{g.en.description}</p>
            </Link>
          ))}
        </div>

        <CTA variant={hub.id === "api" ? "api" : "home"} />

        {others.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">More guides</p>
            <div className="space-y-2">
              {others.map((h) => (
                <Link
                  key={h.id}
                  href={hubPath(h)}
                  className="block text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {h.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <BlogFooter locale="en" />
    </div>
  );
}
