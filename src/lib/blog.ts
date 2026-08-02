// Blog post metadata.
//
// Kept separate from the post bodies so the index page, sitemap, and IndexNow
// submitter can all read the list without pulling in every post's JSX.

export type PostMeta = {
  slug: string;
  title: string;
  /** Meta description and the index-page blurb. Aim for ~155 characters. */
  description: string;
  /** ISO date. Also drives sitemap lastModified and BlogPosting schema. */
  published: string;
  updated?: string;
  /** Where the single end-of-post call to action points. */
  cta: "home" | "api";
  keywords: string[];
  /** Slugs of one or two sibling posts, rendered as further reading. */
  related: string[];
};

export const POSTS: PostMeta[] = [
  {
    slug: "how-to-send-a-letter-online-in-canada",
    title: "How to Send a Letter Online in Canada (2026)",
    description:
      "Three ways to get a physical letter into the mail without going to the post office, what each costs in 2026, and how to tell which one you actually need.",
    published: "2026-08-02",
    cta: "home",
    keywords: [
      "send a letter online",
      "mail a letter online canada",
      "send a letter without going to the post office",
      "how to send a letter online",
    ],
    related: ["what-it-costs-to-mail-a-letter-in-canada", "can-you-mail-a-legal-notice-online"],
  },
  {
    slug: "what-it-costs-to-mail-a-letter-in-canada",
    title: "What It Actually Costs to Mail a Letter in Canada in 2026",
    description:
      "A single domestic stamp is $1.44 in 2026. Here is the full loaded cost of mailing a letter yourself, and the point where paying a service becomes rational.",
    published: "2026-08-02",
    cta: "home",
    keywords: [
      "canada post letter rate 2026",
      "cost to mail a letter in canada",
      "canada post stamp price",
      "how much is a stamp in canada",
    ],
    related: ["how-to-send-a-letter-online-in-canada", "mail-a-letter-to-canada-from-abroad"],
  },
  {
    slug: "can-you-mail-a-legal-notice-online",
    title: "Can You Mail a Legal Notice or Demand Letter Online?",
    description:
      "Usually not with ordinary lettermail. If you need to prove the recipient received it, you need Registered Mail or a process server — here is how to tell which applies.",
    published: "2026-08-02",
    cta: "home",
    keywords: [
      "demand letter registered mail",
      "formal notice quebec mise en demeure",
      "serve notice by mail canada",
      "proof of delivery letter canada",
    ],
    related: ["how-to-send-a-letter-online-in-canada", "what-it-costs-to-mail-a-letter-in-canada"],
  },
  {
    slug: "send-physical-mail-from-your-app",
    title: "Sending Physical Mail From Your App: A Practical API Guide",
    description:
      "When postal mail beats email, what a print-and-mail API request actually looks like, and the four gotchas that bite teams shipping physical mail for the first time.",
    published: "2026-08-02",
    cta: "api",
    keywords: [
      "print and mail api",
      "send letter api",
      "physical mail api canada",
      "programmatic direct mail",
      "lob alternative canada",
    ],
    related: ["how-to-send-a-letter-online-in-canada", "can-you-mail-a-legal-notice-online"],
  },
  {
    slug: "mail-a-letter-to-canada-from-abroad",
    title: "How to Mail a Letter to Canada From Abroad",
    description:
      "Canadian addresses have a strict format, and getting it wrong is the most common reason inbound mail goes astray. Here is the format, plus what international postage costs.",
    published: "2026-08-02",
    cta: "home",
    keywords: [
      "mail a letter to canada",
      "canadian address format",
      "how to write a canadian address",
      "send mail to canada from usa",
    ],
    related: ["what-it-costs-to-mail-a-letter-in-canada", "how-to-send-a-letter-online-in-canada"],
  },
];

export function getPost(slug: string): PostMeta | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export const BLOG_BASE = "https://sendletter.app/blog";
