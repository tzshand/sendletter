import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { PRICES, SIZE_LABELS } from "@/lib/pricing";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    htmlContent,
    from,
    to,
    mode,
    letterData,
    letterSize = "standard",
    pageCount = 1,
    language = "en",
  } = body;

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
  const pages = Math.max(1, Math.min(Number(pageCount) || 1, 15));

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      locale: language === "fr" ? "fr" : "auto",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Mail a Letter",
              description: `${sizeLabel} — ${pages} page${pages > 1 ? "s" : ""} — to ${to.name} in ${to.city}, ${to.province}`,
              // images: ["https://sendletter.app/og-letter.png"], // TODO: add branded preview image
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      consent_collection: {
        terms_of_service: "required",
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: "I agree to the [Terms of Service](https://sendletter.app/terms). All sales are final.",
        },
      },
      success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}`,
      metadata: {
        letterMode: mode,
        letterSize,
        pageCount: String(pages),
        fromName: from.name,
        fromLine1: from.line1,
        fromLine2: from.line2 || "",
        fromCity: from.city,
        fromProvince: from.province,
        fromPostal: from.postalCode,
        fromCountry: from.country || "CA",
        toName: to.name,
        toLine1: to.line1,
        toLine2: to.line2 || "",
        toCity: to.city,
        toProvince: to.province,
        toPostal: to.postalCode,
        toCountry: to.country || "CA",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Checkout failed: ${message}` },
      { status: 500 }
    );
  }
}
