import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { quote, PricingError, RATES, SIZE_LABELS, type LetterSize, type QuoteLine } from "@/lib/pricing";
import { DraftStoreError, isDraftId, loadDraft } from "@/lib/draft-store";
import { countPdfPages } from "@/lib/print-pdf";
import { AddressError, addressMetadata, parseFrom, parseTo } from "@/lib/address";

const NOT_CHARGED = "You have not been charged.";

// What Stripe's checkout page shows for each line of the quote.
function lineName(l: QuoteLine, colour: boolean, size: LetterSize): string {
  switch (l.key) {
    case "base": return l.qty > 1 ? `Mailing fee (${l.qty} envelopes)` : "Mailing fee";
    case "envelope": return size === "standard" ? "#10 window envelope" : size === "legal" ? "10×15 mailer" : "9×12 mailer";
    case "pages": return `Printing, ${l.qty} page${l.qty > 1 ? "s" : ""} (${colour ? "colour" : "black & white"})`;
    case "postage": return `Canada Post postage (${l.qty} stamp${l.qty > 1 ? "s" : ""})`;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { letterSize = "standard", colour = true, duplex = true, language = "en", draftId } = body;

  if (!(letterSize in RATES.envelopeCents) || typeof colour !== "boolean" || typeof duplex !== "boolean") {
    return NextResponse.json({ error: "Invalid letter options." }, { status: 400 });
  }
  const size = letterSize as LetterSize;

  let to, from;
  try {
    to = parseTo(body.to);
    from = parseFrom(body.from);
  } catch (e) {
    if (e instanceof AddressError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  // No document, no payment. The document is staged on the server before
  // checkout (see lib/draft-store.ts); verify it is really there before taking
  // any money. Its real page count, not the browser's, sets the price.
  if (!isDraftId(draftId)) {
    return NextResponse.json({ error: `Your document wasn't saved. Please try again. ${NOT_CHARGED}` }, { status: 400 });
  }
  let pages: number;
  let mode: string;
  try {
    const staged = await loadDraft(draftId);
    if (!staged.pdf || !staged.meta) {
      return NextResponse.json({ error: `Your document wasn't saved. Please try again. ${NOT_CHARGED}` }, { status: 400 });
    }
    mode = staged.meta.mode;
    try {
      pages = await countPdfPages(staged.pdf);
    } catch {
      return NextResponse.json({ error: `We couldn't read that PDF. Please try another file. ${NOT_CHARGED}` }, { status: 400 });
    }
  } catch (e) {
    console.error("create-checkout: could not verify staged document:", e instanceof DraftStoreError ? e.message : e);
    return NextResponse.json(
      { error: `We couldn't verify your document right now. Please try again. ${NOT_CHARGED}` },
      { status: 503 },
    );
  }

  let q;
  try {
    q = quote({ pages, size, colour, duplex, channel: "web" });
  } catch (e) {
    if (e instanceof PricingError) return NextResponse.json({ error: `${e.message}. ${NOT_CHARGED}` }, { status: 400 });
    throw e;
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      locale: language === "fr" ? "fr" : "auto",
      payment_method_types: ["card"],
      line_items: q.lines
        .filter((l) => l.qty > 0 && l.unitCents > 0)
        .map((l) => ({
          price_data: {
            currency: "cad",
            product_data: {
              name: lineName(l, colour, size),
              ...(l.key === "base" ? { description: `${SIZE_LABELS[size]}, to ${to.name} in ${to.city}, ${to.province}` } : {}),
            },
            unit_amount: l.unitCents,
          },
          quantity: l.qty,
        })),
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
        letterSize: size,
        pageCount: String(pages),
        colour: colour ? "1" : "0",
        duplex: duplex ? "1" : "0",
        mailings: String(q.mailings.length),
        stamps: String(q.stamps),
        sheets: String(q.mailings.reduce((s, m) => s + m.sheets, 0)),
        weightG: String(q.mailings.reduce((s, m) => s + m.weightGrams, 0)),
        quoteCents: String(q.totalCents),
        pricingVersion: q.version,
        ...addressMetadata(from, to),
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
