// French origin pages.
//
// Declared explicitly rather than through app/[lang]/ because app/fr/ already
// exists as a static directory (the French blog), and Next resolves static
// segments before dynamic ones — so /fr/mail-to-canada would never reach the
// [lang] branch.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OriginArticle } from "@/components/origins/OriginArticle";
import { ORIGINS, getOrigin, originUrl, alternatesFor } from "@/lib/origins";
import { originJsonLd } from "@/lib/origins/schema";

export function generateStaticParams() {
  return ORIGINS.filter((o) => o.lang === "fr").map((o) => ({ slug: o.slug }));
}

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getOrigin("fr", slug);
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
      locale: "fr_FR",
    },
  };
}

export default async function FrenchOriginPage({ params }: Props) {
  const { slug } = await params;
  const page = getOrigin("fr", slug);
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
