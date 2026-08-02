import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, DbConnectionError } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getDb();

    // Check if account already exists
    const { data: existing } = await db
      .from("sendletter_accounts")
      .select("id, password_hash")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      if (existing.password_hash) {
        // Already has a password — true duplicate
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }

      // Google-only account — let them add a password
      const passwordHash = await bcrypt.hash(password, 12);
      await db
        .from("sendletter_accounts")
        .update({ password_hash: passwordHash })
        .eq("id", existing.id);

      await createSession(existing.id, normalizedEmail);
      return NextResponse.json({ ok: true, email: normalizedEmail });
    }

    // Create Stripe customer
    const stripe = getStripe();
    const customer = await stripe.customers.create({ email: normalizedEmail });

    // Hash password and create account
    const passwordHash = await bcrypt.hash(password, 12);
    const { data: account, error: dbError } = await db
      .from("sendletter_accounts")
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        stripe_customer_id: customer.id,
      })
      .select("id, email")
      .single();

    if (dbError || !account) {
      console.error("Account creation failed:", dbError);
      return NextResponse.json({ error: "Account creation failed" }, { status: 500 });
    }

    await createSession(account.id, account.email);

    return NextResponse.json({ ok: true, email: account.email });
  } catch (error) {
    // The duplicate-email lookup runs before the Stripe customer is created,
    // so an outage normally surfaces here with nothing to clean up. Reporting
    // it as 503 keeps a would-be customer from concluding the address is taken.
    if (error instanceof DbConnectionError) {
      console.error("Signup: database unreachable:", error.message);
      return NextResponse.json(
        { error: "Sign-up is temporarily unavailable. Please try again shortly." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
