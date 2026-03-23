export const PRICES: Record<string, number> = {
  standard: 429, // $4.29
  legal: 928,    // $9.28
  large: 928,    // $9.28
};

export const SIZE_LABELS: Record<string, string> = {
  standard: "Standard (8.5×11 tri-fold)",
  large: "Letter (8.5×11 flat)",
  legal: "Legal (8.5×14 flat)",
};

export const SIZE_LABELS_BILINGUAL: Record<string, { en: string; fr: string }> = {
  standard: { en: "Standard tri-fold", fr: "Standard pli en trois" },
  legal: { en: "Legal (8.5×14)", fr: "Légal (8,5×14)" },
  large: { en: "Letter (8.5×11)", fr: "Lettre (8,5×11)" },
};
