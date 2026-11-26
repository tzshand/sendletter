"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import type { Address } from "./AddressForm";
import type { SimpleLetterData } from "./SimpleLetterForm";
import type { Settings } from "./LetterSettings";
import type { LetterSize } from "./LetterSizeSelector";
import { PdfCanvasPreview } from "./PdfPreview";
import { layoutHtml, type HtmlLayout } from "@/lib/generatePdf";
import { ADDRESS_PAGE } from "@/lib/address-page";

function formatDate(dateStr: string, language: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const COUNTRY_NAMES: Record<string, string> = {
  CA: "Canada", US: "United States", GB: "United Kingdom", FR: "France",
  DE: "Germany", AU: "Australia",
};

function formatAddressLines(a: Address): string[] {
  if (a.freeform) return (a.lines ?? []).filter((l) => l.trim());
  const lines: string[] = [];
  if (a.name) lines.push(a.name);
  if (a.line1) lines.push(a.line1);
  if (a.line2) lines.push(a.line2);
  const cityLine = [a.city, a.province].filter(Boolean).join(", ");
  if (cityLine || a.postalCode) {
    lines.push([cityLine, a.postalCode].filter(Boolean).join("  "));
  }
  if (a.country && a.country !== "CA") {
    lines.push(COUNTRY_NAMES[a.country] || a.country);
  }
  return lines;
}

/* ─── Scaled container (fixes stretching) ────────────── */

function ScaledFrame({
  children,
  nativeWidth,
  nativeHeight,
}: {
  children: ReactNode;
  nativeWidth: number;
  nativeHeight: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(w / nativeWidth);
    };
    update();
    const obs = new ResizeObserver(() => update());
    obs.observe(el);
    return () => obs.disconnect();
  }, [nativeWidth]);

  const scaledHeight = nativeHeight * scale;

  return (
    <div ref={containerRef} className="w-full" style={{ height: scaledHeight }}>
      <div
        style={{
          width: nativeWidth,
          height: nativeHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Envelope Preview ─────────────────────────────────── */

const WINDOW = { left: 63, bottom: 45, width: 324, height: 81 }; // #10 window: 4.5 x 1.125in, 7/8in in, 5/8in up

function EnvelopeContent({
  from,
  to,
  settings,
  letterSize,
  stamps,
}: {
  from: Address;
  to: Address;
  settings: Settings;
  letterSize: LetterSize;
  stamps: number;
}) {
  const fromLines = formatAddressLines(from);
  const toLines = formatAddressLines(to);
  const hasFrom = fromLines.length > 0;
  const hasTo = toLines.length > 0;
  const isFr = settings.language === "fr";

  // Envelope dimensions at 72dpi: #10 = 9.5x4.125", 9x12" for large, 10x15" for legal
  const isLargeEnvelope = letterSize === "large" || letterSize === "legal";
  const envW = isLargeEnvelope ? (letterSize === "legal" ? 720 : 648) : 684;
  const envH = isLargeEnvelope ? (letterSize === "legal" ? 1080 : 864) : 297;
  const ink = isLargeEnvelope ? "#8B7355" : "#bbb";
  const stampLabel = isFr ? `${stamps} timbre${stamps > 1 ? "s" : ""}` : `${stamps} stamp${stamps > 1 ? "s" : ""}`;

  const stampBox = (
    <div
      style={{
        position: "absolute",
        top: isLargeEnvelope ? 28 : 16,
        right: 24,
        width: 44,
        height: 52,
        border: `1px dashed ${ink}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "7pt",
        color: ink,
        textAlign: "center",
        lineHeight: 1.2,
      }}
    >
      {stampLabel}
    </div>
  );

  if (!hasFrom && !hasTo) {
    return (
      <div
        style={{
          width: envW,
          height: envH,
          background: isLargeEnvelope ? "#D2B48C" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: `"${settings.fontFamily}", serif`,
          borderRadius: 2,
        }}
      >
        <p style={{ color: isLargeEnvelope ? "#8B7355" : "#d4d4d4", fontStyle: "italic", fontSize: 11 }}>
          {isFr
            ? "Ajoutez des adresses pour voir l'enveloppe"
            : "Add addresses to see the envelope"}
        </p>
      </div>
    );
  }

  // Standard: a #10 window envelope. Only the recipient shows through the
  // window; the return address is printed higher on the address page and stays
  // hidden until the envelope is opened.
  if (!isLargeEnvelope) {
    return (
      <div
        style={{
          width: envW,
          height: envH,
          background: "#fff",
          position: "relative",
          fontFamily: `"${settings.fontFamily}", serif`,
          lineHeight: 1.5,
          color: "#000",
          borderRadius: 2,
        }}
      >
        {stampBox}
        <div
          style={{
            position: "absolute",
            left: WINDOW.left,
            bottom: WINDOW.bottom,
            width: WINDOW.width,
            height: WINDOW.height,
            border: "1px solid #d4d4d4",
            background: "#fafafa",
            padding: "8px 14px",
            fontSize: "11pt",
            overflow: "hidden",
          }}
        >
          {toLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        {hasFrom && (
          <div style={{ position: "absolute", left: WINDOW.left, top: 20, fontSize: "7pt", color: "#bbb", fontStyle: "italic" }}>
            {isFr ? "Adresse de retour : imprimée à l'intérieur" : "Return address: printed inside, seen when opened"}
          </div>
        )}
      </div>
    );
  }

  // Flat mailers are hand-addressed on the envelope.
  return (
    <div
      style={{
        width: envW,
        height: envH,
        background: "#D2B48C",
        position: "relative",
        fontFamily: `"${settings.fontFamily}", serif`,
        fontSize: "10pt",
        lineHeight: 1.5,
        color: "#000",
        borderRadius: 2,
      }}
    >
      {hasFrom && (
        <div style={{ position: "absolute", top: 36, left: 28 }}>
          {fromLines.map((l, i) => (
            <div key={i} style={{ fontSize: "9pt" }}>{l}</div>
          ))}
        </div>
      )}
      {stampBox}
      {hasTo && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-30%, -40%)",
            fontSize: "11pt",
          }}
        >
          {toLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Address page (sheet 1 of a #10 window mailing) ───── */

function AddressPageContent({ from, to, settings }: { from: Address; to: Address; settings: Settings }) {
  const g = ADDRESS_PAGE;
  const isFr = settings.language === "fr";
  const block = (lines: string[], top: number) => (
    <div style={{ position: "absolute", left: g.left, top: top - g.fontSize, fontSize: g.fontSize, lineHeight: `${g.lineHeight}px` }}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
  const note = (text: string, top: number) => (
    <div style={{ position: "absolute", left: g.left + 250, top: top - g.fontSize, fontSize: 9, color: "#b5b5b5", fontStyle: "italic" }}>
      {text}
    </div>
  );
  const fromLines = formatAddressLines(from);
  const toLines = formatAddressLines(to);
  return (
    <div
      style={{
        width: g.width,
        height: g.height,
        background: "#fff",
        position: "relative",
        fontFamily: `"${settings.fontFamily}", serif`,
        color: "#000",
      }}
    >
      {block(fromLines, g.fromTop)}
      {note(isFr ? "Cachée derrière l'enveloppe, visible à l'ouverture" : "Hidden behind the envelope, seen when opened", g.fromTop)}
      {block(toLines, g.toTop)}
      {note(isFr ? "Visible dans la fenêtre" : "Shows in the window", g.toTop)}
    </div>
  );
}

/* ─── Letter Page Preview ────────────────────────────── */

function LetterPageContent({
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
}) {
  const isFr = settings.language === "fr";
  const pageH = letterSize === "legal" ? 1008 : 792; // 8.5x14 vs 8.5x11 at 72dpi

  const pageStyle: React.CSSProperties = {
    width: 612,
    height: pageH,
    padding: 72,
    fontFamily: `"${settings.fontFamily}", serif`,
    fontSize: `${settings.fontSize}pt`,
    lineHeight: 1.5,
    color: "#000",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...(settings.verticalCenter ? { justifyContent: "center" } : {}),
  };

  if (mode === "custom") {
    if (!htmlContent) {
      return (
        <div style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#d4d4d4", fontStyle: "italic", fontSize: "11pt" }}>
            {isFr ? "Commencez à écrire..." : "Start writing to see your letter..."}
          </p>
        </div>
      );
    }
    return (
      <div style={pageStyle}>
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
    );
  }

  if (mode === "upload") {
    if (!htmlContent) {
      return (
        <div style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#d4d4d4", fontStyle: "italic", fontSize: "11pt" }}>
            {isFr ? "Téléchargez un fichier..." : "Upload a file to preview..."}
          </p>
        </div>
      );
    }
    const pdfMatch = htmlContent.match(/data-pdf="([^"]+)"/);
    if (pdfMatch) {
      return <PdfCanvasPreview base64={pdfMatch[1]} width={612} />;
    }
    return (
      <div style={pageStyle}>
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
    );
  }

  // Simple mode
  const isEmpty =
    !letterData.date &&
    !letterData.greeting &&
    !letterData.subject &&
    !letterData.body &&
    !letterData.closing &&
    !letterData.senderName;

  if (isEmpty) {
    return (
      <div style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#d4d4d4", fontStyle: "italic", fontSize: "11pt" }}>
          {isFr ? "Commencez à écrire..." : "Start writing to see your letter..."}
        </p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {letterData.date && (
        <div style={{ textAlign: "right", marginBottom: "20pt" }}>
          {formatDate(letterData.date, settings.language)}
        </div>
      )}
      {letterData.reference && (
        <div style={{ marginBottom: "12pt", fontSize: "0.9em" }}>
          {isFr ? "Réf" : "Ref"}: {letterData.reference}
        </div>
      )}
      {letterData.subject && (
        <div style={{ marginBottom: "16pt" }}>
          <strong>{isFr ? "Objet" : "Re"}: {letterData.subject}</strong>
        </div>
      )}
      {letterData.greeting && (
        <div style={{ marginBottom: "12pt" }}>{letterData.greeting}</div>
      )}
      {letterData.body && (
        <div style={{ whiteSpace: "pre-wrap" }}>{letterData.body}</div>
      )}
      {(letterData.closing || letterData.senderName) && (
        <div style={{ marginTop: "20pt" }}>
          {letterData.closing && <div>{letterData.closing}</div>}
          {letterData.senderName && (
            <div style={{ marginTop: "32pt" }}>{letterData.senderName}</div>
          )}
        </div>
      )}
      {letterData.cc && (
        <div style={{ marginTop: "16pt", fontSize: "0.9em" }}>CC: {letterData.cc}</div>
      )}
      {letterData.enclosures && (
        <div style={{ marginTop: "8pt", fontSize: "0.9em" }}>
          {isFr ? "P.J." : "Encl."}: {letterData.enclosures}
        </div>
      )}
      {letterData.ps && (
        <div style={{ marginTop: "12pt", fontStyle: "italic", fontSize: "0.9em" }}>
          P.S. {letterData.ps}
        </div>
      )}
    </div>
  );
}

/* ─── Exports ─────────────────────────────────── */

export function EnvelopePreviewScaled({
  from,
  to,
  settings,
  letterSize,
  stamps,
}: {
  from: Address;
  to: Address;
  settings: Settings;
  letterSize: LetterSize;
  stamps: number;
}) {
  const isLarge = letterSize === "large" || letterSize === "legal";
  const w = isLarge ? (letterSize === "legal" ? 720 : 648) : 684;
  const h = isLarge ? (letterSize === "legal" ? 1080 : 864) : 297;

  return (
    <ScaledFrame nativeWidth={w} nativeHeight={h}>
      <EnvelopeContent from={from} to={to} settings={settings} letterSize={letterSize} stamps={stamps} />
    </ScaledFrame>
  );
}

/** Sheet 1 of a #10 window mailing: where the addresses sit. */
export function AddressPagePreviewScaled({ from, to, settings }: { from: Address; to: Address; settings: Settings }) {
  return (
    <ScaledFrame nativeWidth={ADDRESS_PAGE.width} nativeHeight={ADDRESS_PAGE.height}>
      <AddressPageContent from={from} to={to} settings={settings} />
    </ScaledFrame>
  );
}

export function LetterPreviewScaled({
  mode,
  letterData,
  htmlContent,
  settings,
  letterSize = "standard",
  previewPdf,
}: {
  mode: "simple" | "custom" | "upload";
  letterData: SimpleLetterData;
  htmlContent: string;
  settings: Settings;
  letterSize?: LetterSize;
  /** The real generated PDF for a classic letter, so the preview is exactly what prints. */
  previewPdf?: string | null;
}) {
  // PDF uploads: render with PdfCanvasPreview
  if (mode === "upload" && htmlContent) {
    const pdfMatch = htmlContent.match(/data-pdf="([^"]+)"/);
    if (pdfMatch) {
      return <PdfPagesScaled base64={pdfMatch[1]} />;
    }
    return <PaginatedHtmlPreview html={htmlContent} settings={{ ...settings, verticalCenter: false }} letterSize={letterSize} />;
  }

  if (mode === "custom" && htmlContent) {
    return <PaginatedHtmlPreview html={htmlContent} settings={settings} letterSize={letterSize} />;
  }

  if (mode === "simple" && previewPdf && letterData.body.trim()) {
    return <PdfPagesScaled base64={previewPdf} />;
  }

  const pageH = letterSize === "legal" ? 1008 : 792;
  return (
    <ScaledFrame nativeWidth={612} nativeHeight={pageH}>
      <LetterPageContent
        mode={mode}
        letterData={letterData}
        htmlContent={htmlContent}
        settings={settings}
        letterSize={letterSize}
      />
    </ScaledFrame>
  );
}

/**
 * Multi-page preview of HTML (the custom editor, or a converted .docx), laid out
 * by the same engine that makes the PDF: same margins, same page breaks.
 */
function PaginatedHtmlPreview({ html, settings, letterSize }: { html: string; settings: Settings; letterSize: LetterSize }) {
  const [layout, setLayout] = useState<HtmlLayout | null>(null);

  // Measured on a short debounce, outside React's commit: laying the HTML out
  // synchronously on every keystroke made typing in a long custom letter loop
  // (layout work during commit fed back into the editor's own DOM updates) and
  // is wasted work besides.
  useEffect(() => {
    const t = setTimeout(() => setLayout(layoutHtml(html, settings, letterSize)), 150);
    return () => clearTimeout(t);
  }, [html, settings, letterSize]);

  if (!layout) return null;
  const { pageH, sliceH, pages } = layout;
  const font = {
    fontFamily: `"${settings.fontFamily}", serif`,
    fontSize: `${settings.fontSize}pt`,
    lineHeight: 1.5,
    color: "#000",
  };

  // Everything fits one page: shown exactly as printed, including vertical centring.
  if (layout.fits) {
    return (
      <ScaledFrame nativeWidth={612} nativeHeight={pageH}>
        <div
          style={{
            width: 612,
            height: pageH,
            padding: 72,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxSizing: "border-box",
            ...font,
            ...(settings.verticalCenter ? { justifyContent: "center" } : {}),
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: layout.html }} />
        </div>
      </ScaledFrame>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: pages }, (_, i) => (
        <div key={i}>
          {i > 0 && (
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Page {i + 1}
            </p>
          )}
          <ScaledFrame nativeWidth={612} nativeHeight={pageH}>
            <div style={{ width: 612, height: pageH, overflow: "hidden", background: "#fff", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 72, width: 612, height: sliceH, overflow: "hidden" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: -i * sliceH,
                    width: 612,
                    padding: "0 72px",
                    boxSizing: "border-box",
                    ...font,
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: layout.html }} />
                </div>
              </div>
            </div>
          </ScaledFrame>
        </div>
      ))}
    </div>
  );
}

/** Renders all PDF pages scaled to fill the container width */
function PdfPagesScaled({ base64 }: { base64: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 && (
        <PdfCanvasPreview base64={base64} width={width} />
      )}
    </div>
  );
}
