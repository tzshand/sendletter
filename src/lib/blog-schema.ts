// JSON-LD for blog posts. Shared by both locales so the two never drift.

import { type Locale, type PostMeta, postPath, blogIndexPath, SITE } from "./blog";
import { HUBS_BY_ID, hubPath } from "./hubs";

export function postJsonLd(post: PostMeta, locale: Locale) {
  const meta = post[locale]!;
  const hub = locale === "en" && post.hub ? HUBS_BY_ID.get(post.hub) : undefined;
  const url = `${SITE}${postPath(post, locale)}`;
  const isFr = locale === "fr";

  return [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: meta.title,
      description: meta.description,
      datePublished: post.published,
      dateModified: post.updated ?? post.published,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      inLanguage: isFr ? "fr-CA" : "en-CA",
      author: { "@type": "Organization", name: "sendletter", url: SITE },
      publisher: {
        "@type": "Organization",
        name: "sendletter",
        url: SITE,
        logo: { "@type": "ImageObject", url: `${SITE}/favicon.png` },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "sendletter", item: SITE },
        {
          "@type": "ListItem",
          position: 2,
          name: isFr ? "Blogue" : "Blog",
          item: `${SITE}${blogIndexPath(locale)}`,
        },
        ...(hub
          ? [{ "@type": "ListItem", position: 3, name: hub.title, item: `${SITE}${hubPath(hub)}` }]
          : []),
        { "@type": "ListItem", position: hub ? 4 : 3, name: meta.title, item: url },
      ],
    },
  ];
}
