// List the signed-in account's active sessions, or end all but this one.
//
// The current session is flagged rather than hidden: a list that silently
// omits "this device" makes people wonder whether it is counted, and the
// answer matters when they are trying to work out if someone else is signed in.

import { NextResponse } from "next/server";
import { getSession, listSessions, revokeOtherSessions } from "@/lib/auth";
import { describeDevice } from "@/lib/device";
import { DbConnectionError } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessions = await listSessions(session.accountId);
    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        device: describeDevice(s.user_agent),
        created_at: s.created_at,
        last_seen_at: s.last_seen_at,
        current: s.id === session.sessionId,
      })),
    });
  } catch (e) {
    if (e instanceof DbConnectionError) {
      return NextResponse.json(
        { error: "Temporarily unavailable. Please retry." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("List sessions failed:", e);
    return NextResponse.json({ error: "Could not load sessions" }, { status: 500 });
  }
}

/** End every session except the one making this request. */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const revoked = await revokeOtherSessions(session.accountId, session.sessionId);
    return NextResponse.json({ ok: true, revoked });
  } catch (e) {
    if (e instanceof DbConnectionError) {
      return NextResponse.json(
        { error: "Temporarily unavailable. Please retry." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("Revoke other sessions failed:", e);
    return NextResponse.json({ error: "Could not end sessions" }, { status: 500 });
  }
}
