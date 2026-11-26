import { createHash, randomBytes } from "crypto";
import { getDb } from "./db";

export type ApiKeyMode = "live" | "test";

/** Live keys mail real letters and bill real money. Test keys do neither. */
export function generateApiKey(mode: ApiKeyMode = "live"): { raw: string; hash: string; prefix: string } {
  const bytes = randomBytes(32);
  const raw = `sl_${mode}_${bytes.toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 16) + "...";
  return { raw, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export type ApiCaller = { accountId: string; keyId: string; livemode: boolean };

// Refresh last_used_at at most this often, so reading a key is not a write on every request.
const LAST_USED_EVERY_MS = 5 * 60 * 1000;

export async function validateApiKey(req: Request): Promise<ApiCaller> {
  const auth = req.headers.get("authorization");
  const m = auth?.match(/^Bearer (sl_(live|test)_[0-9a-f]+)$/);
  if (!m) throw new ApiAuthError(401, "Missing or invalid API key", "invalid_api_key");

  const key = m[1];
  const livemode = m[2] === "live";
  const hash = hashApiKey(key);

  // Note: a DbConnectionError from any of these queries propagates out of this
  // function on purpose. The caller maps it to 503 — telling an integrator
  // their key is invalid when the database is down sends them off to rotate a
  // perfectly good credential.
  const db = getDb();
  const { data } = await db
    .from("sendletter_api_keys")
    .select("id, account_id, last_used_at")
    .eq("key_hash", hash)
    .eq("is_active", true)
    .single();

  if (!data) throw new ApiAuthError(401, "Invalid API key", "invalid_api_key");

  // A test key needs no card: it never bills. A live key does.
  if (livemode) {
    const { data: account } = await db
      .from("sendletter_accounts")
      .select("has_payment_method")
      .eq("id", data.account_id)
      .single();
    if (!account?.has_payment_method) {
      throw new ApiAuthError(402, "No payment method on file. Add a card at https://sendletter.app/account/developers", "payment_method_required");
    }
  }

  const last = data.last_used_at ? Date.parse(data.last_used_at) : 0;
  if (Date.now() - last > LAST_USED_EVERY_MS) {
    await db.from("sendletter_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  }

  return { accountId: data.account_id, keyId: data.id, livemode };
}

export class ApiAuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "unauthorized") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
