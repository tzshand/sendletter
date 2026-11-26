import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogHeader, BlogFooter, PostShell } from "@/components/blog/Chrome";
import { POSTS, getPostBySlug, postPath, SITE } from "@/lib/blog";
import { renderBody } from "@/content/registry";
import { postJsonLd } from "@/lib/blog-schema";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.fr.slug }));
}

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug("fr", slug);
  if (!post) return {};
  const meta = post.fr;

  return {
    title: `${meta.title} | sendletter`,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `${SITE}${postPath(post, "fr")}`,
      languages: {
        "en-CA": `${SITE}${postPath(post, "en")}`,
        "fr-CA": `${SITE}${postPath(post, "fr")}`,
        "x-default": `${SITE}${postPath(post, "en")}`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${SITE}${postPath(post, "fr")}`,
      siteName: "sendletter",
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
      locale: "fr_CA",
      alternateLocale: "en_CA",
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export default async function ArticleBlogue({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug("fr", slug);
  const body = post ? renderBody("fr", post.id) : null;
  if (!post || !body) notFound();

  // Only the root layout can render <html>, and it is lang="en". Scoping lang
  // on this subtree is valid HTML and is what screen readers and search engines
  // actually read for the content below.
  return (
    <div lang="fr-CA" className="min-h-screen bg-[#fafafa]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd(post, "fr")) }}
      />
      <BlogHeader locale="fr" />
      <PostShell locale="fr" post={post}>
        {body}
      </PostShell>
      <BlogFooter locale="fr" />
    </div>
  );
}
