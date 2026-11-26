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
    if (htmlContent) return await generateCustomLetterPdf(htmlContent, { ...settings, verticalCenter: false }, letterSize, "docx");
    return null;
  }

  try {
    if (mode === "simple") {
      return await generateSimpleLetterPdf(letterData, settings, letterSize);
    } else {
      return await generateCustomLetterPdf(htmlContent, settings, letterSize, "custom");
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
    compress: true,
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

function pageMetrics(letterSize: LetterSize) {
  const pageH = letterSize === "legal" ? 1008 : 792;
  return { pageH, contentH: pageH - PAGE_PAD * 2 };
}

/**
 * Space between paragraphs. Word keeps its spacing in the paragraph styles and
 * the converter (mammoth) drops it, so a .docx is given a Word-like gap
 * (Word's default is 8pt after); the custom editor shows 0.3em, so its output
 * matches what was typed.
 */
export const PARAGRAPH_GAP = { custom: "0.3em", docx: "0.65em" } as const;
export type HtmlSource = keyof typeof PARAGRAPH_GAP;

/**
 * The letter's own typography, scoped to .letter-doc and used identically to
 * measure, preview and render. The app's CSS reset removes paragraph margins,
 * list bullets and heading weight, which is why Word documents came out as a
 * solid block of text. Keep the specificity above the reset's.
 */
export const LETTER_CSS = `
.letter-doc p { margin: 0 0 var(--p-gap, 0.3em); }
.letter-doc p:empty::before { content: "\\00a0"; }
.letter-doc h1, .letter-doc h2, .letter-doc h3, .letter-doc h4, .letter-doc h5, .letter-doc h6 { font-weight: 700; margin: 0 0 var(--p-gap, 0.3em); }
.letter-doc h1 { font-size: 1.5em; } .letter-doc h2 { font-size: 1.25em; } .letter-doc h3 { font-size: 1.1em; }
.letter-doc h4, .letter-doc h5, .letter-doc h6 { font-size: 1em; }
.letter-doc ul, .letter-doc ol { margin: 0 0 var(--p-gap, 0.3em); padding-left: 1.6em; }
.letter-doc ul { list-style: disc; } .letter-doc ol { list-style: decimal; }
.letter-doc li { margin: 0; } .letter-doc li > p { margin: 0; }
.letter-doc strong, .letter-doc b { font-weight: 700; }
.letter-doc em, .letter-doc i { font-style: italic; }
.letter-doc u { text-decoration: underline; }
.letter-doc blockquote { margin: 0 0 var(--p-gap, 0.3em) 1.5em; }
.letter-doc table { border-collapse: collapse; margin: 0 0 var(--p-gap, 0.3em); }
.letter-doc td, .letter-doc th { border: 1px solid #000; padding: 2px 5px; vertical-align: top; }
.letter-doc img { max-width: 100%; height: auto; }
`;

/** Make the letter stylesheet available to the page (and so to html2canvas's clone of it). */
export function ensureLetterStyles(): void {
  if (typeof document === "undefined" || document.getElementById("letter-doc-css")) return;
  const style = document.createElement("style");
  style.id = "letter-doc-css";
  style.textContent = LETTER_CSS;
  document.head.appendChild(style);
}

/**
 * html2canvas (1.4.1) cannot parse the lab()/oklch() colours Tailwind v4 uses
 * (the app's <body> has a lab() text colour, which every element without its own
 * inherits, and its preflight gives every element a lab() border colour), and
 * throws "unsupported color function". That broke every rasterised letter (the
 * custom editor and .docx). In the clone it renders from, give html/body a plain
 * colour (so inheritance yields rgb) and resolve the other colour properties
 * through it. Letter content has no use for the app's palette.
 */
const SAFE_COLOURS_CSS =
  "html,body{color:#000 !important;}" +
  "*,*::before,*::after{border-color:currentColor !important;outline-color:currentColor !important;" +
  "text-decoration-color:currentColor !important;column-rule-color:currentColor !important;}";

/**
 * html2canvas places text using a font-metrics probe it builds in the LIVE
 * page: an inline <img> next to a span, measured with whatever line-height the
 * page inherits. The app's CSS reset makes every <img> display:block and sets
 * html { line-height: 1.5 }, so the probe measures nonsense and every glyph is
 * drawn about 8px too low, which cuts the last line of every page. Neutralise
 * both for the instant of capture only (removed from the clone, so the letter's
 * own layout is untouched).
 */
const PROBE_FIX_CSS = "html,body{line-height:normal !important} img{display:inline !important}";

type H2C = typeof import("html2canvas").default;
async function capture(html2canvas: H2C, el: HTMLElement, opts: { width: number; height: number; scale: number }) {
  const probeFix = document.createElement("style");
  probeFix.setAttribute("data-h2c-probe-fix", "");
  probeFix.textContent = PROBE_FIX_CSS;
  document.head.appendChild(probeFix);
  try {
    return await html2canvas(el, {
      ...opts,
      useCORS: true,
      backgroundColor: "#ffffff",
      onclone: (doc) => {
        doc.querySelectorAll("style[data-h2c-probe-fix]").forEach((n) => n.remove());
        const style = doc.createElement("style");
        style.textContent = SAFE_COLOURS_CSS;
        doc.head.appendChild(style);
      },
    });
  } finally {
    probeFix.remove();
  }
}

function fontCss(settings: Settings): string {
  return `
    font-family: "${settings.fontFamily}", serif;
    font-size: ${settings.fontSize}pt;
    line-height: 1.5; color: #000;
  `;
}

/** Vertical extent of one page's content, in px from the top of the laid-out HTML. */
export type PageRange = { start: number; end: number };

export type HtmlLayout = {
  pages: number;
  /** Where each page's content starts and ends. Only meaningful when !fits. */
  ranges: PageRange[];
  /** True when it all fits one page (so it can be vertically centred). */
  fits: boolean;
  pageH: number;
  contentH: number;
  html: string;
  source: HtmlSource;
};

type Seg = { top: number; bottom: number; force: boolean };

/**
 * The visual lines of the laid-out content: one segment per line of text (and
 * per image or rule), measured from the real browser layout. Pages are broken
 * BETWEEN these, so a line is never sliced, whatever the paragraph spacing,
 * headings or blank lines in between.
 */
function collectSegments(root: HTMLElement): Seg[] {
  const base = root.getBoundingClientRect().top;
  const raw: { top: number; bottom: number }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!/\S/.test(n.nodeValue ?? "")) continue;
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) if (r.height > 0) raw.push({ top: r.top - base, bottom: r.bottom - base });
  }
  root.querySelectorAll("img, hr").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0) raw.push({ top: r.top - base, bottom: r.bottom - base });
  });
  raw.sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  const segs: Seg[] = [];
  for (const r of raw) {
    const last = segs[segs.length - 1];
    if (last && r.top < last.bottom - 1) last.bottom = Math.max(last.bottom, r.bottom); // same visual line
    else segs.push({ top: r.top, bottom: r.bottom, force: false });
  }
  // A hard page break (<div data-page-break>) starts the next line on a new page.
  root.querySelectorAll("[data-page-break]").forEach((el) => {
    const t = el.getBoundingClientRect().top - base;
    const next = segs.find((s) => s.top >= t);
    if (next && next !== segs[0]) next.force = true;
  });
  return segs;
}

/**
 * Lay HTML out inside the page margins and decide where the pages break.
 * Browser only.
 */
export function layoutHtml(html: string, settings: Settings, letterSize: LetterSize, source: HtmlSource = "custom"): HtmlLayout {
  const { pageH, contentH } = pageMetrics(letterSize);
  ensureLetterStyles();
  const el = document.createElement("div");
  el.className = "letter-doc";
  el.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: ${PAGE_W}px; padding: 0 ${PAGE_PAD}px;
    --p-gap: ${PARAGRAPH_GAP[source]};
    ${fontCss(settings)}
    background: #fff; box-sizing: border-box;
  `;
  el.innerHTML = html;
  document.body.appendChild(el);
  try {
    const segs = collectSegments(el);
    // Half-leading: the gap above and below the glyphs inside a line box.
    const fontPx = settings.fontSize * (96 / 72);
    const pad = Math.max(0, (fontPx * 1.5 - fontPx * 1.15) / 2);

    const ranges: PageRange[] = [];
    for (let i = 0; i < segs.length; ) {
      const start = Math.max(0, segs[i].top - pad);
      let j = i;
      while (j + 1 < segs.length && !segs[j + 1].force && segs[j + 1].bottom + pad - start <= contentH) j++;
      // A single line taller than a page (a big image) is clipped to the page.
      ranges.push({ start, end: Math.min(segs[j].bottom + pad, start + contentH) });
      i = j + 1;
    }
    const fits = ranges.length <= 1;
    return { pages: Math.max(1, ranges.length), ranges, fits, pageH, contentH, html, source };
  } finally {
    document.body.removeChild(el);
  }
}

/** How many pages this HTML will print as. Browser only. */
export function measureHtmlPages(html: string, settings: Settings, letterSize: LetterSize, source: HtmlSource = "custom"): number {
  return layoutHtml(html, settings, letterSize, source).pages;
}

async function generateCustomLetterPdf(
  htmlContent: string,
  settings: Settings,
  letterSize: LetterSize,
  source: HtmlSource,
): Promise<GeneratedPdf> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const layout = layoutHtml(htmlContent, settings, letterSize, source);
  const { pageH } = layout;
  const pdfW = 8.5;
  const pdfH = letterSize === "legal" ? 14 : 11;
  const vars = `--p-gap: ${PARAGRAPH_GAP[source]};`;

  // Over the limit: report the true count so the caller can refuse, rather than
  // silently truncating. Nothing is rendered for a letter we won't accept.
  if (layout.pages > RASTER_MAX_PAGES) return { base64: "", pageCount: layout.pages };

  // compress: without it jsPDF embeds each page image uncompressed (~13 MB a page at 3x).
  const doc = new jsPDF({ orientation: "portrait", unit: "in", format: [pdfW, pdfH], compress: true });

  if (layout.fits) {
    // One page: matches the preview exactly, including vertical centring.
    const container = document.createElement("div");
    container.className = "letter-doc";
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: ${PAGE_W}px; height: ${pageH}px;
      background: #fff; overflow: hidden;
      ${vars}
      ${fontCss(settings)}
      padding: ${PAGE_PAD}px;
      display: flex; flex-direction: column;
      ${settings.verticalCenter ? "justify-content: center;" : ""}
      box-sizing: border-box;
    `;
    container.innerHTML = layout.html;
    document.body.appendChild(container);
    // 3x for print quality (~216 DPI)
    const canvas = await capture(html2canvas, container, { width: PAGE_W, height: pageH, scale: 3 });
    document.body.removeChild(container);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, pdfH);
    return { base64: doc.output("datauristring").split(",")[1], pageCount: 1 };
  }

  // Many pages go lighter on memory: 2x past ten pages.
  const scale = layout.pages > 10 ? 2 : 3;
  for (let i = 0; i < layout.ranges.length; i++) {
    const { start, end } = layout.ranges[i];
    if (i > 0) doc.addPage([pdfW, pdfH]);

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: ${PAGE_W}px; height: ${pageH}px;
      overflow: hidden; background: #fff;
    `;
    // The window onto this page's lines: exactly the lines chosen for it, so a
    // line below it (which didn't fit) can never show through the margin.
    const clip = document.createElement("div");
    clip.style.cssText = `
      position: absolute; left: 0; top: ${PAGE_PAD}px;
      width: ${PAGE_W}px; height: ${end - start}px; overflow: hidden;
    `;
    const inner = document.createElement("div");
    inner.className = "letter-doc";
    inner.style.cssText = `
      position: absolute; left: 0; top: ${-start}px;
      width: ${PAGE_W}px; padding: 0 ${PAGE_PAD}px;
      ${vars}
      ${fontCss(settings)}
      box-sizing: border-box;
    `;
    inner.innerHTML = layout.html;
    clip.appendChild(inner);
    wrapper.appendChild(clip);
    document.body.appendChild(wrapper);

    const canvas = await capture(html2canvas, wrapper, { width: PAGE_W, height: pageH, scale });
    document.body.removeChild(wrapper);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, pdfH);
  }

  return { base64: doc.output("datauristring").split(",")[1], pageCount: layout.pages };
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
