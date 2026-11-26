// The topical map. One registry drives hub pages, breadcrumbs, related-guide
// blocks and footer links, so a new guide gets its internal links by being
// added here (via its JSON file) and nowhere else.
//
// Structure (see scripts/topical/README.md):
//   centre      "Mail a letter in Canada: price, stamps, and sending it for you"
//   axial hubs  the main topic areas around the centre
//   satellites  further out, kept small
//   guides      one search question each, under exactly one hub

export type HubId = "postage" | "send-online" | "from-abroad" | "everyday" | "legal" | "api";

export type Hub = {
  id: HubId;
  /** URL segment under /guides/. */
  slug: string;
  kind: "axial" | "satellite";
  title: string;
  /** Meta description, 70-155 characters. */
  description: string;
  /** Hub-page opening paragraphs. Plain text; the guide list is generated. */
  intro: string[];
};

export const HUBS: Hub[] = [
  {
    id: "postage",
    slug: "postage-and-stamps",
    kind: "axial",
    title: "Postage and stamps in Canada",
    description:
      "Current Canada Post letter rates, how many stamps a letter needs, what Permanent stamps are worth, and what happens when postage falls short.",
    intro: [
      "Most mail problems in Canada come down to one question: how much postage does this envelope need? The answer depends on weight, size, and whether the postal code is on it.",
      "These guides use Canada Post's own published prices (the consumer price guide, updated September 7, 2026) and show the arithmetic, so you can check any figure yourself.",
    ],
  },
  {
    id: "send-online",
    slug: "send-a-letter-online",
    kind: "axial",
    title: "Sending a letter online",
    description:
      "How to mail a single letter without a printer, envelope or stamp: what an online letter service does, what it costs, and when it is worth it.",
    intro: [
      "Sometimes you need to put one letter in the mail and have none of the supplies: no printer, no envelope, no stamp, no time for the post office.",
      "These guides explain what an online print-and-mail service does with your document, what it costs next to doing it yourself, and the practical limits worth knowing before you order.",
    ],
  },
  {
    id: "from-abroad",
    slug: "mail-to-canada-from-abroad",
    kind: "axial",
    title: "Mailing to Canada from abroad",
    description:
      "Sending a letter to a Canadian address from another country: how to address it, why a Canadian stamp is not an option, and how to avoid a return.",
    intro: [
      "If you live outside Canada, two things get in the way: you cannot easily buy Canadian stamps, and Canadian addresses follow conventions that foreign forms often break.",
      "These guides cover the address format, the postal code, the stamp problem, and a route that needs no stamp at all. sendletter mails only to Canadian addresses; the return address can be entered as free text.",
    ],
  },
  {
    id: "everyday",
    slug: "everyday-letters",
    kind: "axial",
    title: "Everyday letters worth mailing",
    description:
      "Complaints, cancellations and other letters where paper helps: what to put in them, how to keep proof, and how to mail them.",
    intro: [
      "Most people who need to mail a letter are not writing to a friend. They are cancelling something, complaining about something, or putting a request on the record.",
      "These guides cover what such a letter should say and how to send it so you can show what you sent and when. They are practical guidance, not legal advice; where a contract or a statute sets a rule, that rule wins.",
    ],
  },
  {
    id: "legal",
    slug: "legal-and-formal-notices",
    kind: "satellite",
    title: "Legal and formal notices by mail",
    description:
      "When ordinary letter mail is enough for a formal notice, when you need Registered Mail, and what each costs. General information, not legal advice.",
    intro: [
      "Formal notices raise a different question from ordinary letters: not just whether the letter arrives, but whether you can prove it did.",
      "These guides compare what ordinary mail and Registered Mail each give you, with Canada Post's published prices. They are general information, not legal advice; the rules that apply to your situation come from the statute, tribunal or contract involved.",
    ],
  },
  {
    id: "api",
    slug: "print-and-mail-api",
    kind: "satellite",
    title: "Print-and-mail API",
    description:
      "Send physical letters from software in Canada, from as low as $1.69 a letter: idempotency, test keys, bulk sending, volume pricing and how it compares.",
    intro: [
      "Some mail is sent by software, not by a person: statements, notices, renewals. These guides cover when paper is the right channel and how to send it programmatically.",
      "By API, letters cost as low as $1.69 all in (postage included) with automatic volume pricing and no monthly fee. The guides explain the pieces that matter in practice: safe retries, test keys, bulk sending without rate limits, and how sendletter compares with the larger platforms.",
    ],
  },
];

export const HUBS_BY_ID = new Map(HUBS.map((h) => [h.id, h]));

export const getHubBySlug = (slug: string) => HUBS.find((h) => h.slug === slug);

export const hubPath = (h: Hub) => `/guides/${h.slug}`;

// ── Guide content (src/content/guides/*.json) ──

export type Block =
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { table: { headers: string[]; rows: string[][] } }
  | { note: string };

export type GuideData = {
  id: string;
  hub: HubId;
  /** Publishing wave. A guide is live once wave <= RELEASED_WAVE (lib/blog.ts). */
  wave: number;
  /**
   * Live now, regardless of wave. Used to release one topic (the API hub) without
   * releasing the unrelated waves around it. The wave stays for measurement.
   */
  live?: boolean;
  slug: string;
  /** 50 characters or fewer. */
  title: string;
  /** 70-155 characters. */
  description: string;
  keywords: string[];
  published: string;
  updated?: string;
  /** The direct answer, 40-60 words. Shown first, lifted by snippets. */
  answer: string;
  sections: { h2: string; blocks: Block[] }[];
  /** External facts are cited. At least one. */
  sources: { label: string; url: string }[];
  /** Hand-picked related guide ids, listed before same-hub siblings. */
  related?: string[];
};
