import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabase } from "@/lib/supabase";
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
    const supabase = getSupabase();

    // Check if account already exists
    const { data: existing } = await supabase
      .from("sendletter_accounts")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Create Stripe customer
    const stripe = getStripe();
    const customer = await stripe.customers.create({ email: normalizedEmail });

    // Hash password and create account
    const passwordHash = await bcrypt.hash(password, 12);
    const { data: account, error: dbError } = await supabase
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
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
