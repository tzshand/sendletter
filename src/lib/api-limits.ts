// Daily spend limits and the trailing-30-day mailing count that drives the volume
// discount. Both read the usage table, which has one row per billable API letter.

import { getDb } from "./db";
import { VOLUME } from "./volume-curve";

/** Default for a new account, in cents. A customer can lower their limit or ask us to raise the cap. */
export const DEFAULT_DAILY_LIMIT_CENTS = 50_000;
export const MAX_DAILY_LIMIT_CENTS = 100_000_000; // $1,000,000: a sanity bound on what a customer may type

// Offset of America/Toronto from UTC at an instant, in ms.
function torontoOffsetMs(at: Date): number {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Midnight (America/Toronto) at the start of the calendar day containing `now`, as a UTC instant. */
export function torontoDayStart(now = new Date()): Date {
  const off = torontoOffsetMs(now);
  const local = new Date(now.getTime() + off); // wall-clock time, read with the UTC getters
  const midnightWall = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  // Midnight's own offset can differ from now's across a DST change; correct once.
  const guess = midnightWall - off;
  return new Date(midnightWall - torontoOffsetMs(new Date(guess)));
}

/** Midnight (America/Toronto) on the first of the month containing `now`. */
export function torontoMonthStart(now = new Date()): Date {
  const local = new Date(now.getTime() + torontoOffsetMs(now));
  const firstWall = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
  const guess = firstWall - torontoOffsetMs(now);
  return new Date(firstWall - torontoOffsetMs(new Date(guess)));
}

/** What this account has been billed for since midnight Toronto time, live letters only, cancellations excluded. */
export async function spentToday(accountId: string, now = new Date()): Promise<number> {
  const { data } = await getDb()
    .from("sendletter_api_usage")
    .select("amount_cents")
    .eq("account_id", accountId)
    .gte("created_at", torontoDayStart(now).toISOString())
    .isNull("voided_at");
  return (data ?? []).reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0);
}

export async function getLimits(accountId: string): Promise<{ limitCents: number; capCents: number }> {
  const { data } = await getDb()
    .from("sendletter_accounts")
    .select("daily_spend_limit_cents, daily_spend_cap_cents")
    .eq("id", accountId)
    .single();
  const cap = Number(data?.daily_spend_cap_cents ?? DEFAULT_DAILY_LIMIT_CENTS);
  const limit = Math.min(Number(data?.daily_spend_limit_cents ?? DEFAULT_DAILY_LIMIT_CENTS), cap);
  return { limitCents: limit, capCents: cap };
}

/** Mailings in the account's trailing 30 days: the volume the discount is read from. */
export async function recentMailings(accountId: string, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - VOLUME.windowDays * 86_400_000).toISOString();
  const { data } = await getDb()
    .from("sendletter_api_usage")
    .select("mailings")
    .eq("account_id", accountId)
    .gte("created_at", since)
    .isNull("voided_at");
  return (data ?? []).reduce((s: number, r: { mailings: number | null }) => s + (r.mailings ?? 1), 0);
}
