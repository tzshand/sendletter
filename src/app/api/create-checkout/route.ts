import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

const PRICES: Record<string, number> = {
  standard: 420, // $4.20
  legal: 570, // $5.70
  large: 570, // $5.70
};

const SIZE_LABELS: Record<string, string> = {
  standard: "Standard tri-fold",
  legal: "Legal (8.5×14)",
  large: "Full size (8.5×11)",
};

export async function POST(req: Request) {
  const body = await req.json();
  const { htmlContent, from, to, mode, letterData, letterSize = "standard" } = body;

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing address information" },
      { status: 400 }
    );
  }

  if (mode === "simple" && !letterData?.body) {
    return NextResponse.json(
      { error: "Letter body is empty" },
      { status: 400 }
    );
  }

  if ((mode === "custom" || mode === "upload") && !htmlContent) {
    return NextResponse.json(
      { error: "Letter content is empty" },
      { status: 400 }
    );
  }

  const unitAmount = PRICES[letterSize] || PRICES.standard;
  const sizeLabel = SIZE_LABELS[letterSize] || SIZE_LABELS.standard;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Mail a Letter",
              description: `${sizeLabel} — to ${to.name} in ${to.city}, ${to.province}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}`,
      metadata: {
        letterMode: mode,
        letterSize,
        fromName: from.name,
        toName: to.name,
        toCity: to.city,
        toProvince: to.province,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session. Check Stripe API keys." },
      { status: 500 }
    );
  }
}
