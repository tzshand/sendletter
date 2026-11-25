"use client";

import { Palette, BookOpen } from "lucide-react";
import type { Language } from "./LetterSettings";
import { RATES, formatCents } from "@/lib/pricing";

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            value === o.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {o.label}
          {o.hint && <span className="block text-[10px] font-normal text-gray-400">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/** Colour and double-sided. Both apply to the whole letter. */
export function PrintOptions({
  colour,
  duplex,
  onColour,
  onDuplex,
  language,
}: {
  colour: boolean;
  duplex: boolean;
  onColour: (c: boolean) => void;
  onDuplex: (d: boolean) => void;
  language: Language;
}) {
  const isFr = language === "fr";
  const perPage = (c: number) => (isFr ? `${formatCents(c, "fr")} / page` : `${formatCents(c)} / page`);
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
          <Palette className="w-3.5 h-3.5" />
          {isFr ? "Couleur" : "Colour"}
        </div>
        <Segmented
          value={colour ? "colour" : "bw"}
          onChange={(v) => onColour(v === "colour")}
          options={[
            { value: "colour", label: isFr ? "Couleur" : "Colour", hint: perPage(RATES.pageCents.colour) },
            { value: "bw", label: isFr ? "Noir et blanc" : "Black & white", hint: perPage(RATES.pageCents.bw) },
          ]}
        />
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" />
          {isFr ? "Impression" : "Printing"}
        </div>
        <Segmented
          value={duplex ? "double" : "single"}
          onChange={(v) => onDuplex(v === "double")}
          options={[
            { value: "double", label: isFr ? "Recto verso" : "Double-sided" },
            { value: "single", label: isFr ? "Recto seul" : "Single-sided" },
          ]}
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          {isFr
            ? "Même prix par page. Le recto verso utilise moins de feuilles et peut réduire l'affranchissement."
            : "Same price per page. Double-sided uses fewer sheets and can lower postage."}
        </p>
      </div>
    </div>
  );
}
