// List or remove the signed-in account's passkeys.
//
// DELETE removes EVERY passkey on the account, because that is the only shape
// the Canner management API offers — there is no per-credential delete. The UI
// has to say so; quietly unenrolling five devices when someone meant to remove
// one would be the worst kind of surprise.

import { NextResponse } from "next/server";
import { getSession, revokeOtherSessions } from "@/lib/auth";
import { getDb, DbConnectionError } from "@/lib/db";
import { listPasskeys, removeAllPasskeys } from "@/lib/canner-auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const { data: account } = await db
      .from("sendletter_accounts")
      .select("canner_auth_user_id, passkey_enrolled_at")
      .eq("id", session.accountId)
      .maybeSingle();

    if (!account?.canner_auth_user_id || !account.passkey_enrolled_at) {
      return NextResponse.json({ passkeys: [] });
    }

    const passkeys = await listPasskeys(account.canner_auth_user_id);
    return NextResponse.json({
      passkeys: passkeys.map((p) => ({
        id: p.id,
        created_at: p.created_at,
        last_used_at: p.last_used_at,
        // "Synced" reads better than "backed_up: true" and is the thing that
        // actually matters: it tells you whether losing this device loses the key.
        synced: p.backed_up,
      })),
    });
  } catch (e) {
    if (e instanceof DbConnectionError) {
      return NextResponse.json(
        { error: "Temporarily unavailable. Please retry." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("List passkeys failed:", e);
    return NextResponse.json({ error: "Could not load passkeys" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const { data: account } = await db
      .from("sendletter_accounts")
      .select("canner_auth_user_id, password_hash, google_id")
      .eq("id", session.accountId)
      .maybeSingle();

    if (!account?.canner_auth_user_id) {
      return NextResponse.json({ error: "No passkeys to remove" }, { status: 404 });
    }

    // Lockout guard. Passkeys are the only credential on an account with no
    // password and no linked Google identity, so removing them would lock the
    // owner out of their own account with no self-serve way back in.
    if (!account.password_hash && !account.google_id) {
      return NextResponse.json(
        {
          error:
            "Set a password before removing your passkey — it is currently the only way into this account.",
        },
        { status: 409 },
      );
    }

    const removed = await removeAllPasskeys(account.canner_auth_user_id);

    const { error } = await db
      .from("sendletter_accounts")
      .update({ passkey_enrolled_at: null, updated_at: new Date().toISOString() })
      .eq("id", session.accountId);
    if (error) {
      // The credentials are already gone at Canner. Leaving our flag set would
      // gate password logins on a passkey that no longer exists — a lockout.
      console.error("Passkeys removed at Canner but flag not cleared:", error);
      return NextResponse.json(
        { error: "Passkeys removed, but the account record did not update. Contact support." },
        { status: 500 },
      );
    }

    // Removing a credential is a security action, so end other sessions too:
    // whoever prompted this should not leave a device signed in behind them.
    const endedSessions = await revokeOtherSessions(session.accountId, session.sessionId);

    return NextResponse.json({ ok: true, removed, ended_sessions: endedSessions });
  } catch (e) {
    if (e instanceof DbConnectionError) {
      return NextResponse.json(
        { error: "Temporarily unavailable. Please retry." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("Remove passkeys failed:", e);
    return NextResponse.json({ error: "Could not remove passkeys" }, { status: 500 });
  }
}
