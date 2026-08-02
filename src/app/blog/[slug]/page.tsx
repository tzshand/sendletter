import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogHeader, BlogFooter, PostShell } from "@/components/blog/Chrome";
import { POSTS, getPostBySlug, postPath, SITE } from "@/lib/blog";
import { getBody } from "@/content/registry";
import { postJsonLd } from "@/lib/blog-schema";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.en.slug }));
}

export const dynamicParams = false;

// params is a Promise in Next 16 — in the page and in generateMetadata.
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug("en", slug);
  if (!post) return {};
  const meta = post.en;

  return {
    title: `${meta.title} | sendletter`,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `${SITE}${postPath(post, "en")}`,
      languages: {
        "en-CA": `${SITE}${postPath(post, "en")}`,
        "fr-CA": `${SITE}${postPath(post, "fr")}`,
        "x-default": `${SITE}${postPath(post, "en")}`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${SITE}${postPath(post, "en")}`,
      siteName: "sendletter",
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
      locale: "en_CA",
      alternateLocale: "fr_CA",
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug("en", slug);
  const Body = post ? getBody("en", post.id) : undefined;
  if (!post || !Body) notFound();

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd(post, "en")) }}
      />
      <BlogHeader locale="en" />
      <PostShell locale="en" post={post}>
        <Body />
      </PostShell>
      <BlogFooter locale="en" />
    </div>
  );
}
