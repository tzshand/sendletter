// Per-origin "mail to Canada from X" pages.
//
// The design constraint that shapes this whole type: Google's scaled content
// abuse policy explicitly names translating one article into many languages to
// multiply page count. What keeps these pages legitimate is that each one
// carries information that is TRUE ONLY OF THAT ORIGIN — how that country's own
// address conventions break a Canadian address, worked through with a real
// example in both formats. Nothing here is a template substitution of prose.
//
// If you add a locale, do not fill these fields by translating an existing one.
// The address example in particular has to be genuinely of that country, or the
// page has no reason to exist.

export type AddressBlock = {
  /** Caption above the block, in the page's language. */
  label: string;
  lines: string[];
};

export type OriginPage = {
  /** Stable key, independent of language. */
  id: string;
  /** URL segment and hreflang value. */
  lang: string;
  /** Full BCP-47 tag for hreflang, where it differs from `lang`. */
  hreflang: string;
  /** Localised URL slug. */
  slug: string;
  /** Reading direction — Arabic, Persian, Hebrew and Urdu render RTL. */
  dir?: "rtl";
  /** English name of the origin market, for our own reference only. */
  market: string;
  /**
   * Set on languages nobody on our side can read well enough to verify. The
   * page renders a correction invitation, and this flags it for review when a
   * speaker is available. Honesty about it costs nothing; a silent error on a
   * page live for a year costs more.
   */
  reviewNeeded?: boolean;

  title: string;
  description: string;
  keywords: string[];

  /** Opening answer. Carries the whole point in two or three sentences. */
  lede: string;
  /** What this country's own convention does to a Canadian address. */
  addressProblem: string;
  /** An address as written locally, and the same address Canada-style. */
  localExample: AddressBlock;
  canadianExample: AddressBlock;
  /** Ordered conversion steps, specific to this origin's habits. */
  conversionSteps: string[];
  /** Script/transliteration guidance. Omit for Latin-script origins. */
  scriptNote?: string;
  /** Where this community actually is in Canada — the destination context. */
  diaspora: string;
  /** Realistic transit expectation from this origin. */
  transit: string;
  /** The undeliverable-mail warning, in the page's language. */
  returnWarning: string;
  faq: { q: string; a: string }[];

  /** Localised interface strings. */
  ui: {
    addressHeading: string;
    stepsHeading: string;
    localLabel: string;
    canadaLabel: string;
    scriptHeading: string;
    deliveryHeading: string;
    warningHeading: string;
    faqHeading: string;
    ctaTitle: string;
    ctaBody: string;
    ctaButton: string;
    hubLink: string;
    otherLanguages: string;
  };
};
