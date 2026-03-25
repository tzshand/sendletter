"use client";

import { useState } from "react";
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
    desc: "8.5×11 tri-fold, #10 envelope",
    descFr: "8,5×11 pli en trois, enveloppe #10",
  },
  large: {
    maxPages: 15,
    priceAdd: 1.99,
    label: "Letter",
    labelFr: "Lettre",
    desc: "8.5×11 flat, 9×12 envelope",
    descFr: "8,5×11 à plat, enveloppe 9×12",
  },
  legal: {
    maxPages: 15,
    priceAdd: 1.99,
    label: "Legal",
    labelFr: "Légal",
    desc: "8.5×14 flat, 10×15 envelope",
    descFr: "8,5×14 à plat, enveloppe 10×15",
  },
};

const BASE_PRICE = 3.79;

const ICONS: Record<LetterSize, React.ReactNode> = {
  standard: <Mail className="w-4 h-4" />,
  large: <FileText className="w-4 h-4" />,
  legal: <ScrollText className="w-4 h-4" />,
};

export function getPrice(size: LetterSize): number {
  return BASE_PRICE + LETTER_SIZE_CONFIG[size].priceAdd;
}

export function formatPrice(size: LetterSize): string {
  const p = getPrice(size);
  return p % 1 === 0 ? `$${p}` : `$${p.toFixed(2)}`;
}

export function LetterSizeSelector({
  value,
  onChange,
  language,
  pageCount = 1,
}: {
  value: LetterSize;
  onChange: (s: LetterSize) => void;
  language: Language;
  pageCount?: number;
}) {
  const isFr = language === "fr";
  const sizes: LetterSize[] = ["standard", "large", "legal"];
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-3 gap-2">
      {sizes.map((size) => {
        const cfg = LETTER_SIZE_CONFIG[size];
        const active = value === size;
        const disabled = pageCount > cfg.maxPages;
        return (
          <button
            key={size}
            type="button"
            onClick={() => {
              if (disabled) {
                setTooltip(
                  isFr
                    ? `${cfg.labelFr} supporte jusqu'à ${cfg.maxPages} pages (votre document : ${pageCount})`
                    : `${cfg.label} supports up to ${cfg.maxPages} pages (your document: ${pageCount})`
                );
                setTimeout(() => setTooltip(null), 3000);
                return;
              }
              setTooltip(null);
              onChange(size);
            }}
            className={`relative flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-center ${
              disabled
                ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                : active
                  ? "border-brand bg-brand/5 text-gray-900"
                  : "border-gray-200 hover:border-gray-300 text-gray-500"
            }`}
          >
            <div className={disabled ? "text-gray-300" : active ? "text-brand" : "text-gray-400"}>
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
                <span className={disabled ? "text-gray-300" : "text-amber-600"}>+${cfg.priceAdd % 1 === 0 ? cfg.priceAdd : cfg.priceAdd.toFixed(2)}</span>
              ) : (
                <span className={disabled ? "text-gray-300" : "text-brand"}>${BASE_PRICE}</span>
              )}
            </span>
            <span className="text-[9px] text-gray-400">
              {isFr ? "jusqu'à" : "up to"} {cfg.maxPages} pages
            </span>
          </button>
        );
      })}
      {tooltip && (
        <p className="col-span-3 text-xs text-amber-600 text-center mt-1">{tooltip}</p>
      )}
    </div>
  );
}
