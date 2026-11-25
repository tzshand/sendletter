import type { SimpleLetterData } from "@/components/SimpleLetterForm";
import type { Settings } from "@/components/LetterSettings";
import type { LetterSize } from "@/components/LetterSizeSelector";

/**
 * Generates a print-quality PDF from letter content.
 * - Simple mode: vector PDF with real text (sharp at any resolution)
 * - Custom mode: high-DPI rasterized capture
 * - Upload mode: returns existing PDF
 * Returns the base64-encoded PDF (without data URI prefix) and its page count.
 * pageCount is null when it can't be known without parsing an uploaded PDF.
 */
export type GeneratedPdf = { base64: string; pageCount: number | null };

/** Hard cap shared with checkout, which clamps page count to 15. */
export const MAX_PDF_PAGES = 15;

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

// ── Custom HTML: High-DPI rasterized capture ──

async function generateCustomLetterPdf(
  htmlContent: string,
  settings: Settings,
  letterSize: LetterSize,
): Promise<GeneratedPdf> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pageW = 612; // 8.5in at 72dpi
  const pageH = letterSize === "legal" ? 1008 : 792;
  const padding = 72;

  // Measure the content inside the page margins. A single capture of a fixed
  // box clips anything past the first page, so overflowing content takes the
  // paged path below instead.
  const fontCss = `
    font-family: "${settings.fontFamily}", serif;
    font-size: ${settings.fontSize}pt;
    line-height: 1.5; color: #000;
  `;
  const measureDiv = document.createElement("div");
  measureDiv.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: ${pageW}px; padding: 0 ${padding}px;
    ${fontCss}
    background: #fff; box-sizing: border-box;
  `;
  measureDiv.innerHTML = htmlContent;
  document.body.appendChild(measureDiv);
  const contentTotal = measureDiv.scrollHeight;
  document.body.removeChild(measureDiv);

  const contentH = pageH - padding * 2;
  if (contentTotal > contentH) {
    // Snap page breaks to whole lines so text isn't sliced mid-line.
    const lineHpx = settings.fontSize * (96 / 72) * 1.5;
    const sliceH = Math.max(lineHpx, Math.floor(contentH / lineHpx) * lineHpx);
    const numPages = Math.ceil(contentTotal / sliceH);
    // Over the limit: report the true count so checkout can refuse, rather than
    // silently truncating. Nothing is rendered for a letter we won't accept.
    if (numPages > MAX_PDF_PAGES) return { base64: "", pageCount: numPages };
    const pdfWp = 8.5;
    const pdfHp = letterSize === "legal" ? 14 : 11;
    const pagedDoc = new jsPDF({ orientation: "portrait", unit: "in", format: [pdfWp, pdfHp] });

    for (let i = 0; i < numPages; i++) {
      if (i > 0) pagedDoc.addPage([pdfWp, pdfHp]);

      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed; left: -9999px; top: 0;
        width: ${pageW}px; height: ${pageH}px;
        overflow: hidden; background: #fff;
      `;
      const clip = document.createElement("div");
      clip.style.cssText = `
        position: absolute; left: 0; top: ${padding}px;
        width: ${pageW}px; height: ${sliceH}px; overflow: hidden;
      `;
      const inner = document.createElement("div");
      inner.style.cssText = `
        position: absolute; left: 0; top: ${-i * sliceH}px;
        width: ${pageW}px; padding: 0 ${padding}px;
        ${fontCss}
        box-sizing: border-box;
      `;
      inner.innerHTML = htmlContent;
      clip.appendChild(inner);
      wrapper.appendChild(clip);
      document.body.appendChild(wrapper);

      const pageCanvas = await html2canvas(wrapper, {
        width: pageW,
        height: pageH,
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      document.body.removeChild(wrapper);
      pagedDoc.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, pdfWp, pdfHp);
    }

    return { base64: pagedDoc.output("datauristring").split(",")[1], pageCount: numPages };
  }

  // Create offscreen container matching the preview layout exactly
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: ${pageW}px; height: ${pageH}px;
    background: #fff; overflow: hidden;
    font-family: "${settings.fontFamily}", serif;
    font-size: ${settings.fontSize}pt;
    line-height: 1.5; color: #000;
    padding: ${padding}px;
    display: flex; flex-direction: column;
    ${settings.verticalCenter ? "justify-content: center;" : ""}
    box-sizing: border-box;
  `;
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  // Capture at 3x for print quality (~216 DPI)
  const canvas = await html2canvas(container, {
    width: pageW,
    height: pageH,
    scale: 3,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  document.body.removeChild(container);

  const isLegal = letterSize === "legal";
  const pdfW = 8.5;
  const pdfH = isLegal ? 14 : 11;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: [pdfW, pdfH],
  });

  // Use PNG for better quality (no JPEG artifacts on text)
  const imgData = canvas.toDataURL("image/png");
  doc.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);

  const output = doc.output("datauristring");
  return { base64: output.split(",")[1], pageCount: 1 };
}

// ── Docx HTML: Multi-page rasterized capture ──

async function generateDocxHtmlPdf(
  htmlContent: string,
  settings: Settings,
  letterSize: LetterSize,
): Promise<GeneratedPdf> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pageW = 612;
  const pageH = letterSize === "legal" ? 1008 : 792;
  const padding = 72;

  // Measure total content height
  const measureDiv = document.createElement("div");
  measureDiv.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: ${pageW}px; padding: ${padding}px;
    font-family: "${settings.fontFamily}", serif;
    font-size: ${settings.fontSize}pt;
    line-height: 1.5; color: #000;
    background: #fff; box-sizing: border-box;
  `;
  measureDiv.innerHTML = htmlContent;
  document.body.appendChild(measureDiv);
  const totalHeight = measureDiv.scrollHeight;
  document.body.removeChild(measureDiv);

  const numPages = Math.min(MAX_PDF_PAGES, Math.max(1, Math.ceil(totalHeight / pageH)));
  const isLegal = letterSize === "legal";
  const pdfW = 8.5;
  const pdfH = isLegal ? 14 : 11;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: [pdfW, pdfH],
  });

  for (let i = 0; i < numPages; i++) {
    if (i > 0) doc.addPage([pdfW, pdfH]);

    // Create a clipped window for this page
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: ${pageW}px; height: ${pageH}px;
      overflow: hidden; background: #fff;
    `;
    const inner = document.createElement("div");
    inner.style.cssText = `
      position: absolute;
      top: ${-i * pageH}px; left: 0;
      width: ${pageW}px; padding: ${padding}px;
      font-family: "${settings.fontFamily}", serif;
      font-size: ${settings.fontSize}pt;
      line-height: 1.5; color: #000;
      box-sizing: border-box;
    `;
    inner.innerHTML = htmlContent;
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    const canvas = await html2canvas(wrapper, {
      width: pageW,
      height: pageH,
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    document.body.removeChild(wrapper);
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
  }

  const output = doc.output("datauristring");
  return { base64: output.split(",")[1], pageCount: numPages };
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
