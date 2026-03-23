"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders all pages of a PDF to stacked canvases.
 * Each canvas renders at 2x the target display width for sharpness.
 * Width/height props define the CSS display size of each page.
 */
export function PdfCanvasPreview({
  base64,
  width,
  height,
}: {
  base64: string;
  width: number;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const renderedRef = useRef(false);

  useEffect(() => {
    // Only render once per base64 to prevent flicker loops
    if (renderedRef.current) return;
    let cancelled = false;

    async function render() {
      const container = containerRef.current;
      if (!container) return;

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;

        // Clear previous canvases
        container.innerHTML = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;

          const scale = 2;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          canvas.style.display = "block";
          canvas.style.background = "#fff";

          if (i > 1) {
            canvas.style.marginTop = "12px";
          }

          container.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        }

        if (!cancelled) {
          renderedRef.current = true;
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [base64, width, height]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#999", fontSize: 11 }}>Could not render PDF</p>
      </div>
    );
  }

  return (
    <div style={{ width, background: "#fff", position: "relative" }}>
      {loading && (
        <div
          style={{
            width,
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#bbb", fontSize: 11 }}>Rendering PDF...</p>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
