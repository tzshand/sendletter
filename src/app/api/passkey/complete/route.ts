// Finish passkey enrollment: verify the token Canner issued at the end of the
// registration ceremony, stamp the account, and open a session.
//
// The account is resolved by matching the token's subject against the
// canner_auth_user_id we recorded when the ticket was minted. It is NOT taken
// from the request body — a caller who could name their own account id would
// be able to attach their passkey to anyone.

import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getDb, DbConnectionError } from "@/lib/db";
import { verifyCannerToken } from "@/lib/canner-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : null;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    let cannerUserId: string;
    try {
      ({ cannerUserId } = await verifyCannerToken(token));
    } catch (e) {
      console.error("Canner token verification failed:", e);
      return NextResponse.json({ error: "Invalid passkey token" }, { status: 401 });
    }

    const db = getDb();
    const { data: account } = await db
      .from("sendletter_accounts")
      .select("id, email")
      .eq("canner_auth_user_id", cannerUserId)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: "No matching account" }, { status: 404 });
    }

    const { error } = await db
      .from("sendletter_accounts")
      .update({ passkey_enrolled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", account.id);

    if (error) {
      console.error("Failed to stamp passkey_enrolled_at:", error);
      return NextResponse.json({ error: "Could not complete enrollment" }, { status: 500 });
    }

    await createSession(account.id, account.email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DbConnectionError) {
      return NextResponse.json(
        { error: "Temporarily unavailable. Please retry." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("Passkey complete error:", e);
    return NextResponse.json({ error: "Could not complete enrollment" }, { status: 500 });
  }
}
