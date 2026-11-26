// Unit economics for a letter: what it earns after what it costs. Internal only:
// nothing here is shown to customers. It exists so the volume discount
// (volume-curve.ts) is checked against real costs, by tests and by
// scripts/margin-report.mts, instead of trusted.
//
// Costs are estimates (see the CALIBRATE notes). Postage is at cost and nets to
// zero; what is left is the mailing fee, the envelope and the printing, less
// materials and card fees.

import type { LetterSize, Quote } from "./pricing";

export const COSTS = {
  /** Stripe card fee: 2.9% of the amount plus a fixed $0.30 per charge. */
  stripePct: 0.029,
  stripeFixedCents: 30,
  /** CALIBRATE: what an envelope costs us, by size (cents). */
  envelopeCents: { standard: 4, large: 15, legal: 30 } as Record<LetterSize, number>,
  /** CALIBRATE: laser printing per page, toner and paper (cents). */
  printCentsPerPage: { bw: 2, colour: 8 },
};

/** The least we will accept to net on the cheapest letter at any volume (cents). */
export const MIN_NET_CENTS = 25;

export type Economics = {
  revenueCents: number;
  postageCents: number;
  materialsCents: number;
  stripeCents: number;
  netCents: number;
  /** Net as a share of revenue. */
  netPct: number;
};

/**
 * @param lettersPerCharge how many letters share one Stripe charge, which is how
 *   the $0.30 fixed fee is spread. A first order is charged on its own (1); a
 *   monthly invoice shares one charge across the month's letters.
 */
export function letterEconomics(q: Quote, lettersPerCharge = 1): Economics {
  const revenueCents = q.totalCents;
  const postageCents = q.postageCents;
  const perPage = q.colour ? COSTS.printCentsPerPage.colour : COSTS.printCentsPerPage.bw;
  const materialsCents = q.mailings.length * COSTS.envelopeCents[q.size] + q.pages * perPage;
  const stripeCents = revenueCents * COSTS.stripePct + COSTS.stripeFixedCents / Math.max(1, lettersPerCharge);
  const netCents = revenueCents - postageCents - materialsCents - stripeCents;
  return { revenueCents, postageCents, materialsCents, stripeCents, netCents, netPct: netCents / revenueCents };
}
