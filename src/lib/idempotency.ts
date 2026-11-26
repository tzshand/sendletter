// Idempotency for POST /api/v1/letters. A letter is physical: a retried request
// that is not recognised as a retry mails a second one, and a second one cannot
// be recalled. So a request that carries an Idempotency-Key is recorded before
// anything is created, and a repeat of it returns the original response.
//
//  - same key, same request, finished     -> the stored response, replayed
//  - same key, same request, still running -> 409 (retry in a moment)
//  - same key, different request           -> 422 (a key means one request)
//
// Keys are remembered for 7 days.

import { createHash } from "crypto";
import { getDb } from "./db";

export const IDEMPOTENCY_TTL_DAYS = 7;
const KEY_RE = /^[\x21-\x7e]{1,255}$/; // printable ASCII, no spaces, at most 255

export function validIdempotencyKey(key: string): boolean {
  return KEY_RE.test(key);
}

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)]));
  }
  return v;
}

/** A stable fingerprint of a request: the same JSON with keys in any order hashes the same. */
export function hashRequest(route: string, body: unknown): string {
  return createHash("sha256").update(route + "\n" + JSON.stringify(canonical(body))).digest("hex");
}

export type IdemBegin =
  | { kind: "proceed"; recordId: string }
  | { kind: "replay"; status: number; body: unknown }
  | { kind: "reject"; status: number; code: string; message: string; retryAfter?: number };

export async function beginIdempotency(accountId: string, key: string, requestHash: string, now = new Date()): Promise<IdemBegin> {
  const db = getDb();
  const insert = () =>
    db.from("sendletter_idempotency").insert({ account_id: accountId, key, request_hash: requestHash }).select("id").single();

  let { data, error } = await insert();
  if (data) return { kind: "proceed", recordId: data.id };
  if (!error || !/duplicate key/i.test(error.message)) {
    throw new Error(`idempotency insert failed: ${error?.message ?? "unknown"}`);
  }

  const { data: existing } = await db
    .from("sendletter_idempotency")
    .select("id, request_hash, status, response_status, response_body, created_at")
    .eq("account_id", accountId)
    .eq("key", key)
    .single();
  if (!existing) throw new Error("idempotency record vanished");

  // Expired: forget it and treat this as a fresh request.
  if (now.getTime() - Date.parse(existing.created_at) > IDEMPOTENCY_TTL_DAYS * 86_400_000) {
    await db.from("sendletter_idempotency").delete().eq("id", existing.id);
    ({ data, error } = await insert());
    if (data) return { kind: "proceed", recordId: data.id };
    throw new Error(`idempotency re-insert failed: ${error?.message ?? "unknown"}`);
  }

  if (existing.request_hash !== requestHash) {
    return {
      kind: "reject", status: 422, code: "idempotency_key_reuse",
      message: "This Idempotency-Key was already used with a different request. Use a new key for a different letter.",
    };
  }
  if (existing.status === "complete") {
    return { kind: "replay", status: existing.response_status ?? 200, body: existing.response_body };
  }
  return {
    kind: "reject", status: 409, code: "request_in_progress", retryAfter: 2,
    message: "A request with this Idempotency-Key is still being processed. Retry in a moment; do not send it with a new key.",
  };
}

export async function completeIdempotency(recordId: string, status: number, body: unknown, orderId?: string) {
  await getDb()
    .from("sendletter_idempotency")
    .update({ status: "complete", response_status: status, response_body: body, order_id: orderId ?? null })
    .eq("id", recordId);
}

/** The request failed before creating anything: let the caller retry it with the same key. */
export async function releaseIdempotency(recordId: string) {
  await getDb().from("sendletter_idempotency").delete().eq("id", recordId);
}

export async function purgeExpiredIdempotency(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - IDEMPOTENCY_TTL_DAYS * 86_400_000).toISOString();
  const { data } = await getDb().from("sendletter_idempotency").delete().lt("created_at", cutoff).select("id");
  return data?.length ?? 0;
}
