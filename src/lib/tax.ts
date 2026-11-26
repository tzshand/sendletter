// Sales tax on invoices. Switched OFF for now: we are a small supplier and not
// registered to collect GST/HST/QST, so every tax is calculated and shown but
// charged as $0.00. Turn collection on (when revenue passes the registration
// threshold, or on request) by setting TAX_COLLECTING=1 in the environment; no
// code change is needed. Rates below must be re-checked at that point.
//
// Which tax: by the CUSTOMER's province (place of supply). We take it from the
// account's tax_province if set, else from the billing address of the card that
// is charged, else Quebec (we are in Quebec, so that is the fallback; never "no tax").

export type TaxCode = "GST" | "HST" | "PST" | "QST";
export type TaxRate = { code: TaxCode; rate: number }; // rate in percent
export type TaxLine = { code: TaxCode; rate: number; cents: number };

export const FALLBACK_PROVINCE = "QC";

// Percent. Provincial retail/sales taxes (BC PST, SK PST, MB RST) only apply if we
// would be registered there; they are listed so the calculation is complete.
const REGIMES: Record<string, TaxRate[]> = {
  AB: [{ code: "GST", rate: 5 }],
  BC: [{ code: "GST", rate: 5 }, { code: "PST", rate: 7 }],
  MB: [{ code: "GST", rate: 5 }, { code: "PST", rate: 7 }],
  NB: [{ code: "HST", rate: 15 }],
  NL: [{ code: "HST", rate: 15 }],
  NS: [{ code: "HST", rate: 14 }],
  NT: [{ code: "GST", rate: 5 }],
  NU: [{ code: "GST", rate: 5 }],
  ON: [{ code: "HST", rate: 13 }],
  PE: [{ code: "HST", rate: 15 }],
  QC: [{ code: "GST", rate: 5 }, { code: "QST", rate: 9.975 }],
  SK: [{ code: "GST", rate: 5 }, { code: "PST", rate: 6 }],
  YT: [{ code: "GST", rate: 5 }],
};

const NAMES: Record<string, string> = {
  alberta: "AB", "british columbia": "BC", "colombie-britannique": "BC", manitoba: "MB", "new brunswick": "NB", "nouveau-brunswick": "NB",
  "newfoundland and labrador": "NL", "terre-neuve-et-labrador": "NL", "nova scotia": "NS", "nouvelle-ecosse": "NS", "northwest territories": "NT",
  "territoires du nord-ouest": "NT", nunavut: "NU", ontario: "ON", "prince edward island": "PE", "ile-du-prince-edouard": "PE", quebec: "QC",
  saskatchewan: "SK", yukon: "YT",
};

/** "QC", "Quebec", "Québec" -> "QC"; anything unrecognised -> null. */
export function normalizeProvince(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  if (REGIMES[s.toUpperCase()]) return s.toUpperCase();
  const k = s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ");
  return NAMES[k] ?? null;
}

/** The province tax is based on: the customer's if known and Canadian, else Quebec. */
export function taxProvince(...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) {
    const p = normalizeProvince(c);
    if (p) return p;
  }
  return FALLBACK_PROVINCE;
}

export const taxCollecting = () => process.env.TAX_COLLECTING === "1";

export const regimeFor = (province: string): TaxRate[] => REGIMES[province] ?? REGIMES[FALLBACK_PROVINCE];

/**
 * Tax on one line. Always computes the rates for the customer's province; the cents
 * are only non-zero when collection is on. Each tax is rounded to the cent on its own.
 */
export function taxForLine(amountCents: number, province: string, collecting = taxCollecting()): TaxLine[] {
  return regimeFor(province).map(({ code, rate }) => ({ code, rate, cents: collecting ? Math.round((amountCents * rate) / 100) : 0 }));
}

export const sumTax = (lines: TaxLine[]) => lines.reduce((s, l) => s + l.cents, 0);

/** Add up per-line tax by code, in the regime's order. */
export function totalsByCode(perLine: TaxLine[][], province: string): TaxLine[] {
  return regimeFor(province).map(({ code, rate }) => ({
    code,
    rate,
    cents: perLine.reduce((s, ls) => s + (ls.find((l) => l.code === code)?.cents ?? 0), 0),
  }));
}

export const taxLabel = (t: { code: TaxCode; rate: number }) => `${t.code} (${t.rate}%)`;

export const TAX_NOTE_UNREGISTERED =
  "We are not currently registered to collect GST/HST or QST, so no sales tax is charged. Tax is shown at $0.00 for the customer's province.";
