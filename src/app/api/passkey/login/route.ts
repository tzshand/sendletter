// Sign in with a passkey.
//
// Two shapes arrive here:
//   1. Passkey-first — no password was typed. The Canner token alone is proof;
//      it is the result of a WebAuthn assertion the browser bound to our origin.
//   2. Step-up — a correct password produced a pending token, and this is the
//      second factor. Both must resolve to the SAME account, or a person who
//      knows one account's password could finish the sign-in with a different
//      account's passkey.

import { NextResponse } from "next/server";
import { createSession, verifyPendingToken } from "@/lib/auth";
import { getDb, DbConnectionError } from "@/lib/db";
import { verifyCannerToken } from "@/lib/canner-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : null;
    const pendingToken = typeof body?.pending_token === "string" ? body.pending_token : null;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    let cannerUserId: string;
    try {
      ({ cannerUserId } = await verifyCannerToken(token));
    } catch (e) {
      console.error("Canner token verification failed:", e);
      return NextResponse.json({ error: "Invalid passkey" }, { status: 401 });
    }

    const db = getDb();
    const { data: account } = await db
      .from("sendletter_accounts")
      .select("id, email")
      .eq("canner_auth_user_id", cannerUserId)
      .maybeSingle();

    if (!account) {
      return NextResponse.json(
        { error: "This passkey is not linked to a sendletter account." },
        { status: 404 },
      );
    }

    // Step-up: the passkey must belong to the account whose password was just
    // accepted. Without this check the gate is decorative.
    if (pendingToken) {
      const pending = await verifyPendingToken(pendingToken);
      if (!pending) {
        return NextResponse.json({ error: "Sign-in expired. Please try again." }, { status: 401 });
      }
      if (pending.accountId !== account.id) {
        console.warn("Step-up mismatch: passkey and password resolved to different accounts");
        return NextResponse.json({ error: "Invalid passkey" }, { status: 401 });
      }
    }

    await createSession(account.id, account.email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DbConnectionError) {
      return NextResponse.json(
        { error: "Sign-in is temporarily unavailable. Please try again shortly." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("Passkey login error:", e);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
