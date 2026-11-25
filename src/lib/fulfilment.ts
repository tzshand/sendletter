// The "what do I print, fold and stamp" part of the internal order email, shared
// by web orders and API orders. All stamp and weight decisions come from the
// quote (lib/pricing.ts); the owner just follows this.

import { RATES, SIZE_LABELS, formatCents, type Quote, type QuoteLine } from "./pricing";
import { escapeHtml } from "./sanitize";

const eh = escapeHtml;

const LINE_LABEL: Record<QuoteLine["key"], string> = {
  base: "Mailing fee",
  envelope: "Envelope",
  pages: "Printing",
  postage: "Postage (stamps)",
};

const lines = (ls: string[]) => ls.map(eh).join("<br/>");

export function quoteTableHtml(q: Quote): string {
  const rows = q.lines
    .map(
      (l) =>
        `<tr><td style="padding:3px 0;color:#666;">${LINE_LABEL[l.key]}${l.qty > 1 ? ` &times; ${l.qty}` : ""}</td><td style="padding:3px 0;text-align:right;">${formatCents(l.totalCents)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;font-size:12px;border-collapse:collapse;">${rows}<tr><td style="padding:6px 0 0;font-weight:600;border-top:1px solid #ddd;">Total</td><td style="padding:6px 0 0;text-align:right;font-weight:600;border-top:1px solid #ddd;">${formatCents(q.totalCents)}</td></tr></table>`;
}

export function fulfilmentHtml(opts: {
  q: Quote;
  from: string[];
  to: string[];
  /** Files-store folder holding the print-ready PDFs, e.g. drafts/<id>/ */
  stagedPath?: string;
  /** Names of the print PDFs built for this order (empty for a .docx/HTML order). */
  printFiles: string[];
  /** Files that were attached to the email (the rest must be fetched). */
  attached: string[];
  note?: string;
}): string {
  const { q, from, to, stagedPath, printFiles, attached, note } = opts;
  const flat = q.size !== "standard";

  const mailingRows = q.mailings
    .map((m) => {
      const have = RATES.stampCents * m.stamps;
      const file = printFiles[m.index - 1];
      return `<tr>
  <td style="padding:5px 8px 5px 0;vertical-align:top;"><strong>${q.mailings.length > 1 ? `Mailing ${m.index} of ${q.mailings.length}` : "Mailing"}</strong></td>
  <td style="padding:5px 0;">pages ${m.pageStart}&ndash;${m.pageEnd} &middot; ${m.sheets} sheet${m.sheets > 1 ? "s" : ""} &middot; ~${m.weightGrams} g<br/>
  <strong>${m.stamps} &times; $1.24 stamp${m.stamps > 1 ? "s" : ""}</strong> = ${formatCents(have)} (Canada Post needs ${formatCents(m.requiredPostageCents)})${file ? `<br/><span style="font-family:monospace;font-size:11px;color:#666;">${eh(file)}</span>` : ""}</td>
</tr>`;
    })
    .join("");

  const printLine = `${q.colour ? "<strong>COLOUR</strong>" : "<strong>BLACK &amp; WHITE</strong>"} &middot; ${q.duplex ? "<strong>DOUBLE-SIDED</strong> (flip on long edge)" : "<strong>SINGLE-SIDED</strong>"} &middot; ${eh(SIZE_LABELS[q.size])}`;

  const addressHelp = flat
    ? `<p style="margin:10px 0 4px;font-weight:600;">Hand-address each envelope</p>
<table style="width:100%;font-size:13px;"><tr>
<td style="vertical-align:top;width:50%;"><div style="color:#888;font-size:11px;">TO</div>${lines(to)}</td>
<td style="vertical-align:top;width:50%;"><div style="color:#888;font-size:11px;">FROM (write on the outside: undeliverable mail is then returned free)</div>${lines(from)}</td>
</tr></table>`
    : `<p style="margin:10px 0 4px;font-weight:600;">Window envelope</p>
<p style="margin:0;font-size:12px;color:#555;">Sheet 1 is the address page (${q.duplex ? "letter page 1 is on its back" : "single-sided: it is its own sheet"}). Fold in thirds with the address showing through the window. The return address is above the window and is not visible until opened.</p>`;

  return `<div style="border:1px solid #e5e5e5;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:13px;">
<div style="font-weight:700;margin-bottom:6px;">Print &amp; stamp</div>
<div style="margin-bottom:8px;">${printLine}</div>
<table style="width:100%;font-size:13px;border-collapse:collapse;">${mailingRows}</table>
${addressHelp}
${note ? `<p style="margin:10px 0 0;font-size:12px;color:#b3261e;">${eh(note)}</p>` : ""}
<p style="margin:10px 0 0;font-size:11px;color:#888;">${
    printFiles.length
      ? `Print-ready PDF${printFiles.length > 1 ? "s" : ""}: ${attached.length ? "attached" : "not attached (too large)"}${stagedPath ? `; also in the files store: <span style="font-family:monospace;">canner files ls ${eh(stagedPath)}</span>` : ""}`
      : "No print-ready PDF for this order (a .docx or HTML letter): print the attached original."
  }</p>
</div>
<div style="margin:12px 0;">${quoteTableHtml(q)}</div>`;
}

const RECEIPT_LABEL: Record<"en" | "fr", Record<QuoteLine["key"], string>> = {
  en: { base: "Mailing fee", envelope: "Envelope", pages: "Printing", postage: "Canada Post postage" },
  fr: { base: "Frais d'envoi", envelope: "Enveloppe", pages: "Impression", postage: "Affranchissement Postes Canada" },
};

/** Itemised receipt for the customer's confirmation email. */
export function receiptHtml(q: Quote, lang: "en" | "fr"): string {
  const L = RECEIPT_LABEL[lang];
  const unit = (l: QuoteLine) =>
    l.key === "pages" ? `${l.qty} &times; ${formatCents(l.unitCents, lang)}` : l.qty > 1 ? `${l.qty} &times; ${formatCents(l.unitCents, lang)}` : "";
  const rows = q.lines
    .map(
      (l) =>
        `<tr><td style="padding:3px 0;color:#666;">${L[l.key]}${unit(l) ? ` <span style="color:#aaa;">(${unit(l)})</span>` : ""}</td><td style="padding:3px 0;text-align:right;">${formatCents(l.totalCents, lang)}</td></tr>`,
    )
    .join("");
  const note =
    q.mailings.length > 1
      ? `<p style="font-size:12px;color:#888;margin:6px 0 0;">${
          lang === "fr"
            ? `Votre lettre sera postée dans ${q.mailings.length} enveloppes (elle est trop volumineuse pour une seule).`
            : `Your letter will arrive in ${q.mailings.length} envelopes (it's too large for one).`
        }</p>`
      : "";
  return `<table style="width:100%;font-size:12px;border-collapse:collapse;margin:0 0 8px;">${rows}</table>${note}`;
}
