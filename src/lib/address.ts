// Server-side address handling for the web flow. The recipient must be in
// Canada (the brand and the postage tables are Canada-only). The return
// address is either structured, or "free-form": a few unlabeled lines for
// addresses that don't fit Canadian fields (e.g. a sender abroad). Free-form
// changes only how the address is entered and printed, nothing about pricing.

import { stripControl } from "./sanitize";

export class AddressError extends Error {}

export type ToAddress = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
};

export type FromAddress =
  | { kind: "structured"; name: string; line1: string; line2: string; city: string; province: string; postalCode: string; country: string }
  | { kind: "freeform"; lines: string[] };

const CA_POSTAL = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
const MAX_FIELD = 100;
const MAX_FREE_LINES = 6;
const MAX_FREE_LINE = 80; // keeps six lines inside Stripe's 500-character metadata value

const clean = (v: unknown, max = MAX_FIELD): string =>
  stripControl(typeof v === "string" ? v : "").trim().slice(0, max);

export function parseTo(raw: unknown): ToAddress {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const country = clean(a.country || "CA").toUpperCase();
  if (country !== "CA") throw new AddressError("Letters can only be mailed to Canadian addresses.");
  const to: ToAddress = {
    name: clean(a.name),
    line1: clean(a.line1),
    line2: clean(a.line2),
    city: clean(a.city),
    province: clean(a.province, 3).toUpperCase(),
    postalCode: clean(a.postalCode, 7).toUpperCase(),
  };
  if (!to.name || !to.line1 || !to.city || !to.province || !to.postalCode) {
    throw new AddressError("Please complete the recipient's name, address, city, province and postal code.");
  }
  if (!CA_POSTAL.test(to.postalCode)) throw new AddressError("The recipient's postal code isn't valid (A1A 1A1).");
  return to;
}

export function parseFrom(raw: unknown): FromAddress {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (a.freeform === true || Array.isArray(a.lines)) {
    const lines = (Array.isArray(a.lines) ? a.lines : [])
      .map((l) => clean(l, MAX_FREE_LINE))
      .filter(Boolean)
      .slice(0, MAX_FREE_LINES);
    if (lines.length === 0) throw new AddressError("Please enter a return address.");
    return { kind: "freeform", lines };
  }
  const from = {
    kind: "structured" as const,
    name: clean(a.name),
    line1: clean(a.line1),
    line2: clean(a.line2),
    city: clean(a.city),
    province: clean(a.province, 3),
    postalCode: clean(a.postalCode, 12),
    country: clean(a.country || "CA", 2).toUpperCase(),
  };
  if (!from.name || !from.line1 || !from.city) throw new AddressError("Please complete the return address.");
  return from;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", FR: "France", DE: "Germany", AU: "Australia",
};

/** The lines to print for an address, top to bottom. */
export function toLines(a: ToAddress): string[] {
  return [a.name, a.line1, a.line2, `${a.city} ${a.province}  ${a.postalCode}`].filter(Boolean);
}

export function fromLines(a: FromAddress): string[] {
  if (a.kind === "freeform") return a.lines;
  const place = [a.city, a.province].filter(Boolean).join(" ");
  const lines = [a.name, a.line1, a.line2, [place, a.postalCode].filter(Boolean).join("  ")];
  if (a.country && a.country !== "CA") lines.push(COUNTRY_NAMES[a.country] ?? a.country);
  return lines.filter(Boolean);
}

/**
 * Stripe metadata keys for these addresses. Free-form FROM goes in `fromLines`
 * (newline-separated) with the first line mirrored into fromName so anything
 * reading the old keys still shows something sensible.
 */
export function addressMetadata(from: FromAddress, to: ToAddress): Record<string, string> {
  const base: Record<string, string> = {
    toName: to.name, toLine1: to.line1, toLine2: to.line2, toCity: to.city,
    toProvince: to.province, toPostal: to.postalCode, toCountry: "CA",
  };
  if (from.kind === "freeform") {
    return {
      ...base,
      fromName: from.lines[0], fromLine1: "", fromLine2: "", fromCity: "", fromProvince: "", fromPostal: "", fromCountry: "",
      fromLines: from.lines.join("\n"),
    };
  }
  return {
    ...base,
    fromName: from.name, fromLine1: from.line1, fromLine2: from.line2, fromCity: from.city,
    fromProvince: from.province, fromPostal: from.postalCode, fromCountry: from.country,
  };
}

/** Rebuild the return-address lines from Stripe metadata. */
export function fromLinesFromMetadata(m: Record<string, string>): string[] {
  if (m.fromLines) return m.fromLines.split("\n").filter(Boolean);
  return fromLines({
    kind: "structured", name: m.fromName || "", line1: m.fromLine1 || "", line2: m.fromLine2 || "",
    city: m.fromCity || "", province: m.fromProvince || "", postalCode: m.fromPostal || "", country: m.fromCountry || "CA",
  });
}

export function toLinesFromMetadata(m: Record<string, string>): string[] {
  return toLines({
    name: m.toName || "", line1: m.toLine1 || "", line2: m.toLine2 || "", city: m.toCity || "",
    province: m.toProvince || "", postalCode: m.toPostal || "",
  });
}
