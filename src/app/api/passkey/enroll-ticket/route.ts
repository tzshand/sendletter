// Mint a Canner Auth enrollment ticket for the current user.
//
// Two callers are allowed, and both have already proven who they are:
//   - a live session (adding a passkey from the profile page)
//   - a step-up pending token (just signed up, or just passed the password
//     check on an account that has no passkey yet)
//
// The ticket is short-lived and single-use; the browser exchanges it for a
// WebAuthn challenge. Handing one out to an unauthenticated caller would let
// anyone bind their own passkey to someone else's account, so there is no
// third branch here.

import { NextResponse } from "next/server";
import { getSession, verifyPendingToken } from "@/lib/auth";
import { getDb, DbConnectionError } from "@/lib/db";
import { mintEnrollmentTicket } from "@/lib/canner-auth";

export async function POST(req: Request) {
  try {
    let accountId: string | null = null;
    let email: string | null = null;

    const session = await getSession();
    if (session) {
      accountId = session.accountId;
      email = session.email;
    } else {
      const body = await req.json().catch(() => ({}));
      const pending = typeof body?.pending_token === "string"
        ? await verifyPendingToken(body.pending_token)
        : null;
      if (pending) {
        accountId = pending.accountId;
        email = pending.email;
      }
    }

    if (!accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticket, cannerUserId } = await mintEnrollmentTicket(accountId, email);

    // Record the join key now rather than after the ceremony: if the user
    // abandons the WebAuthn prompt, the mapping is harmless, and if they
    // complete it we need the row to already point at the right Canner user.
    const db = getDb();
    const { error } = await db
      .from("sendletter_accounts")
      .update({ canner_auth_user_id: cannerUserId, updated_at: new Date().toISOString() })
      .eq("id", accountId);

    if (error) {
      console.error("Failed to store canner_auth_user_id:", error);
      return NextResponse.json({ error: "Could not start enrollment" }, { status: 500 });
    }

    return NextResponse.json({ ticket });
  } catch (e) {
    if (e instanceof DbConnectionError) {
      return NextResponse.json(
        { error: "Temporarily unavailable. Please retry." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("Enrollment ticket error:", e);
    return NextResponse.json({ error: "Could not start enrollment" }, { status: 500 });
  }
}
