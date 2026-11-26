// Automatic volume discount for API mail.
//
// Only the per-mailing fee is discounted. Postage is passed through at cost and
// printing and envelope prices already sit just above their cost, so the mailing
// fee is the one number with room to move. It falls smoothly from the list price
// on a customer's first letter to a floor on their 100th, then stays there:
//
//   fee(n) = floor + (list - floor) x (1 - ln n / ln 100)      for 1 <= n < 100
//   fee(n) = floor                                              for n >= 100
//
// where n is the mailing's place in the account's trailing 30 days (the letters
// already sent in the last 30 days, plus this one). A rolling window, not a
// calendar month, so a steady sender stays at the floor instead of climbing back
// to full price on the 1st.
//
// The floor is chosen so every letter still clears a margin (see lib/margin.ts,
// which tests this): at $0.20 the cheapest one-page letter at the floor is
// $1.69 all in, of which $1.24 is stamp.
//
// Pure functions, no I/O, and no imports: lib/pricing.ts builds on this file, so
// it must not import pricing back. The estimator that needs both is volume.ts.

export const VOLUME = {
  /** List price of the mailing fee (API channel), in cents. */
  listCents: 99,
  /** Mailing fee from the 100th mailing in the window onward, in cents. */
  floorCents: 20,
  /** Mailing in the window at which the floor is reached. */
  fullDiscountAt: 100,
  /** Length of the trailing window. */
  windowDays: 30,
};

/** Mailing fee for the nth mailing (1-based) in the trailing window, in whole cents. */
export function volumeBaseCents(n: number): number {
  const { listCents, floorCents, fullDiscountAt } = VOLUME;
  if (!Number.isFinite(n) || n <= 1) return listCents;
  if (n >= fullDiscountAt) return floorCents;
  return Math.round(floorCents + (listCents - floorCents) * (1 - Math.log(n) / Math.log(fullDiscountAt)));
}

/** The published tier table: the fee at a handful of volumes. */
export function volumeTable(points: number[] = [1, 2, 5, 10, 25, 50, 75, 100]) {
  return points.map((n) => ({
    mailing_number: n,
    base_fee_cents: volumeBaseCents(n),
    discount_pct: Math.round((1 - volumeBaseCents(n) / VOLUME.listCents) * 100),
  }));
}

