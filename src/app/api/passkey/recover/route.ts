// Start passkey recovery: Canner emails a link that lands on /passkey/enroll.
//
// Unauthenticated by necessity — the whole point is that the caller cannot sign
// in. That makes the response shape important: it is identical whether or not
// the address has an account, so this cannot be used to enumerate customers.
// Canner's own endpoint takes the same position.

import { NextResponse } from "next/server";
import { requestRecoveryEmail, normalizeAuthLocale } from "@/lib/canner-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    // The client passes the language it is actually rendering in. Canner falls
    // back to the app's default_locale if it is missing or unrecognised.
    const locale = normalizeAuthLocale(body?.locale);

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    await requestRecoveryEmail(email, locale);

    // Always the same answer. No "no account found", no timing tell worth
    // chasing — the send itself is fire-and-forget inside requestRecoveryEmail.
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Passkey recovery request failed:", e);
    // Even a failure here reports ok: surfacing the difference would leak the
    // very thing the uniform response exists to hide.
    return NextResponse.json({ ok: true });
  }
}
