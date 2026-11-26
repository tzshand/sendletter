import { NextResponse } from "next/server";
import { quote, PricingError, RATES, MAX_PAGES, type LetterSize } from "@/lib/pricing";
import { validateApiKey, ApiAuthError } from "@/lib/api-auth";
import { recentMailings } from "@/lib/api-limits";
import { DbConnectionError } from "@/lib/db";
import { readJsonObject } from "@/lib/api-route";

// Price a letter without sending it. Pure arithmetic over our published rates, so
// it needs no key and has no side effects. The same function prices a real order
// in POST /api/v1/letters; there the page count of a PDF or draft is measured by
// us, here you supply it.
//
// Volume discount: the mailing fee falls as an account sends more (see
// GET /api/v1/pricing). Without a key the quote assumes list price unless you say
// how many letters you have sent in the last 30 days (letters_in_last_30_days).
// With a key it uses your account's real count, so it matches what you will be charged.
export async function POST(req: Request) {
  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  const size = (body.letter_size ?? "standard") as string;
  const colour = body.colour ?? body.color ?? false;
  const duplex = body.duplex ?? true;
  if (!(size in RATES.envelopeCents)) {
    return NextResponse.json({ error: 'Invalid letter_size. Must be "standard", "large", or "legal".', code: "invalid_letter_size" }, { status: 400 });
  }
  if (typeof colour !== "boolean" || typeof duplex !== "boolean") {
    return NextResponse.json({ error: "colour (or color) and duplex must be booleans", code: "invalid_options" }, { status: 400 });
  }
  const pages = Number(body.pages);
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES) {
    return NextResponse.json({ error: `pages must be a whole number from 1 to ${MAX_PAGES}`, code: "invalid_pages" }, { status: 400 });
  }

  let prior: number | undefined;
  let basis: "list_price" | "assumed" | "your_account" = "list_price";
  try {
    if (req.headers.get("authorization")) {
      const caller = await validateApiKey(req);
      prior = await recentMailings(caller.accountId);
      basis = "your_account";
    } else if (body.letters_in_last_30_days !== undefined) {
      const n = Number(body.letters_in_last_30_days);
      if (!Number.isInteger(n) || n < 0 || n > 10_000_000) {
        return NextResponse.json({ error: "letters_in_last_30_days must be a whole number of 0 or more", code: "invalid_volume" }, { status: 400 });
      }
      prior = n;
      basis = "assumed";
    }
  } catch (e) {
    if (e instanceof ApiAuthError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    if (e instanceof DbConnectionError) return NextResponse.json({ error: "Service temporarily unavailable. Please retry.", code: "service_unavailable" }, { status: 503, headers: { "Retry-After": "30" } });
    throw e;
  }

  try {
    const q = quote({ pages, size: size as LetterSize, colour, duplex, channel: "api", priorMailings: prior });
    return NextResponse.json({
      letter_size: q.size,
      pages: q.pages,
      colour: q.colour,
      duplex: q.duplex,
      mailings: q.mailings.length,
      stamps: q.stamps,
      currency: "cad",
      amount_cents: q.totalCents,
      price: {
        version: q.version,
        volume_basis: basis,
        ...(q.volume
          ? { volume: { mailings_in_last_30_days: q.volume.priorMailings, base_fee_list_cents: q.volume.listBaseCents, discount_cents: q.volume.discountCents } }
          : {}),
        lines: q.lines.map((l) => ({ item: l.key, qty: l.qty, unit_cents: l.unitCents, total_cents: l.totalCents })),
      },
    });
  } catch (e) {
    if (e instanceof PricingError) return NextResponse.json({ error: e.message, code: "pricing_error" }, { status: 400 });
    throw e;
  }
}
