import { NextResponse } from "next/server";
import { RATES, RATES_VERSION, MAX_PAGES, type LetterSize } from "@/lib/pricing";
import { VOLUME, volumeTable, estimateVolume, API_FROM_ALL_IN_CENTS } from "@/lib/volume";
import { DEFAULT_DAILY_LIMIT_CENTS } from "@/lib/api-limits";

// Public. The published rates, the volume discount table, and (with
// ?letters_per_month=) a worked estimate. The calculator on the pricing post is
// this endpoint's arithmetic, run in the browser.
//
//   GET /api/v1/pricing
//   GET /api/v1/pricing?letters_per_month=250&pages=2&letter_size=standard&colour=false
export async function GET(req: Request) {
  const u = new URL(req.url);
  const out: Record<string, unknown> = {
    currency: "cad",
    version: RATES_VERSION,
    as_low_as_cents: API_FROM_ALL_IN_CENTS,
    as_low_as_description: "One black-and-white page in a #10 envelope with one stamp, from the 100th mailing in any 30 days. Postage and tax included.",
    rates: {
      mailing_fee_list_cents: RATES.baseCents.api,
      envelope_cents: RATES.envelopeCents,
      page_cents: { black_and_white: RATES.pageCents.bw, colour: RATES.pageCents.colour },
      stamp_cents: RATES.stampCents,
      note: "Postage is passed through at cost. Only the mailing fee is discounted by volume.",
    },
    volume_discount: {
      window_days: VOLUME.windowDays,
      floor_cents: VOLUME.floorCents,
      floor_reached_at_mailing: VOLUME.fullDiscountAt,
      table: volumeTable(),
    },
    limits: { default_daily_spend_cents: DEFAULT_DAILY_LIMIT_CENTS, max_pages: MAX_PAGES },
    billing: "No subscription. Your first letter is charged when you send it; after that, usage is invoiced monthly.",
  };

  if (u.searchParams.has("letters_per_month")) {
    const size = u.searchParams.get("letter_size") ?? "standard";
    const n = Number(u.searchParams.get("letters_per_month"));
    const pages = Number(u.searchParams.get("pages") ?? 1);
    if (!(size in RATES.envelopeCents) || !Number.isInteger(n) || n < 1 || n > 1_000_000 || !Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES) {
      return NextResponse.json({ error: "letters_per_month and pages must be whole numbers; letter_size must be standard, large or legal", code: "invalid_params" }, { status: 400 });
    }
    out.estimate = estimateVolume({
      lettersPerMonth: n, pages, size: size as LetterSize,
      colour: u.searchParams.get("colour") === "true", duplex: u.searchParams.get("duplex") !== "false",
    });
  }
  return NextResponse.json(out, { headers: { "cache-control": "public, max-age=300" } });
}
