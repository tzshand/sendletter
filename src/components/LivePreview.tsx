"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import type { Address } from "./AddressForm";
import type { SimpleLetterData } from "./SimpleLetterForm";
import type { Settings } from "./LetterSettings";
import type { LetterSize } from "./LetterSizeSelector";

function formatDate(dateStr: string, language: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAddressLines(a: Address): string[] {
  const lines: string[] = [];
  if (a.name) lines.push(a.name);
  if (a.line1) lines.push(a.line1);
  if (a.line2) lines.push(a.line2);
  const cityLine = [a.city, a.province].filter(Boolean).join(", ");
  if (cityLine || a.postalCode) {
    lines.push([cityLine, a.postalCode].filter(Boolean).join("  "));
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

function EnvelopeContent({
  from,
  to,
  settings,
  letterSize,
}: {
  from: Address;
  to: Address;
  settings: Settings;
  letterSize: LetterSize;
}) {
  const fromLines = formatAddressLines(from);
  const toLines = formatAddressLines(to);
  const hasFrom = fromLines.length > 0;
  const hasTo = toLines.length > 0;
  const isFr = settings.language === "fr";

  // Envelope dimensions at 72dpi
  const isLargeEnvelope = letterSize === "large";
  const envW = isLargeEnvelope ? 648 : 684; // 9x12" or #10 (9.5x4.125")
  const envH = isLargeEnvelope ? 864 : 297;

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

  return (
    <div
      style={{
        width: envW,
        height: envH,
        background: isLargeEnvelope ? "#D2B48C" : "#fff",
        position: "relative",
        fontFamily: `"${settings.fontFamily}", serif`,
        fontSize: "10pt",
        lineHeight: 1.5,
        color: "#000",
        borderRadius: 2,
      }}
    >
      {/* From: top-left */}
      {hasFrom && (
        <div style={{ position: "absolute", top: isLargeEnvelope ? 36 : 20, left: 28 }}>
          {fromLines.map((l, i) => (
            <div key={i} style={{ fontSize: "9pt" }}>{l}</div>
          ))}
        </div>
      )}

      {/* Stamp */}
      <div
        style={{
          position: "absolute",
          top: isLargeEnvelope ? 28 : 16,
          right: 24,
          width: 44,
          height: 52,
          border: `1px dashed ${isLargeEnvelope ? "#8B7355" : "#ccc"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "7pt",
          color: isLargeEnvelope ? "#8B7355" : "#bbb",
        }}
      >
        STAMP
      </div>

      {/* To: center */}
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

/* ─── Letter Page Preview ────────────────────────────── */

function LetterPageContent({
  mode,
  letterData,
  htmlContent,
  settings,
}: {
  mode: "simple" | "custom" | "upload";
  letterData: SimpleLetterData;
  htmlContent: string;
  settings: Settings;
}) {
  const isFr = settings.language === "fr";

  const pageStyle: React.CSSProperties = {
    width: 612,
    height: 792,
    padding: 72,
    fontFamily: `"${settings.fontFamily}", serif`,
    fontSize: `${settings.fontSize}pt`,
    lineHeight: 1.5,
    color: "#000",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
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
      const base64 = pdfMatch[1];
      return (
        <div style={{ width: 612, height: 792, background: "#fff" }}>
          <iframe
            src={`data:application/pdf;base64,${base64}#toolbar=0&navpanes=0`}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="PDF Preview"
          />
        </div>
      );
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
        <div style={{ flex: 1, whiteSpace: "pre-wrap" }}>{letterData.body}</div>
      )}
      {(letterData.closing || letterData.senderName) && (
        <div style={{ marginTop: "20pt" }}>
          {letterData.closing && <div>{letterData.closing},</div>}
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
}: {
  from: Address;
  to: Address;
  settings: Settings;
  letterSize: LetterSize;
}) {
  const isLarge = letterSize === "large";
  const w = isLarge ? 648 : 684;
  const h = isLarge ? 864 : 297;

  return (
    <ScaledFrame nativeWidth={w} nativeHeight={h}>
      <EnvelopeContent from={from} to={to} settings={settings} letterSize={letterSize} />
    </ScaledFrame>
  );
}

export function LetterPreviewScaled({
  mode,
  letterData,
  htmlContent,
  settings,
}: {
  mode: "simple" | "custom" | "upload";
  letterData: SimpleLetterData;
  htmlContent: string;
  settings: Settings;
}) {
  return (
    <ScaledFrame nativeWidth={612} nativeHeight={792}>
      <LetterPageContent
        mode={mode}
        letterData={letterData}
        htmlContent={htmlContent}
        settings={settings}
      />
    </ScaledFrame>
  );
}
