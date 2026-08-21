// Localised origin pages: /{lang}/mail-to-canada/{slug}.
//
// `[lang]` is a root-level dynamic segment, which sounds alarming but is safe
// here: static segments win in Next's matcher, so /blog, /docs, /login and the
// rest resolve to their own directories, and this branch only has a
// `mail-to-canada` child so a bare /{anything} matches nothing. dynamicParams
// is off, so only the languages below exist.
//
// One exception needs care: /fr is a real static directory (the French blog),
// so Next will not fall through to [lang] for French. The French pages are
// declared explicitly under app/fr/mail-to-canada/.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OriginArticle } from "@/components/origins/OriginArticle";
import { ORIGINS, getOrigin, originUrl, alternatesFor } from "@/lib/origins";
import { originJsonLd } from "@/lib/origins/schema";

export function generateStaticParams() {
  return ORIGINS.filter((o) => o.lang !== "en" && o.lang !== "fr").map((o) => ({
    lang: o.lang,
    slug: o.slug,
  }));
}

export const dynamicParams = false;

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const page = getOrigin(lang, slug);
  if (!page) return {};

  return {
    title: `${page.title} | sendletter`,
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: originUrl(page), languages: alternatesFor(page) },
    openGraph: {
      title: page.title,
      description: page.description,
      url: originUrl(page),
      siteName: "sendletter",
      type: "article",
      locale: page.hreflang.replace("-", "_"),
    },
  };
}

export default async function LocalisedOriginPage({ params }: Props) {
  const { lang, slug } = await params;
  const page = getOrigin(lang, slug);
  if (!page) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(originJsonLd(page)) }}
      />
      <OriginArticle page={page} />
    </>
  );
}
