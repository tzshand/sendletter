"use client";

import { useRef, useEffect, useState } from "react";
import type { Address } from "./AddressForm";
import type { SimpleLetterData } from "./SimpleLetterForm";
import type { Settings } from "./LetterSettings";

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

// Closing is now free-text input, rendered as-is

/* ─── Scaled container ─────────────────────────────────── */

function ScaledPage({
  children,
  width,
  height,
}: {
  children: React.ReactNode;
  width: number;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setScale(e.contentRect.width / width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [width]);

  return (
    <div ref={containerRef} className="w-full">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width,
        }}
      >
        {children}
      </div>
      <div style={{ height: height * scale }} />
    </div>
  );
}

/* ─── Envelope Preview ─────────────────────────────────── */

function EnvelopePreview({
  from,
  to,
  settings,
}: {
  from: Address;
  to: Address;
  settings: Settings;
}) {
  const fromLines = formatAddressLines(from);
  const toLines = formatAddressLines(to);
  const hasFrom = fromLines.length > 0;
  const hasTo = toLines.length > 0;
  const isFr = settings.language === "fr";

  if (!hasFrom && !hasTo) {
    return (
      <div
        style={{
          width: 684,
          height: 306,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: `"${settings.fontFamily}", serif`,
        }}
      >
        <p style={{ color: "#d4d4d4", fontStyle: "italic", fontSize: 11 }}>
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
        width: 684, // #10 envelope at 72dpi (9.5in)
        height: 306, // 4.25in
        background: "#fff",
        position: "relative",
        fontFamily: `"${settings.fontFamily}", serif`,
        fontSize: "10pt",
        lineHeight: 1.5,
        color: "#000",
        padding: 36,
      }}
    >
      {/* From: top-left */}
      {hasFrom && (
        <div style={{ position: "absolute", top: 28, left: 32 }}>
          {fromLines.map((l, i) => (
            <div key={i} style={{ fontSize: "9pt" }}>
              {l}
            </div>
          ))}
        </div>
      )}

      {/* Stamp placeholder: top-right */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 28,
          width: 48,
          height: 56,
          border: "1px dashed #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "7pt",
          color: "#bbb",
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

/* ─── Letter Preview ─────────────────────────────────── */

function LetterPreview({
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
  const closing = letterData.closing;

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
      {/* Date - right aligned */}
      {letterData.date && (
        <div style={{ textAlign: "right", marginBottom: "20pt" }}>
          {formatDate(letterData.date, settings.language)}
        </div>
      )}

      {/* Reference */}
      {letterData.reference && (
        <div style={{ marginBottom: "12pt", fontSize: "0.9em" }}>
          {isFr ? "Réf" : "Ref"}: {letterData.reference}
        </div>
      )}

      {/* Subject */}
      {letterData.subject && (
        <div style={{ marginBottom: "16pt" }}>
          <strong>
            {isFr ? "Objet" : "Re"}: {letterData.subject}
          </strong>
        </div>
      )}

      {/* Greeting */}
      {letterData.greeting && (
        <div style={{ marginBottom: "12pt" }}>{letterData.greeting}</div>
      )}

      {/* Body */}
      {letterData.body && (
        <div style={{ flex: 1, whiteSpace: "pre-wrap" }}>{letterData.body}</div>
      )}

      {/* Closing & Signature */}
      {(closing || letterData.senderName) && (
        <div style={{ marginTop: "20pt" }}>
          {closing && <div>{closing},</div>}
          {letterData.senderName && (
            <div style={{ marginTop: "32pt" }}>{letterData.senderName}</div>
          )}
        </div>
      )}

      {/* CC */}
      {letterData.cc && (
        <div style={{ marginTop: "16pt", fontSize: "0.9em" }}>
          CC: {letterData.cc}
        </div>
      )}

      {/* Enclosures */}
      {letterData.enclosures && (
        <div style={{ marginTop: "8pt", fontSize: "0.9em" }}>
          {isFr ? "P.J." : "Encl."}: {letterData.enclosures}
        </div>
      )}

      {/* P.S. */}
      {letterData.ps && (
        <div style={{ marginTop: "12pt", fontStyle: "italic", fontSize: "0.9em" }}>
          P.S. {letterData.ps}
        </div>
      )}
    </div>
  );
}

/* ─── Exports ─────────────────────────────────── */

export function LetterPreviewScaled(props: {
  mode: "simple" | "custom" | "upload";
  letterData: SimpleLetterData;
  htmlContent: string;
  settings: Settings;
}) {
  return (
    <ScaledPage width={612} height={792}>
      <LetterPreview {...props} />
    </ScaledPage>
  );
}

export function EnvelopePreviewScaled(props: {
  from: Address;
  to: Address;
  settings: Settings;
}) {
  return (
    <ScaledPage width={684} height={306}>
      <EnvelopePreview {...props} />
    </ScaledPage>
  );
}
