// A plain, printable PDF of an invoice (pdf-lib, standard fonts, nothing to ship).

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InvoiceEmailData } from "@/lib/emails";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
// Standard PDF fonts cover Latin-1 only: anything else (a name in another script) becomes "?".
const safe = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7e -ÿ]/g, "?");

export type InvoicePdfData = InvoiceEmailData & { billedTo: string; paidAt?: string | null; reference?: string | null };

export async function invoicePdf(inv: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, M = 54;
  const coral = rgb(0.941, 0.318, 0.235);
  const grey = rgb(0.42, 0.45, 0.5);
  const ink = rgb(0.1, 0.1, 0.1);
  let page = doc.addPage([W, H]);
  let y = H - M;
  const text = (s: string, x: number, size = 10, f = font, color = ink) => page.drawText(safe(s), { x, y, size, font: f, color });
  const right = (s: string, xr: number, size = 10, f = font) => page.drawText(safe(s), { x: xr - f.widthOfTextAtSize(safe(s), size), y, size, font: f, color: ink });
  const rule = () => page.drawLine({ start: { x: M, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 0.7, color: rgb(0.85, 0.85, 0.85) });

  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: coral });
  y -= 14;
  text("sendletter", M, 20, bold);
  y -= 16; text("sendletter.app  |  support@sendletter.app", M, 9, font, grey);
  y -= 34; text(`Invoice ${inv.number}`, M, 16, bold);
  y -= 16; text(`${inv.date}${inv.paidAt ? `   |   Paid ${inv.paidAt}` : ""}`, M, 10, font, grey);
  y -= 22; text("Billed to", M, 9, font, grey);
  y -= 13; text(inv.billedTo, M, 11, bold);
  y -= 32;
  rule();
  text("Description", M, 9, bold, grey); right("Amount (CAD)", W - M, 9, bold);
  y -= 20;
  for (const l of inv.lines) {
    const full = safe(l.description);
    let d = full;
    while (font.widthOfTextAtSize(d, 10) > W - 2 * M - 90 && d.length > 4) d = d.slice(0, -2);
    if (d !== full) d = d.trimEnd() + "...";
    if (y < M + 70) { page = doc.addPage([W, H]); y = H - M; }
    text(d, M, 10); right(money(l.amount_cents), W - M);
    y -= 16;
  }
  y -= 8;
  if (y < M + 70) { page = doc.addPage([W, H]); y = H - M; }
  rule();
  y -= 6; text("Total", M, 12, bold); right(money(inv.totalCents), W - M, 12, bold);
  y -= 28;
  text(`${inv.letters} letter${inv.letters === 1 ? "" : "s"}. Postage is included at cost. No GST/HST is charged.`, M, 9, font, grey);
  if (inv.reference) { y -= 13; text(`Paid by card (reference ${inv.reference}).`, M, 9, font, grey); }
  return doc.save();
}
