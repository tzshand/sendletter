import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { generateApiKey, type ApiKeyMode } from "@/lib/api-auth";

// Generate a new API key. Body: { "mode": "live" | "test" } (default live).
// Replaces the previous active key of the same mode: a customer has at most one
// live and one test key at a time. The key is shown once, in this response.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const mode: ApiKeyMode = body?.mode === "test" ? "test" : "live";

  const db = getDb();

  // Revoke any existing active key of this mode
  await db
    .from("sendletter_api_keys")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("account_id", session.accountId)
    .eq("livemode", mode === "live")
    .eq("is_active", true);

  const { raw, hash, prefix } = generateApiKey(mode);

  const { error: dbError } = await db
    .from("sendletter_api_keys")
    .insert({
      account_id: session.accountId,
      key_hash: hash,
      key_prefix: prefix,
      livemode: mode === "live",
    });

  if (dbError) {
    console.error("API key creation failed:", dbError);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  // Return raw key — only shown once
  return NextResponse.json({ key: raw, prefix, mode });
}

// Active keys (prefix only): one live, one test.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await getDb()
    .from("sendletter_api_keys")
    .select("key_prefix, created_at, livemode, last_used_at")
    .eq("account_id", session.accountId)
    .eq("is_active", true);

  const keys = (data ?? []) as { key_prefix: string; created_at: string; livemode: boolean; last_used_at: string | null }[];
  const pick = (live: boolean) => keys.find((k) => k.livemode === live) ?? null;
  // `key` is the live key, as before; `test` is new.
  return NextResponse.json({ key: pick(true), test: pick(false) });
}
