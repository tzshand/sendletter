// The public shape of a letter, shared by every endpoint and every webhook event,
// so what an integrator reads from GET is exactly what they were sent.

import type { Quote } from "./pricing";

export type LetterStatus = "queued" | "printed" | "mailed" | "cancelled";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OrderRow = Record<string, any>;

/** Test letters are never printed, so their status is simulated from their age. */
export const TEST_PRINTED_AFTER_MS = 30_000;
export const TEST_MAILED_AFTER_MS = 120_000;

export function letterStatus(row: OrderRow, now = new Date()): LetterStatus {
  if (row.cancelled_at || row.status === "cancelled") return "cancelled";
  if (row.livemode === false) {
    const age = now.getTime() - Date.parse(row.created_at);
    return age >= TEST_MAILED_AFTER_MS ? "mailed" : age >= TEST_PRINTED_AFTER_MS ? "printed" : "queued";
  }
  if (row.status === "mailed" || row.mailed_at) return "mailed";
  if (row.status === "printed" || row.printed_at) return "printed";
  return "queued";
}

export type Warning = { field: string; code: string; message: string };

function address(row: OrderRow, side: "to" | "from") {
  return {
    name: row[`${side}_name`] ?? null,
    line1: row[`${side}_line1`] ?? null,
    line2: row[`${side}_line2`] ?? null,
    city: row[`${side}_city`] ?? null,
    province: row[`${side}_province`] || null,
    postal_code: row[`${side}_postal`] || null,
    country: row[`${side}_country`] || null,
  };
}

export function serializeLetter(row: OrderRow, opts: { now?: Date; warnings?: Warning[] } = {}) {
  const now = opts.now ?? new Date();
  const q = row.price_breakdown as Quote | null;
  const status = letterStatus(row, now);
  const test = row.livemode === false;
  const printedAt = test && status !== "queued" ? new Date(Date.parse(row.created_at) + TEST_PRINTED_AFTER_MS).toISOString() : row.printed_at ?? null;
  const mailedAt = test && status === "mailed" ? new Date(Date.parse(row.created_at) + TEST_MAILED_AFTER_MS).toISOString() : row.mailed_at ?? null;

  return {
    id: row.id as string,
    object: "letter" as const,
    livemode: row.livemode !== false,
    status,
    created_at: row.created_at as string,
    printed_at: printedAt,
    mailed_at: mailedAt,
    cancelled_at: row.cancelled_at ?? null,
    mode: row.letter_mode,
    letter_size: row.letter_size,
    pages: row.page_count,
    mailings: row.mailings ?? q?.mailings?.length ?? 1,
    stamps: row.stamps ?? q?.stamps ?? null,
    colour: row.colour ?? null,
    duplex: row.duplex ?? null,
    currency: "cad",
    amount_cents: row.amount_cents,
    price: q
      ? {
          version: q.version,
          ...(q.volume
            ? { volume: { mailings_in_last_30_days: q.volume.priorMailings, base_fee_list_cents: q.volume.listBaseCents, discount_cents: q.volume.discountCents } }
            : {}),
          lines: q.lines.map((l) => ({ item: l.key, qty: l.qty, unit_cents: l.unitCents, total_cents: l.totalCents })),
        }
      : null,
    to: address(row, "to"),
    from: row.from_lines ? { lines: String(row.from_lines).split("\n") } : address(row, "from"),
    reference: row.reference ?? null,
    metadata: row.metadata ?? {},
    ...(opts.warnings && opts.warnings.length ? { warnings: opts.warnings } : {}),
  };
}

export type Letter = ReturnType<typeof serializeLetter>;
