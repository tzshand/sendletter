import type { SimpleLetterData } from "@/components/SimpleLetterForm";
import type { Settings } from "@/components/LetterSettings";
import type { LetterSize } from "@/components/LetterSizeSelector";

/**
 * Generates a print-quality PDF from letter content.
 * - Simple mode: vector PDF with real text (sharp at any resolution)
 * - Custom mode: high-DPI rasterized capture
 * - Upload mode: returns existing PDF
 * Returns base64-encoded PDF string (without data URI prefix).
 */
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
}): Promise<string | null> {
  // Upload mode: return existing PDF, or generate from docx HTML
  if (mode === "upload") {
    const match = htmlContent.match(/data-pdf="([^"]+)"/);
    if (match) return match[1];
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
): Promise<string> {
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

  // Helper: write wrapped text, returns new y
  function writeText(text: string, x: number, startY: number, maxWidth: number, align?: "left" | "right"): number {
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (startY > maxY) break;
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
    if (y > maxY) break;

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
  return output.split(",")[1];
}

// ── Custom HTML: High-DPI rasterized capture ──

async function generateCustomLetterPdf(
  htmlContent: string,
  settings: Settings,
  letterSize: LetterSize,
): Promise<string> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pageW = 612; // 8.5in at 72dpi
  const pageH = letterSize === "legal" ? 1008 : 792;
  const padding = 72;

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
  return output.split(",")[1];
}

// ── Docx HTML: Multi-page rasterized capture ──

async function generateDocxHtmlPdf(
  htmlContent: string,
  settings: Settings,
  letterSize: LetterSize,
): Promise<string> {
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

  const numPages = Math.min(15, Math.max(1, Math.ceil(totalHeight / pageH)));
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
  return output.split(",")[1];
}

function formatDate(dateStr: string, language: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
