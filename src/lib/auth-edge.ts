// Edge-safe half of the auth layer.
//
// The middleware runs on the edge runtime, where `pg` cannot load. lib/auth.ts
// now touches the database (to record and revoke sessions), so importing it
// from middleware would pull node-postgres into the edge bundle and fail the
// build. This module carries only what the middleware needs: signature
// verification, using jose, which is edge-compatible.
//
// IMPORTANT: this deliberately does NOT check whether a session has been
// revoked — it cannot, without a database. It is a cheap pre-filter that keeps
// obviously-unauthenticated requests off the profile page. `getSession()` in
// lib/auth.ts is the authoritative check, and every protected page and route
// calls it. Do not add authorisation decisions here that the Node-side check
// does not repeat.

import { jwtVerify } from "jose";

const TYP_SESSION = "session";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

// Sessions minted before the `typ` claim existed carry no type; still honoured
// so the change did not sign everyone out. A step-up token is rejected either
// way, which is the part that matters.
function isSessionTyp(typ: unknown): boolean {
  return typ === TYP_SESSION || typ === undefined;
}

export async function verifyToken(token: string): Promise<{ sub: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // The middleware must not admit a step-up token presented as a session.
    if (!isSessionTyp(payload.typ)) return null;
    return { sub: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}
