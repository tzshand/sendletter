"use client";

import { Mail, FileText, ScrollText } from "lucide-react";
import type { Language } from "./LetterSettings";
import { quote, formatCents, type LetterSize } from "@/lib/pricing";

export type { LetterSize };

const OPTIONS: {
  size: LetterSize;
  label: string;
  labelFr: string;
  desc: string;
  descFr: string;
  icon: React.ReactNode;
}[] = [
  {
    size: "standard",
    label: "Standard",
    labelFr: "Standard",
    desc: "#10 window envelope, folded",
    descFr: "Enveloppe #10 à fenêtre, pliée",
    icon: <Mail className="w-4 h-4" />,
  },
  {
    size: "large",
    label: "Letter",
    labelFr: "Lettre",
    desc: "8.5×11 flat, 9×12 envelope",
    descFr: "8,5×11 à plat, enveloppe 9×12",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    size: "legal",
    label: "Legal",
    labelFr: "Légal",
    desc: "8.5×14 flat, 10×15 envelope",
    descFr: "8,5×14 à plat, enveloppe 10×15",
    icon: <ScrollText className="w-4 h-4" />,
  },
];

/** Envelope choice. Each option shows what your letter would cost in it, live. */
export function LetterSizeSelector({
  value,
  onChange,
  language,
  pages,
  colour,
  duplex,
}: {
  value: LetterSize;
  onChange: (s: LetterSize) => void;
  language: Language;
  pages: number;
  colour: boolean;
  duplex: boolean;
}) {
  const isFr = language === "fr";

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((o) => {
        const active = value === o.size;
        let price: string | null = null;
        let note: string | null = null;
        try {
          const q = quote({ pages, size: o.size, colour, duplex, channel: "web" });
          price = formatCents(q.totalCents, language);
          note =
            q.mailings.length > 1
              ? isFr ? `${q.mailings.length} enveloppes` : `${q.mailings.length} envelopes`
              : isFr ? `${q.stamps} timbre${q.stamps > 1 ? "s" : ""}` : `${q.stamps} stamp${q.stamps > 1 ? "s" : ""}`;
        } catch {
          /* page count out of range: shown by the page-limit message instead */
        }
        return (
          <button
            key={o.size}
            type="button"
            onClick={() => onChange(o.size)}
            aria-pressed={active}
            className={`relative flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-center ${
              active ? "border-brand bg-brand/5 text-gray-900" : "border-gray-200 hover:border-gray-300 text-gray-500"
            }`}
          >
            <div className={active ? "text-brand" : "text-gray-400"}>{o.icon}</div>
            <span className="text-xs font-semibold">{isFr ? o.labelFr : o.label}</span>
            <span className="text-[10px] text-gray-400 leading-tight">{isFr ? o.descFr : o.desc}</span>
            {price && <span className={`text-xs font-bold mt-0.5 ${active ? "text-brand" : "text-gray-600"}`}>{price}</span>}
            {note && <span className="text-[9px] text-gray-400">{note}</span>}
          </button>
        );
      })}
    </div>
  );
}
