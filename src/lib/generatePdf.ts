import type { SimpleLetterData } from "@/components/SimpleLetterForm";
import type { Settings } from "@/components/LetterSettings";
import type { LetterSize } from "./pricing";
import { RASTER_MAX_PAGES } from "./pricing";

/**
 * Generates a print-quality PDF from letter content.
 * - Simple mode: vector PDF with real text (sharp at any resolution)
 * - Custom mode: high-DPI rasterized capture
 * - Upload mode: returns existing PDF
 * Returns the base64-encoded PDF (without data URI prefix) and its page count.
 * pageCount is null when it can't be known without parsing an uploaded PDF.
 */
export type GeneratedPdf = { base64: string; pageCount: number | null };


export async function generateLetterPdf({
  mode,
  letterData,
  htmlContent,
  settings,
  letterSize = "standard",
}: {
  mode: "simple" | "custom" | "upload";
  letterData: SimpleLetterData;
  htmlContent: string;
  settings: Settings;
  letterSize?: LetterSize;
}): Promise<GeneratedPdf | null> {
  // Upload mode: return existing PDF, or generate from docx HTML
  if (mode === "upload") {
    const match = htmlContent.match(/data-pdf="([^"]+)"/);
    if (match) return { base64: match[1], pageCount: null };
    if (htmlContent) return await generateDocxHtmlPdf(htmlContent, settings, letterSize);
    return null;
  }

  try {
    if (mode === "simple") {
      return await generateSimpleLetterPdf(letterData, settings, letterSize);
    } else {
      return await generateCustomLetterPdf(htmlContent, settings, letterSize);
    }
  } catch (e) {
    console.error("PDF generation failed:", e);
    return null;
  }
}

// ── Simple Letter: Vector PDF with real text ──

const FONT_MAP: Record<string, string> = {
  "Times New Roman": "times",
  "Garamond": "times", // jsPDF fallback
  "Georgia": "times",
  "Helvetica": "helvetica",
  "Arial": "helvetica",
};

async function generateSimpleLetterPdf(
  data: SimpleLetterData,
  settings: Settings,
  letterSize: LetterSize,
): Promise<GeneratedPdf> {
  const { jsPDF } = await import("jspdf");

  const isLegal = letterSize === "legal";
  const pageW = 8.5; // inches
  const pageH = isLegal ? 14 : 11;
  const margin = 1; // 1 inch margins
  const contentW = pageW - margin * 2; // 6.5 inches

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: [pageW, pageH],
  });

  const font = FONT_MAP[settings.fontFamily] || "times";
  const fontSize = settings.fontSize || 12;

  doc.setFont(font, "normal");
  doc.setFontSize(fontSize);

  const lineH = (fontSize / 72) * 1.5; // line height in inches
  let y = margin;
  const maxY = pageH - margin;

  const isFr = settings.language === "fr";

  // Helper: write wrapped text, returns new y. Flows onto a new page when the
  // current one is full — it must never drop text.
  function writeText(text: string, x: number, startY: number, maxWidth: number, align?: "left" | "right"): number {
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (startY > maxY) {
        doc.addPage([pageW, pageH]);
        startY = margin;
      }
      if (align === "right") {
        const textW = doc.getTextWidth(line);
        doc.text(line, x + maxWidth - textW, startY);
      } else {
        doc.text(line, x, startY);
      }
      startY += lineH;
    }
    return startY;
  }

  // Collect all content blocks to measure total height for vertical centering
  type Block = { type: "text" | "bold"; text: string; align?: "left" | "right"; spaceBefore?: number; spaceAfter?: number };
  const blocks: Block[] = [];

  if (data.date) {
    blocks.push({ type: "text", text: formatDate(data.date, settings.language), align: "right", spaceAfter: lineH * 1.5 });
  }
  if (data.reference) {
    blocks.push({ type: "text", text: `${isFr ? "Réf" : "Ref"}: ${data.reference}`, spaceAfter: lineH });
  }
  if (data.subject) {
    blocks.push({ type: "bold", text: `${isFr ? "Objet" : "Re"}: ${data.subject}`, spaceAfter: lineH * 1.2 });
  }
  if (data.greeting) {
    blocks.push({ type: "text", text: data.greeting, spaceAfter: lineH });
  }
  if (data.body) {
    blocks.push({ type: "text", text: data.body, spaceAfter: 0 });
  }
  if (data.closing) {
    blocks.push({ type: "text", text: data.closing, spaceBefore: lineH * 1.5 });
  }
  if (data.senderName) {
    blocks.push({ type: "text", text: data.senderName, spaceBefore: lineH * 2.5 });
  }
  if (data.cc) {
    blocks.push({ type: "text", text: `CC: ${data.cc}`, spaceBefore: lineH * 1.2 });
  }
  if (data.enclosures) {
    blocks.push({ type: "text", text: `${isFr ? "P.J." : "Encl."}: ${data.enclosures}` });
  }
  if (data.ps) {
    blocks.push({ type: "text", text: `P.S. ${data.ps}`, spaceBefore: lineH * 1.2 });
  }

  // Measure total height
  if (settings.verticalCenter) {
    let totalH = 0;
    for (const block of blocks) {
      totalH += block.spaceBefore || 0;
      const lines = doc.splitTextToSize(block.text, contentW);
      totalH += lines.length * lineH;
      totalH += block.spaceAfter || 0;
    }
    const available = pageH - margin * 2;
    const offset = Math.max(0, (available - totalH) / 2);
    y = margin + offset;
  }

  // Render blocks
  for (const block of blocks) {
    y += block.spaceBefore || 0;
    if (y > maxY) {
      doc.addPage([pageW, pageH]);
      y = margin;
    }

    if (block.type === "bold") {
      doc.setFont(font, "bold");
    } else {
      doc.setFont(font, "normal");
    }

    y = writeText(block.text, margin, y, contentW, block.align);
    y += block.spaceAfter || 0;
  }

  doc.setFont(font, "normal");

  const output = doc.output("datauristring");
  return { base64: output.split(",")[1], pageCount: doc.getNumberOfPages() };
}

// ── Paged HTML layout (custom editor and .docx) ──
//
// One layout drives the live page count, the preview and the PDF, so what you
// see, what you are charged for and what is printed always agree.

const PAGE_W = 612; // 8.5in at 72dpi
const PAGE_PAD = 72; // 1in margins

function pageMetrics(settings: Settings, letterSize: LetterSize) {
  const pageH = letterSize === "legal" ? 1008 : 792;
  const contentH = pageH - PAGE_PAD * 2;
  // Snap page breaks to whole lines so text isn't sliced mid-line.
  const lineHpx = settings.fontSize * (96 / 72) * 1.5;
  const sliceH = Math.max(lineHpx, Math.floor(contentH / lineHpx) * lineHpx);
  return { pageH, contentH, sliceH };
}

function fontCss(settings: Settings): string {
  return `
    font-family: "${settings.fontFamily}", serif;
    font-size: ${settings.fontSize}pt;
    line-height: 1.5; color: #000;
  `;
}

export type HtmlLayout = {
  /** The HTML with hard page breaks sized to land on a page boundary. */
  html: string;
  pages: number;
  /** True when it all fits one page (so it can be vertically centred). */
  fits: boolean;
  pageH: number;
  contentH: number;
  sliceH: number;
};

function hasContentAfter(node: HTMLElement, root: HTMLElement): boolean {
  let n: Node | null = node;
  while (n && n !== root) {
    for (let sib = n.nextSibling; sib; sib = sib.nextSibling) {
      if (sib.nodeType === Node.TEXT_NODE && (sib.textContent ?? "").trim()) return true;
      if (sib.nodeType === Node.ELEMENT_NODE) {
        const el = sib as HTMLElement;
        if (el.matches("img, hr") || (el.textContent ?? "").trim()) return true;
      }
    }
    n = n.parentNode;
  }
  return false;
}

/**
 * Lay HTML out inside the page margins. Hard page breaks
 * (`<div data-page-break>`) are sized so the next block starts on a fresh page.
 * Browser only.
 */
export function layoutHtml(html: string, settings: Settings, letterSize: LetterSize): HtmlLayout {
  const { pageH, contentH, sliceH } = pageMetrics(settings, letterSize);
  const el = document.createElement("div");
  el.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: ${PAGE_W}px; padding: 0 ${PAGE_PAD}px;
    ${fontCss(settings)}
    background: #fff; box-sizing: border-box;
  `;
  el.innerHTML = html;
  document.body.appendChild(el);
  try {
    let forced = false;
    for (const br of Array.from(el.querySelectorAll<HTMLElement>("[data-page-break]"))) {
      br.style.height = "0px";
      if (!hasContentAfter(br, el)) continue;
      const rem = br.offsetTop % sliceH;
      if (rem !== 0) {
        br.style.height = `${sliceH - rem}px`;
        forced = true;
      }
    }
    const total = el.scrollHeight;
    const fits = !forced && total <= contentH;
    return {
      html: el.innerHTML,
      pages: fits ? 1 : Math.max(2, Math.ceil(total / sliceH)),
      fits,
      pageH,
      contentH,
      sliceH,
    };
  } finally {
    document.body.removeChild(el);
  }
}

/** How many pages this HTML will print as. Browser only. */
export function measureHtmlPages(html: string, settings: Settings, letterSize: LetterSize): number {
  return layoutHtml(html, settings, letterSize).pages;
}

async function generateCustomLetterPdf(
  htmlContent: string,
  settings: Settings,
  letterSize: LetterSize,
): Promise<GeneratedPdf> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const layout = layoutHtml(htmlContent, settings, letterSize);
  const { pageH, sliceH } = layout;
  const pdfW = 8.5;
  const pdfH = letterSize === "legal" ? 14 : 11;

  // Over the limit: report the true count so the caller can refuse, rather than
  // silently truncating. Nothing is rendered for a letter we won't accept.
  if (layout.pages > RASTER_MAX_PAGES) return { base64: "", pageCount: layout.pages };

  const doc = new jsPDF({ orientation: "portrait", unit: "in", format: [pdfW, pdfH] });

  if (layout.fits) {
    // One page: matches the preview exactly, including vertical centring.
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: ${PAGE_W}px; height: ${pageH}px;
      background: #fff; overflow: hidden;
      ${fontCss(settings)}
      padding: ${PAGE_PAD}px;
      display: flex; flex-direction: column;
      ${settings.verticalCenter ? "justify-content: center;" : ""}
      box-sizing: border-box;
    `;
    container.innerHTML = layout.html;
    document.body.appendChild(container);
    // 3x for print quality (~216 DPI)
    const canvas = await html2canvas(container, { width: PAGE_W, height: pageH, scale: 3, useCORS: true, backgroundColor: "#ffffff" });
    document.body.removeChild(container);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, pdfH);
    return { base64: doc.output("datauristring").split(",")[1], pageCount: 1 };
  }

  // Many pages go lighter on memory: 2x past ten pages.
  const scale = layout.pages > 10 ? 2 : 3;
  for (let i = 0; i < layout.pages; i++) {
    if (i > 0) doc.addPage([pdfW, pdfH]);

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: ${PAGE_W}px; height: ${pageH}px;
      overflow: hidden; background: #fff;
    `;
    const clip = document.createElement("div");
    clip.style.cssText = `
      position: absolute; left: 0; top: ${PAGE_PAD}px;
      width: ${PAGE_W}px; height: ${sliceH}px; overflow: hidden;
    `;
    const inner = document.createElement("div");
    inner.style.cssText = `
      position: absolute; left: 0; top: ${-i * sliceH}px;
      width: ${PAGE_W}px; padding: 0 ${PAGE_PAD}px;
      ${fontCss(settings)}
      box-sizing: border-box;
    `;
    inner.innerHTML = layout.html;
    clip.appendChild(inner);
    wrapper.appendChild(clip);
    document.body.appendChild(wrapper);

    const canvas = await html2canvas(wrapper, { width: PAGE_W, height: pageH, scale, useCORS: true, backgroundColor: "#ffffff" });
    document.body.removeChild(wrapper);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, pdfH);
  }

  return { base64: doc.output("datauristring").split(",")[1], pageCount: layout.pages };
}

// Docx HTML takes the same paged path, just never vertically centred.
async function generateDocxHtmlPdf(
  htmlContent: string,
  settings: Settings,
  letterSize: LetterSize,
): Promise<GeneratedPdf> {
  return generateCustomLetterPdf(htmlContent, { ...settings, verticalCenter: false }, letterSize);
}

function formatDate(dateStr: string, language: string): string {
  if (!dateStr) return "";
  // The API takes a free-text date ("March 5, 2026"); only ISO dates are reformatted.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
