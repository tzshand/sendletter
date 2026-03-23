import { createHash, randomBytes } from "crypto";
import { getSupabase } from "./supabase";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const bytes = randomBytes(32);
  const raw = `sl_live_${bytes.toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 16) + "...";
  return { raw, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(
  req: Request
): Promise<{ accountId: string; keyId: string }> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer sl_live_")) {
    throw new ApiAuthError(401, "Missing or invalid API key");
  }

  const key = auth.slice(7); // Remove "Bearer "
  const hash = hashApiKey(key);

  const supabase = getSupabase();
  const { data } = await supabase
    .from("sendletter_api_keys")
    .select("id, account_id")
    .eq("key_hash", hash)
    .eq("is_active", true)
    .single();

  if (!data) throw new ApiAuthError(401, "Invalid API key");

  const { data: account } = await supabase
    .from("sendletter_accounts")
    .select("has_payment_method")
    .eq("id", data.account_id)
    .single();

  if (!account?.has_payment_method) {
    throw new ApiAuthError(
      402,
      "No payment method on file. Add a card at https://sendletter.app/profile"
    );
  }

  return { accountId: data.account_id, keyId: data.id };
}

export class ApiAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
