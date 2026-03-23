"use client";

import { Mail, FileText, ScrollText } from "lucide-react";
import type { Language } from "./LetterSettings";

export type LetterSize = "standard" | "legal" | "large";

export const LETTER_SIZE_CONFIG: Record<
  LetterSize,
  { maxPages: number; priceAdd: number; label: string; labelFr: string; desc: string; descFr: string }
> = {
  standard: {
    maxPages: 5,
    priceAdd: 0,
    label: "Standard",
    labelFr: "Standard",
    desc: "Tri-fold, #10 envelope",
    descFr: "Pli en trois, enveloppe #10",
  },
  large: {
    maxPages: 15,
    priceAdd: 1.5,
    label: "Letter",
    labelFr: "Lettre",
    desc: "8.5×11, flat envelope",
    descFr: "8,5×11, enveloppe plate",
  },
  legal: {
    maxPages: 15,
    priceAdd: 1.5,
    label: "Legal",
    labelFr: "Légal",
    desc: "8.5×14, large envelope",
    descFr: "8,5×14, grande enveloppe",
  },
};

const BASE_PRICE = 4.2;

const ICONS: Record<LetterSize, React.ReactNode> = {
  standard: <Mail className="w-4 h-4" />,
  large: <FileText className="w-4 h-4" />,
  legal: <ScrollText className="w-4 h-4" />,
};

export function getPrice(size: LetterSize): number {
  return BASE_PRICE + LETTER_SIZE_CONFIG[size].priceAdd;
}

export function formatPrice(size: LetterSize): string {
  return `$${getPrice(size).toFixed(2)}`;
}

export function LetterSizeSelector({
  value,
  onChange,
  language,
}: {
  value: LetterSize;
  onChange: (s: LetterSize) => void;
  language: Language;
}) {
  const isFr = language === "fr";
  const sizes: LetterSize[] = ["standard", "large", "legal"];

  return (
    <div className="grid grid-cols-3 gap-2">
      {sizes.map((size) => {
        const cfg = LETTER_SIZE_CONFIG[size];
        const active = value === size;
        return (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            className={`relative flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-center ${
              active
                ? "border-brand bg-brand/5 text-gray-900"
                : "border-gray-200 hover:border-gray-300 text-gray-500"
            }`}
          >
            <div className={active ? "text-brand" : "text-gray-400"}>
              {ICONS[size]}
            </div>
            <span className="text-xs font-semibold">
              {isFr ? cfg.labelFr : cfg.label}
            </span>
            <span className="text-[10px] text-gray-400 leading-tight">
              {isFr ? cfg.descFr : cfg.desc}
            </span>
            <span className="text-[10px] font-medium mt-0.5">
              {cfg.priceAdd > 0 ? (
                <span className="text-amber-600">+${cfg.priceAdd.toFixed(2)}</span>
              ) : (
                <span className="text-brand">${BASE_PRICE.toFixed(2)}</span>
              )}
            </span>
            <span className="text-[9px] text-gray-400">
              {isFr ? "jusqu'à" : "up to"} {cfg.maxPages} pages
            </span>
          </button>
        );
      })}
    </div>
  );
}
