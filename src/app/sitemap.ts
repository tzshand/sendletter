import type { MetadataRoute } from "next";
import { POSTS, postPath, SITE } from "@/lib/blog";
import { ORIGINS, originUrl } from "@/lib/origins";

export default function sitemap(): MetadataRoute.Sitemap {
  const postDates = POSTS.map((p) => p.updated ?? p.published).sort();
  const newestPost = postDates[postDates.length - 1];

  // Each post appears twice — once per locale — and each entry declares both
  // language alternates. Search engines need the pair to be reciprocal, so
  // both are generated from the same source rather than maintained by hand.
  const posts: MetadataRoute.Sitemap = POSTS.flatMap((post) => {
    const languages = {
      "en-CA": `${SITE}${postPath(post, "en")}`,
      "fr-CA": `${SITE}${postPath(post, "fr")}`,
    };
    const lastModified = new Date(`${post.updated ?? post.published}T00:00:00Z`);
    return (["en", "fr"] as const).map((locale) => ({
      url: `${SITE}${postPath(post, locale)}`,
      // Real publish dates, not new Date() — a sitemap claiming everything
      // changed today teaches crawlers to ignore the field entirely.
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.6,
      alternates: { languages },
    }));
  });

  const blogIndexAlternates = {
    languages: { "en-CA": `${SITE}/blog`, "fr-CA": `${SITE}/fr/blog` },
  };

  return [
    {
      url: SITE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE}/blog`,
      lastModified: new Date(`${newestPost}T00:00:00Z`),
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: blogIndexAlternates,
    },
    {
      url: `${SITE}/fr/blog`,
      lastModified: new Date(`${newestPost}T00:00:00Z`),
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: blogIndexAlternates,
    },
    ...posts,
    {
      url: `${SITE}/mail-to-canada`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Each origin page stands alone — they cover different countries, so they
    // are deliberately NOT declared as language alternates of one another.
    ...ORIGINS.map((o) => ({
      url: originUrl(o),
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
