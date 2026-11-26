"use client";

// "How many stamps?" The same weight model and Canada Post rates the checkout
// prices with (lib/pricing.ts), run in the browser. It leans heavy on purpose:
// a stamp too many costs a dollar, a stamp too few means postage due.

import { useMemo, useState } from "react";
import { RATES, MAX_MAILING_GRAMS, formatCents, requiredPostageCents, stampsFor, weightGrams, type LetterSize } from "@/lib/pricing";

const SIZES: { v: LetterSize; label: string }[] = [
  { v: "standard", label: "Standard envelope (#10 business envelope)" },
  { v: "large", label: "Large envelope (9×12 in)" },
  { v: "legal", label: "Legal-size envelope (10×15 in)" },
];

export function PostageCalculator() {
  const [mode, setMode] = useState<"sheets" | "grams">("sheets");
  const [sheets, setSheets] = useState(2);
  const [size, setSize] = useState<LetterSize>("standard");
  const [grams, setGrams] = useState(25);

  const r = useMemo(() => {
    const g =
      mode === "grams"
        ? Math.min(2000, Math.max(1, Math.ceil(Number(grams) || 1)))
        : weightGrams(size, Math.min(60, Math.max(1, Math.floor(Number(sheets) || 1))));
    const cents = requiredPostageCents(size, g);
    return { g, cents, stamps: cents === null ? null : stampsFor(cents) };
  }, [mode, sheets, size, grams]);

  const label = "block text-xs font-semibold text-gray-500 mb-1";
  return (
    <div className="my-6 rounded-xl border border-gray-200 bg-white p-5" role="group" aria-label="Stamp calculator">
      <div className="flex gap-4 text-sm text-gray-700 mb-4">
        <label className="flex items-center gap-1.5"><input type="radio" checked={mode === "sheets"} onChange={() => setMode("sheets")} /> Count the sheets</label>
        <label className="flex items-center gap-1.5"><input type="radio" checked={mode === "grams"} onChange={() => setMode("grams")} /> I have weighed it</label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="pc-s">Envelope</label>
          <select id="pc-s" value={size} onChange={(e) => setSize(e.target.value as LetterSize)} className="input input-sm w-full">
            {SIZES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        {mode === "sheets" ? (
          <div>
            <label className={label} htmlFor="pc-n">Sheets of paper (a double-sided sheet is one)</label>
            <input id="pc-n" type="number" min={1} max={60} value={sheets} onChange={(e) => setSheets(Number(e.target.value))} className="input input-sm w-full" />
          </div>
        ) : (
          <div>
            <label className={label} htmlFor="pc-g">Weight of the whole letter, in grams</label>
            <input id="pc-g" type="number" min={1} max={2000} value={grams} onChange={(e) => setGrams(Number(e.target.value))} className="input input-sm w-full" />
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-5" aria-live="polite">
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-500">{mode === "sheets" ? "Estimated weight" : "Weight"}</p>
          <p className="text-2xl font-bold text-gray-900">{r.g} g</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-500">Postage rate</p>
          <p className="text-2xl font-bold text-gray-900">{r.cents === null ? "n/a" : formatCents(r.cents)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-500">Permanent stamps needed</p>
          <p className="text-2xl font-bold text-gray-900">{r.stamps === null ? "n/a" : r.stamps}</p>
          {r.stamps !== null && <p className="text-xs text-gray-500">{formatCents(r.stamps * RATES.stampCents)} at {formatCents(RATES.stampCents)} each</p>}
        </div>
      </div>
      {r.cents === null && (
        <p className="text-sm text-red-700 mt-3">Over {MAX_MAILING_GRAMS} g is not Lettermail. Split it into more than one envelope, or ask a Canada Post counter about a parcel service.</p>
      )}
      <p className="text-xs text-gray-500 mt-3">
        Within Canada, Lettermail, Canadian dollars. The estimate assumes 90 gsm paper and a sturdy envelope and rounds up. If the result is close to a weight limit, weigh the letter on a kitchen scale.
      </p>
    </div>
  );
}
