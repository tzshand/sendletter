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

function formatAddressBlock(a: Address): string[] {
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

function LetterPage({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: Settings;
}) {
  return (
    <div
      className="preview-frame"
      style={{
        fontFamily: `"${settings.fontFamily}", serif`,
        fontSize: `${settings.fontSize}pt`,
        lineHeight: 1.5,
        padding: "72px", // 1 inch margin
        display: "flex",
        flexDirection: "column",
        color: "#000",
      }}
    >
      {children}
    </div>
  );
}

export function LivePreview({
  mode,
  letterData,
  htmlContent,
  from,
  to,
  settings,
}: {
  mode: "simple" | "custom" | "upload";
  letterData: SimpleLetterData;
  htmlContent: string;
  from: Address;
  to: Address;
  settings: Settings;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setScale(width / 612); // 612 = 8.5in * 72dpi
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fromLines = formatAddressBlock(from);
  const toLines = formatAddressBlock(to);
  const hasFrom = fromLines.length > 0;
  const hasTo = toLines.length > 0;
  const isFr = settings.language === "fr";

  const renderSimple = () => {
    const isEmpty =
      !letterData.date &&
      !letterData.subject &&
      !letterData.body &&
      !letterData.closing &&
      !letterData.senderName &&
      !hasFrom &&
      !hasTo;

    if (isEmpty) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#d4d4d4", fontStyle: "italic", fontSize: "11pt" }}>
            {isFr ? "Commencez à écrire..." : "Start writing to see your letter..."}
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Date - right aligned */}
        {letterData.date && (
          <div style={{ textAlign: "right", marginBottom: "24pt" }}>
            {formatDate(letterData.date, settings.language)}
          </div>
        )}

        {/* From address */}
        {hasFrom && (
          <div style={{ marginBottom: "18pt" }}>
            {fromLines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}

        {/* To address */}
        {hasTo && (
          <div style={{ marginBottom: "24pt" }}>
            {toLines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}

        {/* Subject */}
        {letterData.subject && (
          <div style={{ marginBottom: "18pt" }}>
            <strong>{isFr ? "Objet" : "Re"}: {letterData.subject}</strong>
          </div>
        )}

        {/* Salutation */}
        <div style={{ marginBottom: "12pt" }}>
          {isFr ? "Madame, Monsieur," : "Dear Sir or Madam,"}
        </div>

        {/* Body */}
        {letterData.body && (
          <div style={{ flex: 1, whiteSpace: "pre-wrap", marginBottom: "24pt" }}>
            {letterData.body}
          </div>
        )}

        {/* Closing & Signature */}
        {(letterData.closing || letterData.senderName) && (
          <div>
            {letterData.closing && <div>{letterData.closing},</div>}
            {letterData.senderName && (
              <div style={{ marginTop: "36pt" }}>{letterData.senderName}</div>
            )}
          </div>
        )}
      </>
    );
  };

  const renderCustom = () => {
    if (!htmlContent) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#d4d4d4", fontStyle: "italic", fontSize: "11pt" }}>
            {isFr ? "Commencez à écrire..." : "Start writing to see your letter..."}
          </p>
        </div>
      );
    }

    return (
      <>
        {(hasFrom || hasTo) && (
          <div style={{ marginBottom: "24pt", fontSize: "0.92em" }}>
            {hasFrom && (
              <div style={{ marginBottom: "12pt" }}>
                {fromLines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}
            {hasTo && (
              <div>
                {toLines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}
          </div>
        )}
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </>
    );
  };

  const renderUpload = () => {
    if (!htmlContent) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#d4d4d4", fontStyle: "italic", fontSize: "11pt" }}>
            {isFr ? "Téléchargez un fichier..." : "Upload a file to preview..."}
          </p>
        </div>
      );
    }

    const pdfMatch = htmlContent.match(/data-pdf="([^"]+)"/);
    if (pdfMatch) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#888", fontStyle: "italic", fontSize: "11pt" }}>
            PDF — {isFr ? "aperçu non disponible" : "preview not available in thumbnail"}
          </p>
        </div>
      );
    }

    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  };

  return (
    <div ref={containerRef} className="w-full">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: "612px",
          height: `${792 * scale}px`,
        }}
      >
        {/* Outer wrapper at original height for parent container */}
        <div style={{ width: "612px", height: "0px" }}>
          <LetterPage settings={settings}>
            {mode === "simple" && renderSimple()}
            {mode === "custom" && renderCustom()}
            {mode === "upload" && renderUpload()}
          </LetterPage>
        </div>
      </div>
      {/* Spacer to account for scaled height */}
      <div style={{ height: `${792 * scale}px` }} />
    </div>
  );
}
