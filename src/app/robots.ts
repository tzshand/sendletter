import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /passkey/* only ever renders from a one-time token in the query string
      // — nothing there is meaningful to a crawler, and the URLs shouldn't be
      // indexed with their tokens attached.
      disallow: ["/api/", "/success", "/profile", "/passkey/"],
    },
    sitemap: "https://sendletter.app/sitemap.xml",
  };
}
