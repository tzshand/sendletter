import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { generateApiKey } from "@/lib/api-auth";

// Generate a new API key (revokes previous)
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Revoke any existing active keys
  await db
    .from("sendletter_api_keys")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("account_id", session.accountId)
    .eq("is_active", true);

  // Generate new key
  const { raw, hash, prefix } = generateApiKey();

  const { error: dbError } = await db
    .from("sendletter_api_keys")
    .insert({
      account_id: session.accountId,
      key_hash: hash,
      key_prefix: prefix,
    });

  if (dbError) {
    console.error("API key creation failed:", dbError);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  // Return raw key — only shown once
  return NextResponse.json({ key: raw, prefix });
}

// Get current active key info (prefix only)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { data } = await db
    .from("sendletter_api_keys")
    .select("key_prefix, created_at")
    .eq("account_id", session.accountId)
    .eq("is_active", true)
    .single();

  return NextResponse.json({ key: data || null });
}
