// JSON-LD for origin pages.
//
// Three types, each earning its place:
//   HowTo        — the address conversion genuinely is a step-by-step procedure
//   FAQPage      — the questions are real and answered on the page
//   BreadcrumbList — hub → page
//
// No Article/BlogPosting here: these are reference pages, not dated posts, and
// claiming a publication date we do not maintain would be worse than useless.

import type { OriginPage } from "./types";
import { originUrl, SITE } from "./index";

export function originJsonLd(page: OriginPage) {
  const url = originUrl(page);

  return [
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: page.ui.stepsHeading,
      description: page.addressProblem,
      inLanguage: page.hreflang,
      url,
      step: page.conversionSteps.map((text, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        text,
      })),
      supply: {
        "@type": "HowToSupply",
        name: page.canadianExample.lines.join(", "),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: page.hreflang,
      mainEntity: page.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "sendletter", item: SITE },
        {
          "@type": "ListItem",
          position: 2,
          name: page.ui.hubLink,
          item: `${SITE}/mail-to-canada`,
        },
        { "@type": "ListItem", position: 3, name: page.title, item: url },
      ],
    },
  ];
}

/** The hub is a collection page — it lists the spokes rather than teaching. */
export function hubJsonLd(pages: OriginPage[]) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Mailing a letter to Canada, by country",
      description:
        "Country-by-country guides to addressing and sending mail to Canada, in 29 languages.",
      url: `${SITE}/mail-to-canada`,
      inLanguage: "en",
      hasPart: pages.map((p) => ({
        "@type": "WebPage",
        name: p.title,
        url: originUrl(p),
        inLanguage: p.hreflang,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "sendletter", item: SITE },
        { "@type": "ListItem", position: 2, name: "Mail to Canada", item: `${SITE}/mail-to-canada` },
      ],
    },
  ];
}
