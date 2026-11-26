"use client";

// Browser half of the Canner Auth integration.
//
// These calls go straight to api.canner.ca with the PUBLISHABLE key, not
// through our own server. That is by design: the WebAuthn ceremony is bound by
// the browser to this page's origin, and Canner re-checks that origin against
// the app's allowlist. The publishable key is not a secret — its only power
// comes from that origin restriction.
//
// Everything here only works on https://sendletter.app. The passkeys are scoped
// to that RP ID permanently, so the ceremony will fail on any other host,
// including the *.canner.app preview domain.

import { useSyncExternalStore } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

const CANNER_API = "https://api.canner.ca";

function publishableKey(): string {
  const key = process.env.NEXT_PUBLIC_CANNER_AUTH_PUBLISHABLE_KEY;
  if (!key) throw new Error("Passkey sign-in is not configured");
  return key;
}

/** True when this browser can do WebAuthn at all. */
const noSubscribe = () => () => {};

/** passkeysSupported() as a hook: false on the server and first paint, then the browser's answer. */
export function usePasskeysSupported(): boolean {
  return useSyncExternalStore(noSubscribe, passkeysSupported, () => false);
}

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

async function cannerPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${CANNER_API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${publishableKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Canner ${path} failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as T;
}

/**
 * Bind a new passkey using a ticket minted by our backend, then hand the
 * resulting token to our own /api/passkey/complete so it can open a session.
 */
export async function enrollPasskey(ticket: string): Promise<string> {
  const { options, challenge_id } = await cannerPost<{
    options: Parameters<typeof startRegistration>[0]["optionsJSON"];
    challenge_id: string;
  }>("/v1/auth/register/options", { token: ticket });

  const attestation = await startRegistration({ optionsJSON: options });

  const { token } = await cannerPost<{ token: string }>("/v1/auth/register/verify", {
    token: ticket,
    challenge_id,
    response: attestation,
  });

  return token;
}

/**
 * Sign in with an existing passkey. Canner issues a discoverable-credential
 * challenge, so the user picks their account from the browser's own prompt and
 * never types an email.
 */
export async function authenticatePasskey(): Promise<string> {
  const { options, challenge_id } = await cannerPost<{
    options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
    challenge_id: string;
  }>("/v1/auth/login/options", {});

  const assertion = await startAuthentication({ optionsJSON: options });

  const { token } = await cannerPost<{ token: string }>("/v1/auth/login/verify", {
    challenge_id,
    response: assertion,
  });

  return token;
}

/**
 * A user who dismisses the OS prompt is not an error worth shouting about —
 * they chose "not now". Distinguish that from a real failure so callers can
 * stay quiet in the first case.
 */
export function wasDismissed(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e.name === "NotAllowedError" || e.name === "AbortError")
  );
}
