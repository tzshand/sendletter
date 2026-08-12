// End one session.
//
// Ending your own is allowed and behaves like signing out: the cookie goes too,
// otherwise the browser would keep presenting a token whose row is revoked and
// the user would see an unexplained bounce to /login on their next click.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, revokeSession } from "@/lib/auth";
import { DbConnectionError } from "@/lib/db";

// params is a Promise in Next 16.
type Props = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Scoped by account inside revokeSession — a uuid from another account
    // matches nothing rather than ending a stranger's session.
    const revoked = await revokeSession(session.accountId, id);
    if (!revoked) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const endedCurrent = id === session.sessionId;
    if (endedCurrent) (await cookies()).delete("sl_session");

    return NextResponse.json({ ok: true, ended_current: endedCurrent });
  } catch (e) {
    if (e instanceof DbConnectionError) {
      return NextResponse.json(
        { error: "Temporarily unavailable. Please retry." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("Revoke session failed:", e);
    return NextResponse.json({ error: "Could not end session" }, { status: 500 });
  }
}
