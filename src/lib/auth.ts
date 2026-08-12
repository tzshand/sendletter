import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { createHash } from "crypto";
import { getDb } from "./db";

const COOKIE_NAME = "sl_session";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Session tokens and step-up tokens are signed with the SAME secret, so the
 * `typ` claim is the only thing separating them. Without it, the pending token
 * handed out after a correct password would be a valid session cookie — and
 * since the holder can set their own cookie, that would defeat the entire
 * passkey gate it exists to enforce. Never mint either without a `typ`.
 */
const TYP_SESSION = "session";
const TYP_STEPUP = "stepup";

/**
 * Hash the client IP rather than storing it. Enough to tell two sign-ins apart
 * and to spot an unfamiliar one, without keeping a record of where someone
 * lives. Salted with JWT_SECRET so the hashes are not reversible by rainbow
 * table against the small IPv4 space.
 */
function hashIp(ip: string): string {
  return createHash("sha256").update(`${process.env.JWT_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 32);
}

async function requestFingerprint(): Promise<{ userAgent: string | null; ipHash: string | null }> {
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    // Behind Caddy on Canner, the real client address is the first entry.
    const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = fwd || h.get("x-real-ip") || "";
    return {
      userAgent: ua ? ua.slice(0, 400) : null,
      ipHash: ip ? hashIp(ip) : null,
    };
  } catch {
    return { userAgent: null, ipHash: null };
  }
}

export async function createSession(accountId: string, email: string) {
  // Record the session first: the cookie carries its id, so the row has to
  // exist before the token that references it is handed out.
  const { userAgent, ipHash } = await requestFingerprint();
  let sessionId: string | null = null;
  try {
    const db = getDb();
    const { data } = await db
      .from("sendletter_sessions")
      .insert({ account_id: accountId, user_agent: userAgent, ip_hash: ipHash })
      .select("id")
      .single();
    sessionId = data?.id ?? null;
  } catch (e) {
    // A session that cannot be recorded is still a valid sign-in — it just
    // cannot be listed or revoked individually. Failing the login outright
    // would be a worse trade for the user in front of us.
    console.error("Session record failed (continuing):", e);
  }

  const claims: Record<string, unknown> = { sub: accountId, email, typ: TYP_SESSION };
  if (sessionId) claims.sid = sessionId;

  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return token;
}

export type Session = { accountId: string; email: string; sessionId: string | null };

/**
 * The authoritative session check. A valid signature is no longer sufficient —
 * if the token names a session, that session must still be live. This is what
 * makes "end this session" actually end it.
 */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  let payload;
  try {
    ({ payload } = await jwtVerify(token, getSecret()));
  } catch {
    return null;
  }
  if (!isSessionTyp(payload.typ)) return null;

  const accountId = payload.sub as string;
  const sessionId = typeof payload.sid === "string" ? payload.sid : null;

  if (sessionId) {
    const db = getDb();
    const { data: row } = await db
      .from("sendletter_sessions")
      .select("id, revoked_at, last_seen_at")
      .eq("id", sessionId)
      .maybeSingle();

    // Revoked, or the row is gone — either way this cookie is spent.
    if (!row || row.revoked_at) return null;
    await touchSession(sessionId, row.last_seen_at);
  }

  return { accountId, email: payload.email as string, sessionId };
}

// Writing last_seen_at on every request would mean a database write per page
// view for a field nobody reads at that resolution. Five minutes is enough to
// make "last active" meaningful in the session list.
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

async function touchSession(sessionId: string, lastSeen: string | Date | null) {
  const last = lastSeen ? new Date(lastSeen).getTime() : 0;
  if (Date.now() - last < TOUCH_INTERVAL_MS) return;
  try {
    const db = getDb();
    await db
      .from("sendletter_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", sessionId);
  } catch {
    /* non-critical */
  }
}

// Sessions minted before the `typ` claim existed carry no type; they are still
// honoured so this change does not sign everyone out. A step-up token is
// rejected either way, which is the part that matters.
// TODO: drop the undefined branch once the 30-day legacy sessions have expired.
function isSessionTyp(typ: unknown): boolean {
  return typ === TYP_SESSION || typ === undefined;
}

export async function clearSession() {
  // Revoke the row too, not just the cookie. Deleting the cookie only stops the
  // browser presenting it; the token itself stays valid until expiry, so a copy
  // captured beforehand would still work. Logging out should mean logged out.
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (token) {
      const { payload } = await jwtVerify(token, getSecret());
      if (typeof payload.sid === "string") {
        const db = getDb();
        await db
          .from("sendletter_sessions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", payload.sid);
      }
    }
  } catch {
    /* the cookie is going away regardless */
  }
  (await cookies()).delete(COOKIE_NAME);
}

// ── Step-up (passkey gate) ─────────────────────────────────────────────────
//
// When an account holds a passkey, a correct password is no longer sufficient
// to sign in — it only earns a pending token, which is worth nothing on its own
// and is NOT set as a cookie. The session is minted only after the passkey
// ceremony also succeeds. Short TTL because its only job is to survive one
// WebAuthn prompt.

const PENDING_TTL = "5m";

export async function createPendingToken(accountId: string, email: string): Promise<string> {
  return new SignJWT({ sub: accountId, email, typ: TYP_STEPUP })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(PENDING_TTL)
    .sign(getSecret());
}

export async function verifyPendingToken(
  token: string,
): Promise<{ accountId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // Strict: a session token must never satisfy the step-up check either.
    if (payload.typ !== TYP_STEPUP) return null;
    return { accountId: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}

// verifyToken moved to lib/auth-edge.ts — the middleware runs on the edge
// runtime and this module now imports `pg`, which cannot load there.

// ── Session management ─────────────────────────────────────────────────────

export type SessionRecord = {
  id: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
};

export async function listSessions(accountId: string): Promise<SessionRecord[]> {
  const db = getDb();
  // The query builder has no `IS NULL` filter, so revoked rows are dropped
  // here rather than in SQL. The limit is generous on purpose: it applies
  // BEFORE that filter, so a tight one could push every live session off the
  // end of a long revocation history and show someone an empty list.
  const { data } = await db
    .from("sendletter_sessions")
    .select("id, user_agent, created_at, last_seen_at, revoked_at")
    .eq("account_id", accountId)
    .order("last_seen_at", { ascending: false })
    .limit(500);

  const rows: (SessionRecord & { revoked_at: string | null })[] = data ?? [];
  return rows.filter((r) => !r.revoked_at).slice(0, 50);
}

/**
 * Revoke one session. Scoped by account_id as well as id so a caller cannot
 * end a stranger's session by guessing a uuid.
 */
export async function revokeSession(accountId: string, sessionId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("sendletter_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("account_id", accountId)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

/** Revoke every session for an account except the one making the request. */
export async function revokeOtherSessions(
  accountId: string,
  keepSessionId: string | null,
): Promise<number> {
  const sessions = await listSessions(accountId);
  const targets = sessions.filter((s) => s.id !== keepSessionId).map((s) => s.id);
  if (targets.length === 0) return 0;

  const db = getDb();
  await db
    .from("sendletter_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .in("id", targets);
  return targets.length;
}
