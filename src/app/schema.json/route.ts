import { NextResponse } from "next/server";
import { FROM_ALL_IN_CENTS } from "@/lib/pricing";
import { API_FROM_ALL_IN_CENTS } from "@/lib/volume";

const $ = (c: number) => (c / 100).toFixed(2);

// schema.org SoftwareApplication JSON-LD. Prices come from the rates, so they cannot go stale.
export function GET() {
  return NextResponse.json(
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "sendletter",
      operatingSystem: "Web",
      applicationCategory: "BusinessApplication",
      offers: [
        {
          "@type": "Offer",
          name: "Letter from the website",
          price: $(FROM_ALL_IN_CENTS),
          priceCurrency: "CAD",
          description: `From $${$(FROM_ALL_IN_CENTS)} CAD for a one-page black-and-white letter, postage included. We print, stamp and mail it.`,
        },
        {
          "@type": "Offer",
          name: "Letter by API, at volume",
          price: $(API_FROM_ALL_IN_CENTS),
          priceCurrency: "CAD",
          description: `As low as $${$(API_FROM_ALL_IN_CENTS)} CAD a letter all in by API, with automatic volume pricing and no monthly fee.`,
        },
      ],
      description:
        "Send a real letter in the mail from your computer, or by API from your software. We print, stamp and mail it with Canada Post, usually within one business day. Canadian addresses only.",
      url: "https://sendletter.app",
      image: "https://sendletter.app/goose-128-letter.png",
      author: { "@type": "Organization", name: "sendletter", url: "https://sendletter.app" },
      featureList: [
        "REST API with test keys, idempotency keys, delivery status, cancellation and signed webhooks",
        "Bulk sending: up to 100 letters in one request",
        "Automatic volume pricing down to $" + $(API_FROM_ALL_IN_CENTS) + " a letter",
        "OpenAPI 3.1, Postman collection and MCP server",
        "Upload PDF or Word documents, or write the letter online",
        "Canada Post delivery to any Canadian address",
      ],
      screenshot: "https://sendletter.app/opengraph-image",
      documentation: "https://sendletter.app/docs",
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
