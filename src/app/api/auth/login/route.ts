import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, DbConnectionError } from "@/lib/db";
import { createSession, createPendingToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getDb();

    const { data: account } = await db
      .from("sendletter_accounts")
      .select("id, email, password_hash, passkey_enrolled_at")
      .eq("email", normalizedEmail)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Google-only accounts have no password
    if (!account.password_hash) {
      return NextResponse.json(
        { error: "This account uses Google sign-in. Please use the Google button to log in." },
        { status: 401 },
      );
    }

    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // The gate. Once an account holds a passkey, a correct password stops being
    // sufficient on its own — it earns a short-lived pending token and nothing
    // else. No session is created and no cookie is set until the passkey
    // ceremony also succeeds at /api/passkey/login.
    if (account.passkey_enrolled_at) {
      const pendingToken = await createPendingToken(account.id, account.email);
      return NextResponse.json({ passkey_required: true, pending_token: pendingToken });
    }

    await createSession(account.id, account.email);

    return NextResponse.json({ ok: true, email: account.email });
  } catch (error) {
    // Never let an outage masquerade as a credential failure — a user told
    // "invalid email or password" when the database is down will reset a
    // password that was never wrong.
    if (error instanceof DbConnectionError) {
      console.error("Login: database unreachable:", error.message);
      return NextResponse.json(
        { error: "Sign-in is temporarily unavailable. Please try again shortly." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
