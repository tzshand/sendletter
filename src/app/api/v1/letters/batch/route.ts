import { NextResponse } from "next/server";
import { withApi, apiError, readJsonObject } from "@/lib/api-route";
import { validIdempotencyKey } from "@/lib/idempotency";
import { createWithIdempotency, MAX_BATCH } from "@/lib/letter-create";

// POST /api/v1/letters/batch
//
// Send many letters in one request. A batch counts as ONE request against your
// rate limit, however many letters it holds, which is how to send in bulk without
// ever being rate limited. Each letter is created exactly as POST /api/v1/letters
// would create it (same validation, volume pricing, daily limit, webhooks), one
// after another, so letter 40 of a batch is priced after letters 1 to 39.
//
//   Idempotency-Key (required): the batch's key. Item i is created under the key
//   "<key>:<i>", so re-sending the same batch after a timeout or a crash creates
//   only the letters that were not created the first time, and replays the rest.
//
// The response is 200 with a result per letter, in order. A letter that fails
// (bad address, daily limit reached, ...) does not stop the others.

/** Stop starting new letters after this long, so the request answers before a proxy gives up. */
const TIME_BUDGET_MS = 45_000;

type Result =
  | { index: number; status: "created" | "replayed"; letter: unknown }
  | { index: number; status: "error"; http_status: number; code: string; error: string }
  | { index: number; status: "not_processed"; code: "batch_time_budget"; error: string };

export async function POST(req: Request) {
  return withApi(req, async (caller) => {
    const key = req.headers.get("idempotency-key");
    if (key === null) {
      return apiError(400, "Idempotency-Key is required on a batch. Item i is created under \"<key>:<i>\", so the same batch can be re-sent safely.", "idempotency_key_required");
    }
    if (!validIdempotencyKey(key) || key.length > 240) {
      return apiError(400, "Idempotency-Key must be 1 to 240 printable characters with no spaces (a UUID works well).", "invalid_idempotency_key");
    }

    const parsed = await readJsonObject(req);
    if (!parsed.ok) return parsed.res;
    const letters = parsed.body.letters;
    if (!Array.isArray(letters) || letters.length === 0) {
      return apiError(400, `letters must be a non-empty array (up to ${MAX_BATCH} letters per batch)`, "invalid_batch");
    }
    if (letters.length > MAX_BATCH) {
      return apiError(400, `A batch holds at most ${MAX_BATCH} letters; send ${Math.ceil(letters.length / MAX_BATCH)} batches (one request each) instead.`, "batch_too_large");
    }

    const started = Date.now();
    const results: Result[] = [];
    for (let i = 0; i < letters.length; i++) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        results.push({ index: i, status: "not_processed", code: "batch_time_budget", error: "Not started: the batch ran out of time. Send the same batch again with the same Idempotency-Key to create the rest." });
        continue;
      }
      const item = letters[i];
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        results.push({ index: i, status: "error", http_status: 400, code: "invalid_body", error: "Each letter must be an object" });
        continue;
      }
      let res: Response;
      try {
        res = await createWithIdempotency(caller, item as Record<string, unknown>, `${key}:${i}`);
      } catch (e) {
        // A dead database must not be reported as a bad letter: stop here and let the caller retry the batch.
        if (e instanceof Error && e.name === "DbConnectionError") throw e;
        console.error("batch item failed:", e);
        results.push({ index: i, status: "error", http_status: 500, code: "internal_error", error: "Internal error creating this letter. Re-send the batch; created letters are not duplicated." });
        continue;
      }
      const j = await res.json().catch(() => ({}));
      if (res.status === 200) {
        results.push({ index: i, status: res.headers.get("idempotent-replayed") === "true" ? "replayed" : "created", letter: j });
      } else {
        results.push({ index: i, status: "error", http_status: res.status, code: String(j.code ?? "error"), error: String(j.error ?? "Failed") });
        // Once the daily limit is hit every later letter would fail the same way: say so once and stop spending time.
        if (j.code === "daily_limit_exceeded" || j.code === "payment_failed") {
          for (let k = i + 1; k < letters.length; k++) {
            results.push({ index: k, status: "error", http_status: res.status, code: String(j.code), error: String(j.error) });
          }
          break;
        }
      }
    }

    return NextResponse.json({
      object: "batch",
      total: letters.length,
      created: results.filter((r) => r.status === "created").length,
      replayed: results.filter((r) => r.status === "replayed").length,
      failed: results.filter((r) => r.status === "error").length,
      not_processed: results.filter((r) => r.status === "not_processed").length,
      results,
    });
  });
}
