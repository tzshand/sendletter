"use client";

// The volume-pricing calculator. It runs the same functions the API prices with
// (lib/pricing.ts, lib/volume.ts), in the browser, so the number it shows is the
// number you would be charged.

import { useMemo, useState } from "react";
import { estimateVolume } from "@/lib/volume";
import { RATES, MAX_PAGES, formatCents, type LetterSize } from "@/lib/pricing";

const SIZES: { v: LetterSize; label: string }[] = [
  { v: "standard", label: "#10 window envelope, folded" },
  { v: "large", label: "9×12 flat mailer" },
  { v: "legal", label: "10×15 flat mailer (legal)" },
];

export function VolumeCalculator() {
  const [n, setN] = useState(100);
  const [pages, setPages] = useState(1);
  const [size, setSize] = useState<LetterSize>("standard");
  const [colour, setColour] = useState(false);

  const e = useMemo(() => {
    const letters = Math.min(1_000_000, Math.max(1, Math.floor(Number(n) || 1)));
    const p = Math.min(MAX_PAGES, Math.max(1, Math.floor(Number(pages) || 1)));
    return estimateVolume({ lettersPerMonth: letters, pages: p, size, colour, duplex: true });
  }, [n, pages, size, colour]);

  const m = (c: number) => formatCents(c);
  const label = "block text-xs font-semibold text-gray-500 mb-1";

  return (
    <div className="my-6 rounded-xl border border-gray-200 bg-white p-5" role="group" aria-label="Volume pricing calculator">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="vc-n">Letters per month</label>
          <input id="vc-n" type="number" min={1} max={1000000} value={n} onChange={(ev) => setN(Number(ev.target.value))} className="input input-sm w-full" />
          <input type="range" min={1} max={500} value={Math.min(n, 500)} onChange={(ev) => setN(Number(ev.target.value))} className="w-full mt-2 accent-[#F0513C]" aria-label="Letters per month slider" />
        </div>
        <div>
          <label className={label} htmlFor="vc-p">Pages per letter</label>
          <input id="vc-p" type="number" min={1} max={MAX_PAGES} value={pages} onChange={(ev) => setPages(Number(ev.target.value))} className="input input-sm w-full" />
        </div>
        <div>
          <label className={label} htmlFor="vc-s">Envelope</label>
          <select id="vc-s" value={size} onChange={(ev) => setSize(ev.target.value as LetterSize)} className="input input-sm w-full">
            {SIZES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>Printing</span>
          <div className="flex gap-4 text-sm text-gray-700 pt-1.5">
            <label className="flex items-center gap-1.5"><input type="radio" checked={!colour} onChange={() => setColour(false)} /> Black and white ({formatCents(RATES.pageCents.bw)}/page)</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={colour} onChange={() => setColour(true)} /> Colour ({formatCents(RATES.pageCents.colour)}/page)</label>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-500">Price per letter at this volume</p>
          <p className="text-2xl font-bold text-gray-900">{m(e.steady_state_letter_cents)}</p>
          <p className="text-xs text-gray-500">all in, postage included{e.steady_state_saving_pct > 0 ? ` · ${e.steady_state_saving_pct}% below list` : ""}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-500">A month at this volume</p>
          <p className="text-2xl font-bold text-gray-900">{m(e.steady_state_month_cents)}</p>
          <p className="text-xs text-gray-500">{e.letters_per_month.toLocaleString("en-CA")} letters, one invoice</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-500">Your first 30 days, starting from zero</p>
          <p className="text-2xl font-bold text-gray-900">{m(e.first_30_days_average_cents)}</p>
          <p className="text-xs text-gray-500">average per letter while you ramp up</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        List price for this letter: {m(e.list_letter_cents)}. Canadian dollars. Postage is passed through at cost and is {formatCents(RATES.stampCents)} a stamp; only the mailing fee is discounted.
      </p>
    </div>
  );
}
