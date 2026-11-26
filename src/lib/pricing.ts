// Usage-based pricing. One pure module, used by the UI (live price), checkout
// and the API, so a price shown is always a price charged. The server recomputes
// every quote from validated inputs; nothing priced here is ever taken from the
// browser.
//
//   total = (base + envelope) x mailings + pages x page rate + stamps x stamp
//
// Postage is passed through at cost: stamps are Permanent(TM) coil stamps, each
// worth $1.24, and we charge exactly what the stamps cost. How many stamps a
// mailing needs comes from Canada Post's published Lettermail prices and an
// estimate of the mailing's weight (see STOCK, which should be calibrated by
// weighing real sheets and envelopes). Everything is integer cents.
//
// Rates last checked against canadapost.ca consumer prices (effective Jan 13,
// 2025; still current in the Sept 7, 2026 sheet). A $2.00 stamp is proposed for
// 2027 (not confirmed): when it lands, change stampCents and the postage tiers
// here, bump RATES_VERSION, and nothing else needs to move.

import { VOLUME, volumeBaseCents } from "./volume-curve";

export type LetterSize = "standard" | "large" | "legal";
export type Channel = "web" | "api";

export const RATES_VERSION = "2026-11-26";

/** Most pages in one order. */
export const MAX_PAGES = 200;
/** Custom-editor and .docx letters are rasterised in the browser, which gets heavy. */
export const RASTER_MAX_PAGES = 40;
/** Upload size limit. */
export const MAX_FILE_BYTES = 40 * 1024 * 1024;

export const RATES = {
  /** One Permanent(TM) coil stamp: the standard 0-30 g letter rate. */
  stampCents: 124,
  /**
   * Per mailing. Web is set so the cheapest letter (one B&W page, one stamp) is
   * $3.49 all in; API orders have more of the work automated.
   */
  baseCents: { web: 200, api: VOLUME.listCents } as Record<Channel, number>,
  /** Per printed page (a side). Double-sided does not change the page count. */
  pageCents: { colour: 50, bw: 15 },
  /** Per envelope or mailer. Flat mailers cost more than a #10. */
  envelopeCents: { standard: 10, large: 25, legal: 40 } as Record<LetterSize, number>,
  /** Canada Post domestic Lettermail, coil/booklet stamps (cents). */
  postage: {
    standard30: 124, // standard-size envelope, 0-30 g
    standard50: 175, // standard-size envelope, 30-50 g
    other: [
      [100, 261],
      [200, 429],
      [300, 598],
      [400, 685],
      [500, 736],
    ] as [number, number][], // non-standard / oversize, up to N g
  },
};

/** Lettermail stops at 500 g (and 20 mm); beyond that it must be split. */
export const MAX_MAILING_GRAMS = 500;

// Weight model. Deliberately on the heavy side (90 gsm / 24 lb stock, heavy
// envelopes), then +5%, then rounded UP to whole grams: a stamp too many costs
// a dollar, a stamp too few is postage-due and a failed mailing.
// CALIBRATE: weigh 10 sheets and a few envelopes and adjust.
export const STOCK = {
  sheetGrams: { letter: 5.43, legal: 6.9 },
  envelopeGrams: { standard: 7, large: 18, legal: 25 } as Record<LetterSize, number>,
  margin: 1.05,
};

/** A #10 window envelope comfortably holds about six tri-folded sheets. */
export const TRIFOLD_MAX_SHEETS = 6;

export class PricingError extends Error {}

export type Mailing = {
  index: number;
  /** First and last letter page (1-based) carried by this mailing. */
  pageStart: number;
  pageEnd: number;
  pages: number;
  /** Physical sheets, including the address page when there is one. */
  sheets: number;
  weightGrams: number;
  /** Postage this mailing needs, in cents, before rounding up to whole stamps. */
  requiredPostageCents: number;
  stamps: number;
};

export type QuoteLine = {
  key: "base" | "envelope" | "pages" | "postage";
  qty: number;
  unitCents: number;
  totalCents: number;
};

export type Quote = {
  version: string;
  /** API channel only: where the mailing fee sat on the volume curve (lib/volume.ts). */
  volume?: { priorMailings: number; listBaseCents: number; discountCents: number };
  channel: Channel;
  size: LetterSize;
  colour: boolean;
  duplex: boolean;
  pages: number;
  mailings: Mailing[];
  stamps: number;
  lines: QuoteLine[];
  postageCents: number;
  totalCents: number;
};

const paperOf = (size: LetterSize) => (size === "legal" ? "legal" : "letter");

/** The #10 window envelope carries an address page as its own first side. */
const hasAddressPage = (size: LetterSize) => size === "standard";

function sheetsFor(pages: number, size: LetterSize, duplex: boolean): number {
  const sides = pages + (hasAddressPage(size) ? 1 : 0);
  return duplex ? Math.ceil(sides / 2) : sides;
}

export function weightGrams(size: LetterSize, sheets: number): number {
  const raw = STOCK.envelopeGrams[size] + sheets * STOCK.sheetGrams[paperOf(size)];
  return Math.ceil(raw * STOCK.margin);
}

/** Postage a mailing needs in cents, or null if it is too heavy to be Lettermail. */
export function requiredPostageCents(size: LetterSize, grams: number): number | null {
  const p = RATES.postage;
  if (size === "standard" && grams <= 30) return p.standard30;
  if (size === "standard" && grams <= 50) return p.standard50;
  for (const [maxGrams, cents] of p.other) if (grams <= maxGrams) return cents;
  return null;
}

export const stampsFor = (requiredCents: number) => Math.ceil(requiredCents / RATES.stampCents);

/** Most sheets one mailing of this size can carry. */
export function maxSheetsPerMailing(size: LetterSize): number {
  if (size === "standard") return TRIFOLD_MAX_SHEETS;
  let n = 1;
  while (weightGrams(size, n + 1) <= MAX_MAILING_GRAMS) n++;
  return n;
}

/**
 * Split a letter across as few mailings as the envelope allows, spreading pages
 * evenly (a split is never cheaper than one bigger mailing, so this only
 * happens when one cannot carry the letter).
 */
export function planMailings(pages: number, size: LetterSize, duplex: boolean): Mailing[] {
  const cap = maxSheetsPerMailing(size);
  let k = 1;
  while (k < pages && sheetsFor(Math.ceil(pages / k), size, duplex) > cap) k++;

  const mailings: Mailing[] = [];
  const base = Math.floor(pages / k);
  const extra = pages % k;
  let start = 1;
  for (let i = 0; i < k; i++) {
    const n = base + (i < extra ? 1 : 0);
    const sheets = sheetsFor(n, size, duplex);
    const grams = weightGrams(size, sheets);
    const required = requiredPostageCents(size, grams);
    if (required === null) throw new PricingError("A single page cannot exceed the Lettermail weight limit");
    mailings.push({
      index: i + 1,
      pageStart: start,
      pageEnd: start + n - 1,
      pages: n,
      sheets,
      weightGrams: grams,
      requiredPostageCents: required,
      stamps: stampsFor(required),
    });
    start += n;
  }
  return mailings;
}

export function quote(input: {
  pages: number;
  size: LetterSize;
  colour: boolean;
  duplex: boolean;
  channel: Channel;
  /**
   * API channel: mailings the account already has in its trailing 30 days. When
   * given, each mailing's fee comes off the volume curve (lib/volume.ts). When
   * absent, the list price applies.
   */
  priorMailings?: number;
}): Quote {
  const { pages, size, colour, duplex, channel } = input;
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES) {
    throw new PricingError(`pages must be a whole number from 1 to ${MAX_PAGES}`);
  }
  if (!(size in RATES.envelopeCents)) throw new PricingError("unknown letter size");

  const mailings = planMailings(pages, size, duplex);
  const k = mailings.length;
  const stamps = mailings.reduce((s, m) => s + m.stamps, 0);
  const pageRate = colour ? RATES.pageCents.colour : RATES.pageCents.bw;

  // Volume discount: API only, and only when the caller knows the account's volume.
  const listBase = k * RATES.baseCents[channel];
  let baseTotal = listBase;
  let volume: Quote["volume"];
  if (channel === "api" && input.priorMailings !== undefined) {
    const prior = Math.max(0, Math.floor(input.priorMailings));
    baseTotal = 0;
    for (let j = 1; j <= k; j++) baseTotal += volumeBaseCents(prior + j);
    volume = { priorMailings: prior, listBaseCents: listBase, discountCents: listBase - baseTotal };
  }

  const lines: QuoteLine[] = [
    { key: "base", qty: k, unitCents: Math.round(baseTotal / k), totalCents: baseTotal },
    { key: "envelope", qty: k, unitCents: RATES.envelopeCents[size], totalCents: k * RATES.envelopeCents[size] },
    { key: "pages", qty: pages, unitCents: pageRate, totalCents: pages * pageRate },
    { key: "postage", qty: stamps, unitCents: RATES.stampCents, totalCents: stamps * RATES.stampCents },
  ];

  return {
    version: RATES_VERSION,
    ...(volume ? { volume } : {}),
    channel,
    size,
    colour,
    duplex,
    pages,
    mailings,
    stamps,
    lines,
    postageCents: stamps * RATES.stampCents,
    totalCents: lines.reduce((s, l) => s + l.totalCents, 0),
  };
}

// ── Marketing numbers, derived so they cannot drift from the rates ──

const cheapest = quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "web" });
const colourSingle = quote({ pages: 1, size: "standard", colour: true, duplex: true, channel: "web" });

/**
 * The advertised "From" price: the cheapest letter anyone can actually buy, all
 * in (one black-and-white page in a #10, one stamp): $3.49. It must stay
 * attainable, so never advertise a figure that leaves out postage, which is
 * mandatory (Competition Act drip-pricing rules).
 */
export const FROM_ALL_IN_CENTS = cheapest.totalCents;
/** What a single-page colour tri-fold costs: $3.84. (Black and white is the default; this is the colour price.) */
export const COLOUR_SINGLE_CENTS = colourSingle.totalCents;

export function formatCents(cents: number, lang: "en" | "fr" = "en"): string {
  const s = (cents / 100).toFixed(2);
  return lang === "fr" ? `${s.replace(".", ",")} $` : `$${s}`;
}

// ── Labels ──

export const SIZE_LABELS: Record<string, string> = {
  standard: "Standard (#10 window, folded)",
  large: "Letter (8.5×11 flat, 9×12 envelope)",
  legal: "Legal (8.5×14 flat, 10×15 envelope)",
};

export const SIZE_LABELS_BILINGUAL: Record<string, { en: string; fr: string }> = {
  standard: { en: "Standard (#10, folded)", fr: "Standard (#10, plié)" },
  legal: { en: "Legal (8.5×14 flat)", fr: "Légal (8,5×14 à plat)" },
  large: { en: "Letter (8.5×11 flat)", fr: "Lettre (8,5×11 à plat)" },
};
