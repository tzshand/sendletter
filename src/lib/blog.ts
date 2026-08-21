// Blog post metadata, bilingual.
//
// Slugs are per-locale rather than shared: a French reader searching
// "envoyer une lettre en ligne" is better served by a URL that says so, and
// keyword-in-path still carries weight for the smaller French index. The `id`
// is the stable key that ties the two together for hreflang and for the
// language switcher.

export type Locale = "en" | "fr";

export type LocaleMeta = {
  slug: string;
  title: string;
  /** Meta description and index blurb. ~155 characters. */
  description: string;
  keywords: string[];
};

export type PostMeta = {
  id: string;
  published: string;
  updated?: string;
  /** Where the single end-of-post call to action points. */
  cta: "home" | "api";
  /** Ids of one or two sibling posts, rendered as further reading. */
  related: string[];
  en: LocaleMeta;
  fr: LocaleMeta;
};

export const POSTS: PostMeta[] = [
  {
    id: "send-a-letter-online",
    published: "2026-08-02",
    cta: "home",
    related: ["cost-to-mail", "legal-notice"],
    en: {
      slug: "how-to-send-a-letter-online-in-canada",
      title: "How to Send a Letter Online in Canada (2026)",
      description:
        "Three ways to get a physical letter into the mail without going to the post office, what each costs in 2026, and how to tell which one you actually need.",
      keywords: [
        "send a letter online",
        "mail a letter online canada",
        "send a letter without going to the post office",
        "how to send a letter online",
      ],
    },
    fr: {
      slug: "envoyer-une-lettre-en-ligne-au-canada",
      title: "Comment envoyer une lettre en ligne au Canada (2026)",
      description:
        "Trois façons de poster une vraie lettre sans passer au bureau de poste, ce que chacune coûte en 2026, et comment savoir laquelle vous convient.",
      keywords: [
        "envoyer une lettre en ligne",
        "poster une lettre en ligne canada",
        "envoyer une lettre sans aller au bureau de poste",
        "comment envoyer une lettre en ligne",
      ],
    },
  },
  {
    id: "cost-to-mail",
    published: "2026-08-02",
    cta: "home",
    related: ["send-a-letter-online", "legal-notice"],
    en: {
      slug: "what-it-costs-to-mail-a-letter-in-canada",
      title: "What It Actually Costs to Mail a Letter in Canada in 2026",
      description:
        "A single domestic stamp is $1.44 in 2026. Here is the full loaded cost of mailing a letter yourself, and the point where paying a service becomes rational.",
      keywords: [
        "canada post letter rate 2026",
        "cost to mail a letter in canada",
        "canada post stamp price",
        "how much is a stamp in canada",
      ],
    },
    fr: {
      slug: "combien-coute-une-lettre-au-canada",
      title: "Combien coûte vraiment l'envoi d'une lettre au Canada en 2026",
      description:
        "Un timbre à l'unité coûte 1,44 $ en 2026. Voici le coût réel d'une lettre postée soi-même, et le moment où payer un service devient rationnel.",
      keywords: [
        "tarif poste-lettres 2026",
        "prix timbre postes canada",
        "combien coûte une lettre au canada",
        "tarif affranchissement canada",
      ],
    },
  },
  {
    id: "legal-notice",
    published: "2026-08-02",
    cta: "home",
    related: ["send-a-letter-online", "cost-to-mail"],
    en: {
      slug: "can-you-mail-a-legal-notice-online",
      title: "Can You Mail a Legal Notice or Demand Letter Online?",
      description:
        "Usually not with ordinary lettermail. If you need to prove the recipient received it, you need Registered Mail or a process server — here is how to tell which applies.",
      keywords: [
        "demand letter registered mail",
        "formal notice quebec mise en demeure",
        "serve notice by mail canada",
        "proof of delivery letter canada",
      ],
    },
    fr: {
      slug: "envoyer-une-mise-en-demeure-par-la-poste",
      title: "Peut-on envoyer une mise en demeure en ligne ?",
      description:
        "Pas par Poste-lettres ordinaire. S'il faut prouver que le destinataire l'a reçue, il vous faut le courrier recommandé ou un huissier. Voici comment trancher.",
      keywords: [
        "mise en demeure courrier recommandé",
        "envoyer une mise en demeure",
        "preuve de réception lettre québec",
        "mise en demeure par la poste",
      ],
    },
  },
  {
    id: "api-guide",
    published: "2026-08-02",
    cta: "api",
    related: ["send-a-letter-online", "legal-notice"],
    en: {
      slug: "send-physical-mail-from-your-app",
      title: "Sending Physical Mail From Your App: A Practical API Guide",
      description:
        "When postal mail beats email, what a print-and-mail API request actually looks like, and the four gotchas that bite teams shipping physical mail for the first time.",
      keywords: [
        "print and mail api",
        "send letter api",
        "physical mail api canada",
        "programmatic direct mail",
        "lob alternative canada",
      ],
    },
    fr: {
      slug: "envoyer-du-courrier-depuis-votre-application",
      title: "Envoyer du courrier papier depuis votre application : guide d'API",
      description:
        "Quand le courrier papier bat le courriel, à quoi ressemble une requête d'API d'impression et de postage, et les quatre pièges classiques d'une première intégration.",
      keywords: [
        "api impression et postage",
        "api envoi de lettres",
        "api courrier papier canada",
        "publipostage programmable",
      ],
    },
  },
];

export function getPostById(id: string): PostMeta | undefined {
  return POSTS.find((p) => p.id === id);
}

export function getPostBySlug(locale: Locale, slug: string): PostMeta | undefined {
  return POSTS.find((p) => p[locale].slug === slug);
}

/** Path to a post in a given locale. French lives under /fr. */
export function postPath(post: PostMeta, locale: Locale): string {
  return locale === "fr" ? `/fr/blog/${post.fr.slug}` : `/blog/${post.en.slug}`;
}

export function blogIndexPath(locale: Locale): string {
  return locale === "fr" ? "/fr/blog" : "/blog";
}

export const SITE = "https://sendletter.app";
