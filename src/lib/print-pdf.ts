// Server-side PDF work: count a letter's pages (the price depends on it, so it
// is never taken from the browser) and build the print-ready PDF for each
// mailing.
//
// A #10 window mailing is [address page] + its pages. Printed double-sided the
// address page is the front of sheet 1 and letter page 1 its back, so a one-page
// letter is one sheet. Flat mailers are hand-addressed and carry only their
// pages.
//
// Address-page geometry follows the "with envelope page" samples: the return
// address sits high on the page, where the folded panel is hidden by the
// envelope; the recipient sits lower, in the window zone. Offsets are from the
// top-left of a US Letter page. Calibrate with a test print and adjust here.

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Mailing, LetterSize } from "./pricing";

export const ADDRESS_PAGE = {
  width: 612,
  height: 792,
  left: 65,
  fromTop: 68,
  toTop: 163,
  lineHeight: 15,
  fontSize: 12,
};

export type AddressLines = string[];

export async function countPdfPages(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPageCount();
}

/** Standard PDF fonts only cover WinAnsi; swap anything else for "?" rather than fail the order. */
function safe(font: PDFFont, s: string): string {
  let out = "";
  for (const ch of s.normalize("NFC")) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

export type PrintFile = { name: string; bytes: Uint8Array; mailing: Mailing };

export async function buildPrintFiles(opts: {
  letterPdf: Uint8Array;
  size: LetterSize;
  mailings: Mailing[];
  from: AddressLines;
  to: AddressLines;
}): Promise<PrintFile[]> {
  const { letterPdf, size, mailings, from, to } = opts;
  const src = await PDFDocument.load(letterPdf, { ignoreEncryption: true, updateMetadata: false });
  const total = mailings.length;
  const files: PrintFile[] = [];

  for (const m of mailings) {
    const out = await PDFDocument.create();
    const font = await out.embedFont(StandardFonts.TimesRoman);
    const small = await out.embedFont(StandardFonts.Helvetica);

    if (size === "standard") {
      const g = ADDRESS_PAGE;
      const page = out.addPage([g.width, g.height]);
      const draw = (lines: string[], top: number, f: PDFFont, sz: number, gap: number) =>
        lines.forEach((line, i) =>
          page.drawText(safe(f, line), { x: g.left, y: g.height - top - i * gap, size: sz, font: f, color: rgb(0, 0, 0) }),
        );
      // Hidden above the window: return address, and which part of a split letter this is.
      if (total > 1) {
        draw([`Part ${m.index} of ${total}  -  pages ${m.pageStart}-${m.pageEnd}`], g.fromTop - 24, small, 8, 10);
      }
      draw(from, g.fromTop, font, g.fontSize, g.lineHeight);
      // In the window.
      draw(to, g.toTop, font, g.fontSize, g.lineHeight);
    }

    const indices = Array.from({ length: m.pageEnd - m.pageStart + 1 }, (_, i) => m.pageStart - 1 + i);
    const copied = await out.copyPages(src, indices);
    copied.forEach((p) => out.addPage(p));

    files.push({
      name: total > 1 ? `print-${m.index}-of-${total}.pdf` : "print.pdf",
      bytes: await out.save(),
      mailing: m,
    });
  }
  return files;
}
