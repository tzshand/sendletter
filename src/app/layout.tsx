import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Send a Letter Online in Canada — From $4.29 | sendletter",
  description:
    "Send a real letter in the mail from your computer. Write or upload, add addresses, and we print and mail it anywhere in Canada from $4.29. No account, no subscription, no minimum.",
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
    title: "Send a Letter Online in Canada — From $4.29 | sendletter",
    description:
      "Write or upload your letter, add addresses, and we print and mail it anywhere in Canada. No account needed.",
    url: "https://sendletter.app",
    siteName: "sendletter",
    locale: "en_CA",
    alternateLocale: "fr_CA",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Send a Letter Online in Canada — From $4.29 | sendletter" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Send a Letter Online in Canada — From $4.29 | sendletter",
    description:
      "Upload or write your letter, we print and mail it via Canada Post from $4.29 CAD.",
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
      "Send physical letters online from $4.29 CAD. Write or upload, we print and mail via Canada Post. API accessible for automated workflows. No account, no subscription, no minimum.",
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
      lowPrice: "4.29",
      highPrice: "6.28",
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
          name: "Standard (tri-fold)",
          price: "4.29",
          priceCurrency: "CAD",
          description: "8.5×11 letter, tri-folded in a #10 envelope. Up to 5 pages.",
        },
        {
          "@type": "Offer",
          name: "Letter (flat)",
          price: "6.28",
          priceCurrency: "CAD",
          description: "8.5×11 letter, mailed flat in a 9×12 envelope. Up to 15 pages.",
        },
        {
          "@type": "Offer",
          name: "Legal (flat)",
          price: "6.28",
          priceCurrency: "CAD",
          description: "8.5×14 legal, mailed flat in a 10×15 envelope. Up to 15 pages.",
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
    estimatedCost: { "@type": "MonetaryAmount", currency: "CAD", value: "4.29" },
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
        text: "Choose your envelope size, pay securely from $4.29 CAD, and we print and mail your letter within 1 business day via Canada Post.",
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
          text: "Starting from $4.29 CAD for a standard tri-fold letter. Flat letter and legal sizes are $6.28 CAD. No hidden fees, no subscription.",
        },
      },
      {
        "@type": "Question",
        name: "Combien coûte l'envoi d'une lettre en ligne?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "À partir de 4,29 $ CAD pour une lettre standard pliée en trois. Les formats lettre et légal à plat sont à 6,28 $ CAD. Aucun frais caché, aucun abonnement.",
        },
      },
      {
        "@type": "Question",
        name: "How long does delivery take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Letters are printed and mailed within 1 business day. Delivery via Canada Post typically takes 3–10 business days within Canada.",
        },
      },
      {
        "@type": "Question",
        name: "Quel est le délai de livraison?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Les lettres sont imprimées et postées dans un délai de 1 jour ouvrable. La livraison via Postes Canada prend généralement de 3 à 10 jours ouvrables au Canada.",
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
