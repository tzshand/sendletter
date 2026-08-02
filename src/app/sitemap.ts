import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const postDates = POSTS.map((p) => p.updated ?? p.published).sort();
  const newestPost = postDates[postDates.length - 1];

  const posts: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `https://sendletter.app/blog/${post.slug}`,
    // Real publish dates, not new Date() — a sitemap claiming everything
    // changed today teaches crawlers to ignore the field entirely.
    lastModified: new Date(`${post.updated ?? post.published}T00:00:00Z`),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [
    {
      url: "https://sendletter.app",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://sendletter.app/docs",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://sendletter.app/blog",
      lastModified: new Date(`${newestPost}T00:00:00Z`),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...posts,
    {
      url: "https://sendletter.app/terms",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
