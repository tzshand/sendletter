// Blog post metadata, bilingual.
//
// Slugs are per-locale rather than shared: a French reader searching
// "envoyer une lettre en ligne" is better served by a URL that says so, and
// keyword-in-path still carries weight for the smaller French index. The `id`
// is the stable key that ties the two together for hreflang and for the
// language switcher.

import { HUBS, type HubId } from "./hubs";
import { GUIDES } from "@/content/guides";
import { API_FROM_ALL_IN_CENTS } from "./volume";
import { formatCents } from "./pricing";

export type Locale = "en" | "fr";

/**
 * Guides are published in waves, nearest the site's centre first (see
 * scripts/topical/README.md). A guide is live once its wave is at or below this
 * number. Raise it only after the previous wave has been checked in Search
 * Console: if more than 30% of it is "Crawled - currently not indexed", slow down.
 */
export const RELEASED_WAVE = 1;

export type LocaleMeta = {
  slug: string;
  title: string;
  /** Meta description and index blurb. ~155 characters. */
  description: string;
  keywords: string[];
};

export type PostMeta = {
  id: string;
  /** Topic hub this post belongs to; drives breadcrumbs and related links. */
  hub?: HubId;
  /** Publishing wave; 0 = the original posts, always live. */
  wave?: number;
  published: string;
  updated?: string;
  /** Where the single end-of-post call to action points. */
  cta: "home" | "api";
  /** Ids of one or two sibling posts, rendered as further reading. */
  related: string[];
  en: LocaleMeta;
  /** Absent on English-only guides. */
  fr?: LocaleMeta;
};

const LEGACY_POSTS: PostMeta[] = [
  {
    id: "send-a-letter-online",
    hub: "send-online",
    wave: 0,
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
    hub: "postage",
    wave: 0,
    published: "2026-08-02",
    cta: "home",
    related: ["canada-post-stamp-price", "send-a-letter-online", "legal-notice"],
    en: {
      slug: "what-it-costs-to-mail-a-letter-in-canada",
      title: "What It Actually Costs to Mail a Letter in Canada in 2026",
      description:
        "A single domestic stamp is $1.44 in 2026. Here is the full loaded cost of mailing a letter yourself, and the point where paying a service becomes rational.",
      keywords: [
        "canada post letter rate 2026",
        "cost to mail a letter in canada",
        "cost of mailing a letter yourself",
        "is it worth paying to mail a letter",
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
    hub: "legal",
    wave: 0,
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
    // Always live (wave 0): the API docs and the account pages link to it.
    id: "api-volume-pricing",
    hub: "api",
    wave: 0,
    published: "2026-11-26",
    cta: "api",
    related: ["api-guide"],
    en: {
      slug: "api-volume-pricing",
      title: `Letter API Volume Pricing: From ${formatCents(API_FROM_ALL_IN_CENTS)} a Letter`,
      description:
        `Letters by API from as low as ${formatCents(API_FROM_ALL_IN_CENTS)} all in: the mailing fee falls automatically with volume. Rate table, calculator, billing and spending limits.`,
      keywords: ["letter api pricing", "print and mail api pricing canada", "bulk letter mailing canada price", "mail api volume discount"],
    },
  },
  {
    // Always live (wave 0): a tool page, not a wave-gated guide.
    id: "postage-calculator",
    hub: "postage",
    wave: 0,
    published: "2026-11-26",
    cta: "home",
    related: ["how-many-stamps-for-a-letter-in-canada", "canada-post-stamp-price", "what-an-online-letter-costs"],
    en: {
      slug: "postage-calculator-canada",
      title: "Postage Calculator: How Many Stamps for a Letter?",
      description:
        "Enter your sheets and envelope, or the weight, to see how many Canada Post stamps a letter needs within Canada, and what the postage costs.",
      keywords: ["postage calculator canada", "how many stamps do i need canada", "canada post postage calculator", "letter weight calculator"],
    },
  },
  {
    id: "api-guide",
    hub: "api",
    wave: 0,
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

/** Every post, released or not. Use POSTS for anything a visitor or crawler can see. */
export const ALL_POSTS: PostMeta[] = [
  ...LEGACY_POSTS,
  ...GUIDES.map(
    (g): PostMeta => ({
      id: g.id,
      hub: g.hub,
      wave: g.live ? 0 : g.wave,
      published: g.published,
      updated: g.updated,
      cta: "home",
      related: g.related ?? [],
      en: { slug: g.slug, title: g.title, description: g.description, keywords: g.keywords },
    }),
  ),
];

/** Posts that are live. */
export const POSTS: PostMeta[] = ALL_POSTS.filter((p) => (p.wave ?? 0) <= RELEASED_WAVE);

/** Hubs worth a page: at least two live posts (a hub of one is just a thin duplicate of the post). */
export function liveHubs() {
  return HUBS.filter((h) => POSTS.filter((p) => p.hub === h.id).length >= 2);
}

export function getPostById(id: string): PostMeta | undefined {
  return POSTS.find((p) => p.id === id);
}

export function getPostBySlug(locale: Locale, slug: string): PostMeta | undefined {
  return POSTS.find((p) => p[locale]?.slug === slug);
}

/** Posts that exist in this locale. */
export function postsIn(locale: Locale): PostMeta[] {
  return POSTS.filter((p) => Boolean(p[locale]));
}

export function hasLocale(post: PostMeta, locale: Locale): boolean {
  return Boolean(post[locale]);
}

/** Path to a post in a given locale. French lives under /fr. Falls back to English when there is no translation. */
export function postPath(post: PostMeta, locale: Locale): string {
  if (locale === "fr" && post.fr) return `/fr/blog/${post.fr.slug}`;
  return `/blog/${post.en.slug}`;
}

export function blogIndexPath(locale: Locale): string {
  return locale === "fr" ? "/fr/blog" : "/blog";
}

/**
 * "Keep reading": hand-picked related posts first, then siblings in the same
 * hub, then anything else, up to `max`. Only live posts that exist in this
 * locale. Every guide therefore links to about six siblings automatically.
 */
export function relatedFor(post: PostMeta, locale: Locale, max = 6): PostMeta[] {
  const live = postsIn(locale).filter((p) => p.id !== post.id);
  const picked: PostMeta[] = [];
  const add = (p?: PostMeta) => {
    if (p && !picked.includes(p) && picked.length < max) picked.push(p);
  };
  for (const id of post.related) add(live.find((p) => p.id === id));
  for (const p of live) if (post.hub && p.hub === post.hub) add(p);
  for (const p of live) add(p);
  return picked;
}

export const SITE = "https://sendletter.app";
