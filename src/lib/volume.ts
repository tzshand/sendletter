// Estimates built on the volume curve (volume-curve.ts) and the quote engine
// (pricing.ts): what a month of API mail costs. Pure, no I/O. Used by the docs
// page, GET /api/v1/pricing and the calculator on the pricing post.

import { quote, type LetterSize } from "./pricing";
import { VOLUME, volumeBaseCents, volumeTable } from "./volume-curve";

export { VOLUME, volumeBaseCents, volumeTable };

export type VolumeEstimateInput = {
  lettersPerMonth: number;
  pages: number;
  size: LetterSize;
  colour: boolean;
  duplex: boolean;
};

/**
 * What a month of mailing costs. Two numbers matter:
 *  - steady state: a sender who keeps up this volume pays the fee for their
 *    volume on every letter (the window always holds about that many letters);
 *  - first 30 days: starting from zero, the letters climb down the curve.
 */
export function estimateVolume(input: VolumeEstimateInput) {
  const n = Math.max(1, Math.floor(input.lettersPerMonth));
  const mk = (prior: number) =>
    quote({ pages: input.pages, size: input.size, colour: input.colour, duplex: input.duplex, channel: "api", priorMailings: prior });

  const listLetter = quote({ pages: input.pages, size: input.size, colour: input.colour, duplex: input.duplex, channel: "api" });
  // A letter too long for one envelope is several mailings, and each one counts toward volume.
  const k = listLetter.mailings.length;
  const steadyLetter = mk(n * k - 1);

  // Starting from zero: walk down the curve letter by letter until the floor, then every
  // remaining letter costs the same, so there is no need to loop to a million.
  let firstMonth = 0;
  let mailings = 0;
  let sent = 0;
  while (sent < n && mailings < VOLUME.fullDiscountAt) {
    const q = mk(mailings);
    firstMonth += q.totalCents;
    mailings += q.mailings.length;
    sent++;
  }
  if (sent < n) firstMonth += (n - sent) * mk(Math.max(mailings, VOLUME.fullDiscountAt)).totalCents;

  return {
    letters_per_month: n,
    list_letter_cents: listLetter.totalCents,
    steady_state_letter_cents: steadyLetter.totalCents,
    steady_state_month_cents: steadyLetter.totalCents * n,
    steady_state_saving_pct: Math.round((1 - steadyLetter.totalCents / listLetter.totalCents) * 100),
    first_30_days_cents: firstMonth,
    first_30_days_average_cents: Math.round(firstMonth / n),
    mailings_per_letter: listLetter.mailings.length,
  };
}

/**
 * The lowest all-in price of a letter by API: one black-and-white page in a #10
 * envelope, one stamp, at the volume floor (100 or more mailings in 30 days):
 * $1.69. Derived, never typed, so every "as low as" in the docs, the pricing
 * post and the guides stays in step with the rates. A test checks the guides.
 */
export const API_FROM_ALL_IN_CENTS = quote({
  pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: VOLUME.fullDiscountAt - 1,
}).totalCents;
