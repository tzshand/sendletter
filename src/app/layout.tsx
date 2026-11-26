import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import "./globals.css";
import { API_FROM_ALL_IN_CENTS } from "@/lib/volume";
import { quote, formatCents, FROM_ALL_IN_CENTS, COLOUR_SINGLE_CENTS, RATES, MAX_PAGES } from "@/lib/pricing";

// Every price on this page comes from the same rates the checkout charges.
const ALL_IN = formatCents(FROM_ALL_IN_CENTS);
const ALL_IN_FR = formatCents(FROM_ALL_IN_CENTS, "fr");
const MIN_ALL_IN = (size: "standard" | "large" | "legal") =>
  (quote({ pages: 1, size, colour: false, duplex: true, channel: "web" }).totalCents / 100).toFixed(2);

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `Send a Letter Online in Canada — From ${ALL_IN} (Postage & Tax Incl.) | sendletter`,
  description:
    `Send a real letter in the mail from your computer. Write or upload, add addresses, and we print and mail it anywhere in Canada from ${ALL_IN}: printing, postage and tax included. No account, no subscription, no minimum.`,
  metadataBase: new URL("https://sendletter.app"),
  icons: {
    icon: "/favicon.png",
  },
  keywords: [
    "send a letter online", "mail a letter online", "send letter online Canada",
    "can you send a letter online", "how to send a letter online",
    "send a letter without going to the post office", "mail a letter from home",
    "send real mail", "send physical mail", "send one letter",
    "print and mail a letter", "letter mailing service Canada",
    "envoyer une lettre en ligne", "envoyer du courrier en ligne",
    "poster une lettre en ligne Canada", "courrier en ligne",
    "envoyer une lettre sans aller au bureau de poste",
    "Canada Post", "Postes Canada", "no account mail letter",
    "letter mailing API", "send letter API Canada", "mail API",
    "automate sending letters", "programmatic mail",
  ],
  alternates: {
    canonical: "https://sendletter.app",
    languages: {
      en: "https://sendletter.app",
      fr: "https://sendletter.app",
    },
  },
  openGraph: {
    title: `Send a Letter Online in Canada — From ${ALL_IN} (Postage & Tax Incl.) | sendletter`,
    description:
      "Write or upload your letter, add addresses, and we print and mail it anywhere in Canada. No account needed.",
    url: "https://sendletter.app",
    siteName: "sendletter",
    locale: "en_CA",
    alternateLocale: "fr_CA",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Send a Letter Online in Canada — From ${ALL_IN} (Postage & Tax Incl.) | sendletter` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Send a Letter Online in Canada — From ${ALL_IN} (Postage & Tax Incl.) | sendletter`,
    description:
      `Upload or write your letter, we print and mail it via Canada Post from ${ALL_IN}: printing, postage and tax included.`,
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "2Qz6zRch06Qztpj9q1R4zTYvFiu5YEpH83AXSZNjLI4",
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "sendletter",
    url: "https://sendletter.app",
    logo: "https://sendletter.app/favicon.png",
    description:
      `Send physical letters online from ${ALL_IN} CAD, printing, postage and tax included. Write or upload, we print and mail via Canada Post. API accessible for automated workflows. No account, no subscription, no minimum.`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Montréal",
      addressRegion: "QC",
      addressCountry: "CA",
    },
    areaServed: { "@type": "Country", name: "Canada" },
    priceRange: "$$",
    currenciesAccepted: "CAD",
    paymentAccepted: "Credit Card",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "sendletter",
    url: "https://sendletter.app",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "fr"],
    offers: {
      "@type": "AggregateOffer",
      // The lowest price anyone can actually pay: one black-and-white page, one stamp.
      lowPrice: (FROM_ALL_IN_CENTS / 100).toFixed(2),
      priceCurrency: "CAD",
      offerCount: 3,
    },
    featureList: [
      "Upload PDF or Word documents",
      "Classic letter template with guided fields",
      "Custom rich text editor",
      "Real-time letter and envelope preview",
      "Standard, letter, and legal envelope sizes",
      "Bilingual English/French interface",
      "Canada-wide delivery via Canada Post",
      "No account or subscription required",
      "REST API for programmatic letter sending",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebAPI",
    name: "sendletter API",
    url: "https://sendletter.app/api/v1/send",
    documentation: "https://sendletter.app/docs",
    description:
      "REST API for sending physical letters anywhere in Canada. Supports draft, formatted HTML, and file upload modes.",
    provider: {
      "@type": "Organization",
      name: "sendletter",
      url: "https://sendletter.app",
    },
    termsOfService: "https://sendletter.app/terms",
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "sendletter — Online Letter Mailing Service",
    alternateName: "sendletter — Service d'envoi de courrier en ligne",
    provider: {
      "@type": "Organization",
      name: "sendletter",
      url: "https://sendletter.app",
    },
    serviceType: "Letter Mailing Service",
    areaServed: { "@type": "Country", name: "Canada" },
    description:
      "Write or upload your letter, add addresses, and we print and mail it via Canada Post. API accessible for developers and automated workflows. No minimum order, no subscription.",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Letter Mailing Options",
      itemListElement: [
        {
          "@type": "Offer",
          name: "Standard (#10 window envelope)",
          price: MIN_ALL_IN("standard"),
          priceCurrency: "CAD",
          description: "8.5×11 letter, folded in a #10 window envelope. Price shown is for one black-and-white page including postage; more pages and colour cost more.",
        },
        {
          "@type": "Offer",
          name: "Letter (flat)",
          price: MIN_ALL_IN("large"),
          priceCurrency: "CAD",
          description: `8.5×11 letter, mailed flat in a 9×12 envelope. One black-and-white page including postage; up to ${MAX_PAGES} pages.`,
        },
        {
          "@type": "Offer",
          name: "Legal (flat)",
          price: MIN_ALL_IN("legal"),
          priceCurrency: "CAD",
          description: `8.5×14 legal, mailed flat in a 10×15 envelope. One black-and-white page including postage; up to ${MAX_PAGES} pages.`,
        },
      ],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Send a Letter Online",
    alternateName: "Comment envoyer une lettre en ligne",
    description:
      "Send a physical letter through Canada Post in 3 simple steps using sendletter.app.",
    totalTime: "PT5M",
    estimatedCost: { "@type": "MonetaryAmount", currency: "CAD", value: (FROM_ALL_IN_CENTS / 100).toFixed(2) },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Write or upload your letter",
        text: "Upload a PDF or Word document, use the classic letter template, or write with the rich text editor.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Add addresses",
        text: "Enter the sender (return) address and the recipient's mailing address anywhere in Canada.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Pay and send",
        text: `Choose your envelope, pay securely from ${ALL_IN} CAD (printing, postage and tax included), and we print and mail your letter within 1 business day via Canada Post.`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How much does it cost to send a letter online?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `From ${ALL_IN} for a one-page black-and-white letter (${formatCents(COLOUR_SINGLE_CENTS)} in colour), with printing, postage and tax included. Longer letters cost more: you pay a mailing fee, printing (${formatCents(RATES.pageCents.bw)} a page black & white, ${formatCents(RATES.pageCents.colour)} colour), the envelope, and Canada Post postage at cost: one stamp (${formatCents(RATES.stampCents)}) covers most letters up to 5 pages. Tax included. No subscription. By API, letters from as low as ${formatCents(API_FROM_ALL_IN_CENTS)} all in with automatic volume pricing.`,
        },
      },
      {
        "@type": "Question",
        name: "Combien coûte l'envoi d'une lettre en ligne?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `À partir de ${ALL_IN_FR} pour une lettre d'une page en noir et blanc (${formatCents(COLOUR_SINGLE_CENTS, "fr")} en couleur), impression, affranchissement et taxes compris. Les lettres plus longues coûtent plus cher : vous payez des frais d'envoi, l'impression (${formatCents(RATES.pageCents.bw, "fr")} la page en noir et blanc, ${formatCents(RATES.pageCents.colour, "fr")} en couleur), l'enveloppe, et l'affranchissement Postes Canada au prix coûtant : un timbre (${formatCents(RATES.stampCents, "fr")}) suffit pour la plupart des lettres jusqu'à 5 pages. Taxes incluses. Aucun abonnement. Par API, dès ${formatCents(API_FROM_ALL_IN_CENTS, "fr")} la lettre, tout compris, avec prix dégressifs automatiques.`,
        },
      },
      {
        "@type": "Question",
        name: "How long does delivery take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Letters are printed and mailed within 1 business day. Canada Post's delivery standard is 2 to 4 business days after posting (an estimate, not a guarantee).",
        },
      },
      {
        "@type": "Question",
        name: "Quel est le délai de livraison?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Les lettres sont imprimées et postées dans un délai de 1 jour ouvrable. La norme de livraison de Postes Canada est de 2 à 4 jours ouvrables après la mise à la poste (une estimation, non une garantie).",
        },
      },
      {
        "@type": "Question",
        name: "What file formats can I upload?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can upload PDF files or Word documents (.docx), up to 15 pages and 10 MB.",
        },
      },
      {
        "@type": "Question",
        name: "Quels formats de fichier puis-je télécharger?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Vous pouvez télécharger des fichiers PDF ou des documents Word (.docx), jusqu'à 15 pages et 10 Mo.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need an account or subscription to send a letter?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. sendletter requires no account, no subscription, and has no minimum order. Write or upload your letter, add addresses, pay, and it's in the mail.",
        },
      },
      {
        "@type": "Question",
        name: "Ai-je besoin d'un compte ou d'un abonnement?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Non. sendletter ne nécessite aucun compte, aucun abonnement et n'a pas de commande minimale. Écrivez ou téléchargez votre lettre, ajoutez les adresses, payez et c'est posté.",
        },
      },
      {
        "@type": "Question",
        name: "Can I send just one letter?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. sendletter is built for sending individual letters — no bulk minimums. One letter, one payment, done.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je envoyer une seule lettre?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolument. sendletter est conçu pour l'envoi de lettres individuelles — aucun minimum. Une lettre, un paiement, c'est tout.",
        },
      },
      {
        "@type": "Question",
        name: "Where can you deliver letters?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We deliver to any mailing address in Canada via Canada Post.",
        },
      },
      {
        "@type": "Question",
        name: "Où pouvez-vous livrer des lettres?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nous livrons à toute adresse postale au Canada via Postes Canada.",
        },
      },
      {
        "@type": "Question",
        name: "Does sendletter have an API?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. sendletter offers API access for developers and AI agents to programmatically send physical letters, automate mailing workflows, and integrate postal services into applications.",
        },
      },
      {
        "@type": "Question",
        name: "sendletter a-t-il une API?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. sendletter offre un accès API permettant aux développeurs et agents IA d'envoyer des lettres physiques par programmation, d'automatiser les flux de courrier et d'intégrer les services postaux dans leurs applications.",
        },
      },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.className} h-full`}>
      <head>
        <link rel="api-description" href="/openapi.json" type="application/openapi+json" />
        <link rel="alternate" href="/llms.txt" type="text/plain" title="LLM-readable site info" />
        <link rel="alternate" href="/llms-full.txt" type="text/plain" title="LLM-readable full API reference" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="h-full text-gray-900 antialiased">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
