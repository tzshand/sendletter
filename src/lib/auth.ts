import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

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

export async function createSession(accountId: string, email: string) {
  const token = await new SignJWT({ sub: accountId, email, typ: TYP_SESSION })
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

export async function getSession(): Promise<{ accountId: string; email: string } | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!isSessionTyp(payload.typ)) return null;
    return {
      accountId: payload.sub as string,
      email: payload.email as string,
    };
  } catch {
    return null;
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

// For middleware (edge runtime) — verify without cookies() helper
export async function verifyToken(token: string): Promise<{ sub: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // Same gate as getSession — the middleware must not admit a step-up token
    // presented as a session cookie.
    if (!isSessionTyp(payload.typ)) return null;
    return { sub: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}
