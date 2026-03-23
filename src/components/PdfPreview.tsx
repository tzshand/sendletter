"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders all pages of a PDF to stacked canvases.
 * Each canvas renders at 2x the target display width for sharpness.
 * Display height is computed per-page from actual PDF dimensions.
 */
export function PdfCanvasPreview({
  base64,
  width,
}: {
  base64: string;
  width: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const renderedRef = useRef(false);

  useEffect(() => {
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

        container.innerHTML = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;

          // Use scale=2 for retina sharpness
          const scale = 2;
          const viewport = page.getViewport({ scale });

          // Compute display height from actual page aspect ratio
          const displayH = width * (viewport.height / viewport.width);

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${displayH}px`;
          canvas.style.display = "block";
          canvas.style.background = "#fff";
          canvas.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
          canvas.style.borderRadius = "4px";

          if (i > 1) {
            const label = document.createElement("div");
            label.textContent = `Page ${i}`;
            label.style.cssText =
              "text-align:center;font-size:11px;color:#999;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;padding:16px 0 12px;font-family:system-ui,sans-serif;";
            container.appendChild(label);
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
  }, [base64, width]);

  if (error) {
    return (
      <div
        style={{
          width,
          height: width * 1.294,
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
    <div style={{ width, background: "transparent", position: "relative" }}>
      {loading && (
        <div
          style={{
            width,
            height: width * 1.294,
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
