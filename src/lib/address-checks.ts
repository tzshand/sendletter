// Soft checks on a Canadian address: things that are probably wrong but that we
// will not refuse over. This is NOT address verification: it cannot tell whether
// a street exists. It catches the cheap, common error of a postal code that
// belongs to a different province than the one written, using Canada Post's own
// table of what the first letter of a postal code means.
// Source: https://www.canadapost-postescanada.ca/cpc/en/support/articles/addressing-guidelines/postal-codes.page

import type { Warning } from "./letters";

/** First letter of a postal code -> provinces and territories it can belong to. */
const FIRST_LETTER: Record<string, string[]> = {
  A: ["NL"], B: ["NS"], C: ["PE"], E: ["NB"],
  G: ["QC"], H: ["QC"], J: ["QC"],
  K: ["ON"], L: ["ON"], M: ["ON"], N: ["ON"], P: ["ON"],
  R: ["MB"], S: ["SK"], T: ["AB"], V: ["BC"],
  X: ["NT", "NU"], Y: ["YT"],
};

const PROVINCE_NAMES: Record<string, string> = {
  ALBERTA: "AB", "BRITISH COLUMBIA": "BC", MANITOBA: "MB", "NEW BRUNSWICK": "NB",
  "NEWFOUNDLAND AND LABRADOR": "NL", "NOVA SCOTIA": "NS", "NORTHWEST TERRITORIES": "NT", NUNAVUT: "NU",
  ONTARIO: "ON", "PRINCE EDWARD ISLAND": "PE", QUEBEC: "QC", "QUÉBEC": "QC", SASKATCHEWAN: "SK", YUKON: "YT",
};

const CODES = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);

export function provinceCode(input: string | undefined): string | null {
  if (!input) return null;
  const v = input.trim().toUpperCase();
  if (CODES.has(v)) return v;
  return PROVINCE_NAMES[v] ?? null;
}

export function checkCanadianAddress(field: string, a: { province?: string; postal_code?: string; country?: string }): Warning[] {
  const out: Warning[] = [];
  if ((a.country ?? "CA").toUpperCase() !== "CA") return out;
  const code = provinceCode(a.province);
  const first = a.postal_code?.trim().charAt(0).toUpperCase();
  if (a.province && !code) {
    out.push({ field: `${field}.province`, code: "unrecognised_province", message: `"${a.province}" is not a Canadian province or territory code (use e.g. ON, QC, BC).` });
  }
  if (code && first && FIRST_LETTER[first] && !FIRST_LETTER[first].includes(code)) {
    out.push({
      field: `${field}.postal_code`, code: "province_postal_mismatch",
      message: `Postal codes starting with ${first} are in ${FIRST_LETTER[first].join(" or ")}, not ${code}. Check the province and the postal code.`,
    });
  }
  return out;
}
