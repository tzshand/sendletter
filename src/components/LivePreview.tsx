"use client";

import type { Address } from "./AddressForm";
import type { SimpleLetterData } from "./SimpleLetterForm";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", {
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

export function LivePreview({
  mode,
  letterData,
  htmlContent,
  from,
  to,
  className,
}: {
  mode: "simple" | "custom";
  letterData: SimpleLetterData;
  htmlContent: string;
  from: Address;
  to: Address;
  className?: string;
}) {
  const fromLines = formatAddressBlock(from);
  const toLines = formatAddressBlock(to);
  const hasFrom = fromLines.length > 0;
  const hasTo = toLines.length > 0;

  if (mode === "custom") {
    const pdfMatch = htmlContent.match(/data-pdf="([^"]+)"/);
    if (pdfMatch) {
      return (
        <div className={`letter-page ${className || ""}`}>
          <p style={{ color: "#666", fontStyle: "italic", fontSize: "0.85em" }}>
            PDF document uploaded
          </p>
        </div>
      );
    }

    return (
      <div className={`letter-page ${className || ""}`}>
        {(hasFrom || hasTo) && (
          <div style={{ marginBottom: "2em", fontSize: "0.9em" }}>
            {hasFrom && (
              <div style={{ marginBottom: "1em" }}>
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
        {htmlContent ? (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : (
          <p style={{ color: "#ccc", fontStyle: "italic" }}>
            Start writing to see your letter here...
          </p>
        )}
      </div>
    );
  }

  // Simple mode preview
  const isEmpty =
    !letterData.date &&
    !letterData.subject &&
    !letterData.body &&
    !letterData.closing &&
    !letterData.senderName &&
    !hasFrom &&
    !hasTo;

  return (
    <div className={`letter-page ${className || ""}`}>
      {isEmpty ? (
        <p style={{ color: "#ccc", fontStyle: "italic" }}>
          Start writing to see your letter here...
        </p>
      ) : (
        <>
          {/* From address block */}
          {hasFrom && (
            <div style={{ marginBottom: "1.5em" }}>
              {fromLines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          )}

          {/* Date */}
          {letterData.date && (
            <div style={{ marginBottom: "1.5em" }}>
              {formatDate(letterData.date)}
            </div>
          )}

          {/* To address block */}
          {hasTo && (
            <div style={{ marginBottom: "1.5em" }}>
              {toLines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          )}

          {/* Subject */}
          {letterData.subject && (
            <div style={{ marginBottom: "1.5em" }}>
              <strong>Re: {letterData.subject}</strong>
            </div>
          )}

          {/* Body */}
          {letterData.body && (
            <div style={{ marginBottom: "1.5em", whiteSpace: "pre-wrap" }}>
              {letterData.body}
            </div>
          )}

          {/* Closing & Name */}
          {(letterData.closing || letterData.senderName) && (
            <div style={{ marginTop: "2em" }}>
              {letterData.closing && <div>{letterData.closing},</div>}
              {letterData.senderName && (
                <div style={{ marginTop: "2em" }}>{letterData.senderName}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
