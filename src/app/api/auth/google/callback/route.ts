import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { createSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // User denied access or other error
  if (error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verify CSRF state
  const storedState = req.cookies.get("google_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
    }

    const tokens = await tokenRes.json();

    // Get user info from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      console.error("Google userinfo failed:", await userRes.text());
      return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
    }

    const googleUser: { id: string; email: string; name?: string } = await userRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL("/login?error=google_no_email", req.url));
    }

    const normalizedEmail = googleUser.email.toLowerCase().trim();
    const googleId = googleUser.id;
    const db = getDb();

    // Check if an account with this Google ID already exists
    let { data: account } = await db
      .from("sendletter_accounts")
      .select("id, email")
      .eq("google_id", googleId)
      .maybeSingle();

    if (!account) {
      // Check if an account with this email exists (link Google to existing account)
      const { data: emailAccount } = await db
        .from("sendletter_accounts")
        .select("id, email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (emailAccount) {
        // Link Google ID to existing account
        await db
          .from("sendletter_accounts")
          .update({ google_id: googleId })
          .eq("id", emailAccount.id);
        account = emailAccount;
      } else {
        // Create new account (no password — Google-only)
        const stripe = getStripe();
        const customer = await stripe.customers.create({ email: normalizedEmail });

        const { data: newAccount, error: dbError } = await db
          .from("sendletter_accounts")
          .insert({
            email: normalizedEmail,
            google_id: googleId,
            stripe_customer_id: customer.id,
          })
          .select("id, email")
          .single();

        if (dbError || !newAccount) {
          console.error("Google account creation failed:", dbError);
          return NextResponse.redirect(new URL("/login?error=account_failed", req.url));
        }

        account = newAccount;
      }
    }

    // Create session and redirect
    await createSession(account.id, account.email);

    const response = NextResponse.redirect(new URL("/profile", req.url));
    // Clear the state cookie
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }
}
