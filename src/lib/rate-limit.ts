// A small per-key request limiter for the API: a sliding one-minute window held
// in memory. It protects against a runaway loop, not a determined attacker: each
// server instance counts for itself, so with several instances the effective
// limit is a multiple. Spend limits (lib/api-limits.ts), not this, are what cap
// what a key can cost.

export const RATE_LIMIT = { perMinute: 120, windowMs: 60_000 };

const hits = new Map<string, number[]>();

export type RateResult = { ok: boolean; limit: number; remaining: number; retryAfterSec: number };

export function checkRate(keyId: string, now = Date.now()): RateResult {
  const since = now - RATE_LIMIT.windowMs;
  const recent = (hits.get(keyId) ?? []).filter((t) => t > since);
  if (recent.length >= RATE_LIMIT.perMinute) {
    hits.set(keyId, recent);
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + RATE_LIMIT.windowMs - now) / 1000));
    return { ok: false, limit: RATE_LIMIT.perMinute, remaining: 0, retryAfterSec };
  }
  recent.push(now);
  hits.set(keyId, recent);
  // Keep the map from growing without bound across many keys.
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => t > since)) hits.delete(k);
  return { ok: true, limit: RATE_LIMIT.perMinute, remaining: RATE_LIMIT.perMinute - recent.length, retryAfterSec: 0 };
}

export function rateHeaders(r: RateResult): Record<string, string> {
  const h: Record<string, string> = {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
  };
  if (!r.ok) h["Retry-After"] = String(r.retryAfterSec);
  return h;
}

export function resetRateLimits() {
  hits.clear();
}
