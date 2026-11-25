import { NextResponse } from "next/server";
import { quote, PricingError, RATES, MAX_PAGES, type LetterSize } from "@/lib/pricing";

// Price a letter without sending it. Pure arithmetic over our published rates,
// so it needs no key and has no side effects. The same function prices a real
// order in POST /api/v1/send; there the page count of a PDF or draft is
// measured by us, here you supply it.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const size = (body.letter_size ?? "standard") as string;
  const colour = body.colour ?? body.color ?? true;
  const duplex = body.duplex ?? true;
  if (!(size in RATES.envelopeCents)) {
    return NextResponse.json({ error: 'Invalid letter_size. Must be "standard", "large", or "legal".' }, { status: 400 });
  }
  if (typeof colour !== "boolean" || typeof duplex !== "boolean") {
    return NextResponse.json({ error: "colour (or color) and duplex must be booleans" }, { status: 400 });
  }
  const pages = Number(body.pages);
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES) {
    return NextResponse.json({ error: `pages must be a whole number from 1 to ${MAX_PAGES}` }, { status: 400 });
  }

  try {
    const q = quote({ pages, size: size as LetterSize, colour, duplex, channel: "api" });
    return NextResponse.json({
      letter_size: q.size,
      pages: q.pages,
      colour: q.colour,
      duplex: q.duplex,
      mailings: q.mailings.length,
      stamps: q.stamps,
      amount_cents: q.totalCents,
      price: {
        version: q.version,
        lines: q.lines.map((l) => ({ item: l.key, qty: l.qty, unit_cents: l.unitCents, total_cents: l.totalCents })),
      },
    });
  } catch (e) {
    if (e instanceof PricingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
