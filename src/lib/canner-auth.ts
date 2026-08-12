// Server-side half of the Canner Auth (passkey) integration.
//
// Canner holds the WebAuthn credentials and the public keys; sendletter holds
// nothing but a join column. Authentication succeeds when Canner hands the
// browser a short-lived ES256 JWT, which we verify statelessly against the
// app's JWKS. That verification is the entire trust boundary — everything a
// caller sends us about who they are is worthless without it.

import { createRemoteJWKSet, jwtVerify } from "jose";

const CANNER_API = "https://api.canner.ca";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

// Cached across invocations: the JWKS is fetched once and refreshed by `jose`
// on key rotation. Building it per request would add a network round trip to
// every sign-in.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(requireEnv("CANNER_AUTH_JWKS_URL")));
  return jwks;
}

export type CannerAuthUser = {
  /** Canner's auth_app_users id — matches sendletter_accounts.canner_auth_user_id */
  cannerUserId: string;
  email: string | null;
  emailVerified: boolean;
};

/**
 * Verify a token minted by a Canner Auth ceremony.
 *
 * Issuer AND audience are both pinned. Audience matters more than it looks:
 * every Canner Auth app on the platform is signed by the same service, so
 * without the `aud` check a token issued for someone else's app would verify
 * against our JWKS-adjacent trust and log its bearer in here.
 */
export async function verifyCannerToken(token: string): Promise<CannerAuthUser> {
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: requireEnv("CANNER_AUTH_ISSUER"),
    audience: requireEnv("CANNER_AUTH_APP_ID"),
  });

  const sub = typeof payload.sub === "string" ? payload.sub : null;
  if (!sub) throw new Error("Canner token has no subject");

  return {
    cannerUserId: sub,
    email: typeof payload.email === "string" ? payload.email : null,
    emailVerified: payload.email_verified === true,
  };
}

/**
 * Mint a one-time enrollment ticket for an account that is already
 * authenticated to US.
 *
 * This is the secret-key path, and it is what lets enrollment happen inline at
 * signup with no email round trip: we have already established who this person
 * is, so Canner does not need to re-prove it by mailing them a link. The
 * publishable key deliberately cannot do this — it ships in client JS, so
 * anyone could bind a passkey to an identifier of their choosing.
 *
 * Passing `email` alongside `externalId` records the recovery address at the
 * same time, silently. That is what keeps the "verify your email" prompt off
 * the signup path for users who already gave us one.
 */
export async function mintEnrollmentTicket(
  externalId: string,
  email: string | null,
): Promise<{ ticket: string; cannerUserId: string }> {
  const res = await fetch(`${CANNER_API}/v1/auth/tickets`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${requireEnv("CANNER_AUTH_SECRET_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(email ? { external_id: externalId, email } : { external_id: externalId }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Canner ticket request failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { ticket: string; user_id: string };
  return { ticket: data.ticket, cannerUserId: data.user_id };
}

/** Languages Canner Auth has built-in email templates for. */
export type AuthLocale = "en" | "fr";

/**
 * Canner accepts "fr-CA", "fr_CA", "FR" and normalises them, but sending a
 * clean value keeps our own logs unambiguous.
 */
export function normalizeAuthLocale(v: unknown): AuthLocale {
  if (typeof v !== "string") return "en";
  const base = v.trim().toLowerCase().replace("_", "-").split("-")[0];
  return base === "fr" ? "fr" : "en";
}

/**
 * Ask Canner to email a recovery link. Used only when every passkey is lost —
 * the link lands on our own /passkey/enroll page (the app's callback_url),
 * because a WebAuthn ceremony can only run on an origin under our RP ID.
 *
 * `locale` sets the language of that email. It is passed per request because
 * only we know which language this particular user reads; Canner falls back to
 * the app's default_locale when it is absent. Deliberately not derived from
 * Accept-Language — that header describes the browser, not the person.
 *
 * Always resolves. The endpoint is deliberately not an enumeration oracle and
 * neither is this.
 */
export async function requestRecoveryEmail(email: string, locale: AuthLocale = "en"): Promise<void> {
  try {
    await fetch(`${CANNER_API}/v1/auth/register/start`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${requireEnv("NEXT_PUBLIC_CANNER_AUTH_PUBLISHABLE_KEY")}`,
        "content-type": "application/json",
        origin: "https://sendletter.app",
      },
      body: JSON.stringify({ email, locale }),
    });
  } catch (e) {
    console.error("Canner recovery email request failed:", e);
  }
}

// ── Management API (secret key) ────────────────────────────────────────────

export type CannerPasskey = {
  id: string;
  created_at: string;
  last_used_at: string | null;
  backed_up: boolean;
  device_type: string;
};

async function manage<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CANNER_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${requireEnv("CANNER_AUTH_SECRET_KEY")}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Canner ${path} failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as T;
}

/** The passkeys enrolled against a Canner end user. */
export async function listPasskeys(cannerUserId: string): Promise<CannerPasskey[]> {
  const data = await manage<{ passkeys: CannerPasskey[] }>(`/v1/auth/users/${cannerUserId}`);
  return data.passkeys ?? [];
}

/**
 * Remove every passkey from a Canner end user, keeping the user record.
 *
 * All-or-nothing is the platform's shape, not a simplification on our side:
 * the management API exposes no per-credential delete. Anything calling this
 * must tell the user that every device is being unenrolled, not just one.
 */
export async function removeAllPasskeys(cannerUserId: string): Promise<number> {
  const data = await manage<{ removed: number }>(`/v1/auth/users/${cannerUserId}/passkeys`, {
    method: "DELETE",
  });
  return data.removed ?? 0;
}
