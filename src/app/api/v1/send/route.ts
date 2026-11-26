import { validateApiKey, ApiAuthError } from "@/lib/api-auth";
import { checkRate, rateHeaders } from "@/lib/rate-limit";
import { validIdempotencyKey } from "@/lib/idempotency";
import { DbConnectionError } from "@/lib/db";
import { createWithIdempotency, errJson } from "@/lib/letter-create";
import { readJsonObject } from "@/lib/api-route";

// POST /api/v1/letters (alias: /api/v1/send). The work is in lib/letter-create.ts,
// which the batch endpoint shares.
export async function POST(req: Request) {
  let rateHdrs: Record<string, string> = {};
  try {
    const caller = await validateApiKey(req);

    const rate = checkRate(caller.keyId);
    rateHdrs = rateHeaders(rate);
    if (!rate.ok) return errJson(429, "Too many requests. Slow down and retry after the delay in Retry-After.", "rate_limited", {}, rateHdrs);

    const parsed = await readJsonObject(req, rateHdrs);
    if (!parsed.ok) return parsed.res;
    const body = parsed.body;

    const key = req.headers.get("idempotency-key");
    if (key !== null && !validIdempotencyKey(key)) {
      return errJson(400, "Idempotency-Key must be 1 to 255 printable characters with no spaces (a UUID works well).", "invalid_idempotency_key", {}, rateHdrs);
    }
    const res = await createWithIdempotency(caller, body, key);
    for (const [k, v] of Object.entries(rateHdrs)) res.headers.set(k, v);
    return res;
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return errJson(error.status, error.message, error.code, {}, rateHdrs);
    }
    // 503, not 401 or 500: the request was well-formed and the credential may
    // be perfectly good — our datastore is down. Retryable, and says so.
    if (error instanceof DbConnectionError) {
      console.error("API send: database unreachable:", error.message);
      return errJson(503, "Service temporarily unavailable. Please retry.", "service_unavailable", {}, { ...rateHdrs, "Retry-After": "30" });
    }
    console.error("API send error:", error);
    return errJson(500, "Internal server error", "internal_error", {}, rateHdrs);
  }
}
