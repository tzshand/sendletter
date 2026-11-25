import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { PRICES, SIZE_LABELS } from "@/lib/pricing";
import { isCompleteDraft, isDraftId, loadDraft } from "@/lib/draft-store";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    from,
    to,
    mode,
    letterSize = "standard",
    pageCount = 1,
    language = "en",
    draftId,
  } = body;

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing address information" },
      { status: 400 }
    );
  }

  // Letter content is validated against the staged draft below, not the body.

  // No document, no payment. The document is staged on the server before
  // checkout (see lib/draft-store.ts); verify it is really there and complete
  // before taking any money, so an order can never be paid for with nothing to
  // print.
  if (!isDraftId(draftId)) {
    return NextResponse.json(
      { error: "Your document wasn't saved. Please try again — you have not been charged." },
      { status: 400 }
    );
  }
  try {
    const staged = await loadDraft(draftId);
    if (!isCompleteDraft(staged)) {
      return NextResponse.json(
        { error: "Your document wasn't saved. Please try again — you have not been charged." },
        { status: 400 }
      );
    }
  } catch (e) {
    console.error("create-checkout: could not verify staged document:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "We couldn't verify your document right now. Please try again — you have not been charged." },
      { status: 503 }
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
        draftId,
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
