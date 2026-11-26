// A plain, printable PDF of an invoice (pdf-lib, standard fonts, the goose logo top left).

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InvoiceEmailData } from "@/lib/emails";
import { LOGO_PNG_BASE64 } from "@/lib/logo-data";
import { TAX_NOTE_UNREGISTERED, taxLabel } from "@/lib/tax";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
// Standard PDF fonts cover Latin-1 only: anything else (a name in another script) becomes "?".
const safe = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7e -ÿ]/g, "?");

export type InvoicePdfData = InvoiceEmailData & { billedTo: string; billedToLines?: string[]; paidAt?: string | null; reference?: string | null };

export async function invoicePdf(inv: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(Buffer.from(LOGO_PNG_BASE64, "base64"));
  const W = 612, H = 792, M = 54;
  const coral = rgb(0.941, 0.318, 0.235);
  const grey = rgb(0.42, 0.45, 0.5);
  const ink = rgb(0.1, 0.1, 0.1);
  const colAmount = W - M - 80; // right edge of the Amount column
  const colTax = W - M; // right edge of the Tax column
  let page = doc.addPage([W, H]);
  let y = H - M;
  const text = (s: string, x: number, size = 10, f = font, color = ink) => page.drawText(safe(s), { x, y, size, font: f, color });
  const right = (s: string, xr: number, size = 10, f = font, color = ink) => page.drawText(safe(s), { x: xr - f.widthOfTextAtSize(safe(s), size), y, size, font: f, color });
  const rule = () => page.drawLine({ start: { x: M, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 0.7, color: rgb(0.85, 0.85, 0.85) });
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };

  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: coral });
  // Logo top left, name beside it.
  page.drawImage(logo, { x: M, y: H - M - 44, width: 52, height: 52 });
  y = H - M - 16;
  text("sendletter", M + 64, 20, bold);
  y -= 16; text("sendletter.app  |  support@sendletter.app", M + 64, 9, font, grey);
  y = H - M - 84;
  text(`Invoice ${inv.number}`, M, 16, bold);
  y -= 16; text(`${inv.date}${inv.paidAt ? `   |   Paid ${inv.paidAt}` : ""}`, M, 10, font, grey);
  y -= 22; text("Billed to", M, 9, font, grey);
  const billed = inv.billedToLines?.length ? inv.billedToLines : [inv.billedTo];
  billed.forEach((l, i) => { y -= i === 0 ? 13 : 12; text(l, M, i === 0 ? 11 : 10, i === 0 ? bold : font, i === 0 ? ink : grey); });
  y -= 32;
  rule();
  text("Description", M, 9, bold, grey); right("Amount", colAmount, 9, bold, grey); right("Tax", colTax, 9, bold, grey);
  y -= 20;
  for (const l of inv.lines) {
    const full = safe(l.description);
    let d = full;
    while (font.widthOfTextAtSize(d, 10) > colAmount - M - 90 && d.length > 4) d = d.slice(0, -2);
    if (d !== full) d = d.trimEnd() + "...";
    if (y < M + 130) newPage();
    text(d, M, 10); right(money(l.amount_cents), colAmount); right(money(l.tax_cents), colTax);
    y -= 16;
  }
  y -= 8;
  if (y < M + 130) newPage();
  rule();
  y -= 6;
  const total = (label: string, cents: number, f = font, size = 10) => { right(label, colAmount - 30, size, f); right(money(cents), colTax, size, f); y -= size + 6; };
  total("Subtotal", inv.subtotalCents);
  for (const t of inv.taxes) total(taxLabel(t), t.cents);
  y -= 2;
  total("Total (CAD)", inv.totalCents, bold, 12);
  y -= 14;
  text(`${inv.letters} letter${inv.letters === 1 ? "" : "s"}. Postage is included at cost.`, M, 9, font, grey);
  if (!inv.taxCollected) {
    const cut = TAX_NOTE_UNREGISTERED.indexOf(" Tax is shown");
    for (const part of [TAX_NOTE_UNREGISTERED.slice(0, cut), TAX_NOTE_UNREGISTERED.slice(cut + 1)]) { y -= 11; text(part, M, 8, font, grey); }
  }
  if (inv.reference) { y -= 13; text(`Paid by card (reference ${inv.reference}).`, M, 9, font, grey); }
  return doc.save();
}
