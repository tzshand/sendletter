import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogHeader, BlogFooter } from "@/components/blog/Chrome";
import { CTA } from "@/components/blog/Prose";
import { POSTS, postPath, SITE } from "@/lib/blog";
import { HUBS, getHubByFrSlug, hubPath } from "@/lib/hubs";

// A French hub exists once it has a French text and at least two translated, live guides.
const frGuides = (hubId: string) => POSTS.filter((p) => p.hub === hubId && p.fr);
const liveFrHubs = () => HUBS.filter((h) => h.fr && frGuides(h.id).length >= 2);

export function generateStaticParams() {
  return liveFrHubs().map((h) => ({ hub: h.fr!.slug }));
}

export const dynamicParams = false;

type Props = { params: Promise<{ hub: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hub: slug } = await params;
  const hub = getHubByFrSlug(slug);
  if (!hub?.fr) return {};
  return {
    title: `${hub.fr.title} | sendletter`,
    description: hub.fr.description,
    alternates: {
      canonical: `${SITE}${hubPath(hub, "fr")}`,
      languages: { "en-CA": `${SITE}${hubPath(hub, "en")}`, "fr-CA": `${SITE}${hubPath(hub, "fr")}`, "x-default": `${SITE}${hubPath(hub, "en")}` },
    },
    openGraph: { title: hub.fr.title, description: hub.fr.description, url: `${SITE}${hubPath(hub, "fr")}`, siteName: "sendletter", type: "website", locale: "fr_CA", alternateLocale: "en_CA" },
  };
}

export default async function PageCentre({ params }: Props) {
  const { hub: slug } = await params;
  const hub = getHubByFrSlug(slug);
  if (!hub?.fr || !liveFrHubs().some((h) => h.id === hub.id)) notFound();
  const guides = frGuides(hub.id);
  const url = `${SITE}${hubPath(hub, "fr")}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: hub.fr.title,
      description: hub.fr.description,
      url,
      inLanguage: "fr-CA",
      isPartOf: { "@type": "WebSite", name: "sendletter", url: SITE },
      hasPart: guides.map((g) => ({ "@type": "Article", headline: g.fr!.title, url: `${SITE}${postPath(g, "fr")}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "sendletter", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blogue", item: `${SITE}/fr/blog` },
        { "@type": "ListItem", position: 3, name: hub.fr.title, item: url },
      ],
    },
  ];
  const others = liveFrHubs().filter((h) => h.id !== hub.id);

  return (
    <div lang="fr-CA" className="min-h-screen bg-[#fafafa]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogHeader locale="fr" />
      <div className="max-w-2xl mx-auto px-5 py-12">
        <nav className="mb-6 flex items-center justify-between">
          <Link href="/fr/blog" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">← Tous les guides</Link>
          <Link href={hubPath(hub, "en")} hrefLang="en-CA" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">English</Link>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{hub.fr.title}</h1>
        {hub.fr.intro.map((para) => (
          <p key={para} className="text-[15px] leading-relaxed text-gray-600 mb-4">{para}</p>
        ))}
        <div className="mt-8 space-y-1">
          {guides.map((g) => (
            <Link key={g.id} href={postPath(g, "fr")} className="block rounded-xl border border-transparent hover:border-gray-200 hover:bg-white px-4 py-4 -mx-4 transition-colors">
              <h2 className="text-[15px] font-semibold text-gray-900 mb-1">{g.fr!.title}</h2>
              <p className="text-[13px] text-gray-500 leading-relaxed">{g.fr!.description}</p>
            </Link>
          ))}
        </div>
        <CTA variant="home" locale="fr" />
        {others.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Autres guides</p>
            <div className="space-y-2">
              {others.map((h) => (
                <Link key={h.id} href={hubPath(h, "fr")} className="block text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">{h.fr!.title}</Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <BlogFooter locale="fr" />
    </div>
  );
}
