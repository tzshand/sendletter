"use client";

// "How many stamps?" The same weight model and Canada Post rates the checkout
// prices with (lib/pricing.ts), run in the browser. It leans heavy on purpose:
// a stamp too many costs a dollar, a stamp too few means postage due.

import { useMemo, useState } from "react";
import { RATES, MAX_MAILING_GRAMS, formatCents, requiredPostageCents, stampsFor, weightGrams, type LetterSize } from "@/lib/pricing";

const COPY = {
  en: {
    group: "Stamp calculator", sheets: "Count the sheets", weighed: "I have weighed it", envelope: "Envelope",
    sizes: { standard: "Standard envelope (#10 business envelope)", large: "Large envelope (9×12 in)", legal: "Legal-size envelope (10×15 in)" },
    sheetsLabel: "Sheets of paper (a double-sided sheet is one)", gramsLabel: "Weight of the whole letter, in grams",
    estWeight: "Estimated weight", weight: "Weight", rate: "Postage rate", stamps: "Permanent stamps needed", each: "at",
    over: (max: number) => `Over ${max} g is not Lettermail. Split it into more than one envelope, or ask a Canada Post counter about a parcel service.`,
    foot: "Within Canada, Lettermail, Canadian dollars. The estimate assumes 90 gsm paper and a sturdy envelope and rounds up. If the result is close to a weight limit, weigh the letter on a kitchen scale.",
    na: "n/a",
  },
  fr: {
    group: "Calculateur de timbres", sheets: "Compter les feuilles", weighed: "J’ai pesé la lettre", envelope: "Enveloppe",
    sizes: { standard: "Enveloppe standard (enveloppe commerciale no 10)", large: "Grande enveloppe (9 × 12 po)", legal: "Enveloppe de format légal (10 × 15 po)" },
    sheetsLabel: "Feuilles de papier (une feuille recto verso compte pour une)", gramsLabel: "Poids de la lettre complète, en grammes",
    estWeight: "Poids estimé", weight: "Poids", rate: "Tarif d’affranchissement", stamps: "Timbres Permanents nécessaires", each: "à",
    over: (max: number) => `Au-delà de ${max} g, il ne s’agit plus de Poste-lettres. Répartissez le contenu dans plus d’une enveloppe ou renseignez-vous au comptoir de Postes Canada sur un service de colis.`,
    foot: "Au Canada, Poste-lettres, en dollars canadiens. L’estimation suppose du papier de 90 g/m² et une enveloppe robuste, et elle arrondit à la hausse. Si le résultat est près d’une limite de poids, pesez la lettre sur une balance de cuisine.",
    na: "s. o.",
  },
} as const;

export function PostageCalculator({ locale = "en" }: { locale?: "en" | "fr" }) {
  const t = COPY[locale];
  const SIZES: { v: LetterSize; label: string }[] = [
    { v: "standard", label: t.sizes.standard }, { v: "large", label: t.sizes.large }, { v: "legal", label: t.sizes.legal },
  ];
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
    <div className="my-6 rounded-xl border border-gray-200 bg-white p-5" role="group" aria-label={t.group}>
      <div className="flex gap-4 text-sm text-gray-700 mb-4">
        <label className="flex items-center gap-1.5"><input type="radio" checked={mode === "sheets"} onChange={() => setMode("sheets")} /> {t.sheets}</label>
        <label className="flex items-center gap-1.5"><input type="radio" checked={mode === "grams"} onChange={() => setMode("grams")} /> {t.weighed}</label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="pc-s">{t.envelope}</label>
          <select id="pc-s" value={size} onChange={(e) => setSize(e.target.value as LetterSize)} className="input input-sm w-full">
            {SIZES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        {mode === "sheets" ? (
          <div>
            <label className={label} htmlFor="pc-n">{t.sheetsLabel}</label>
            <input id="pc-n" type="number" min={1} max={60} value={sheets} onChange={(e) => setSheets(Number(e.target.value))} className="input input-sm w-full" />
          </div>
        ) : (
          <div>
            <label className={label} htmlFor="pc-g">{t.gramsLabel}</label>
            <input id="pc-g" type="number" min={1} max={2000} value={grams} onChange={(e) => setGrams(Number(e.target.value))} className="input input-sm w-full" />
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-5" aria-live="polite">
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-500">{mode === "sheets" ? t.estWeight : t.weight}</p>
          <p className="text-2xl font-bold text-gray-900">{r.g}{" "}g</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-500">{t.rate}</p>
          <p className="text-2xl font-bold text-gray-900">{r.cents === null ? t.na : formatCents(r.cents, locale)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-500">{t.stamps}</p>
          <p className="text-2xl font-bold text-gray-900">{r.stamps === null ? t.na : r.stamps}</p>
          {r.stamps !== null && <p className="text-xs text-gray-500">{formatCents(r.stamps * RATES.stampCents, locale)} {t.each} {formatCents(RATES.stampCents, locale)}{locale === "en" ? " each" : " chacun"}</p>}
        </div>
      </div>
      {r.cents === null && (
        <p className="text-sm text-red-700 mt-3">{t.over(MAX_MAILING_GRAMS)}</p>
      )}
      <p className="text-xs text-gray-500 mt-3">{t.foot}</p>
    </div>
  );
}
