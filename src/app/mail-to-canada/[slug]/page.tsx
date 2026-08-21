// English-language origin pages, at the section root (no /en prefix).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OriginArticle } from "@/components/origins/OriginArticle";
import { ORIGINS, getOrigin, originUrl, alternatesFor } from "@/lib/origins";
import { originJsonLd } from "@/lib/origins/schema";

export function generateStaticParams() {
  return ORIGINS.filter((o) => o.lang === "en").map((o) => ({ slug: o.slug }));
}

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getOrigin("en", slug);
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
      locale: "en_CA",
    },
  };
}

export default async function EnglishOriginPage({ params }: Props) {
  const { slug } = await params;
  const page = getOrigin("en", slug);
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
