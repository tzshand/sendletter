"use client";

import { useEffect, useRef, useState } from "react";

export function PdfCanvasPreview({
  base64,
  width,
  height,
}: {
  base64: string;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        // Render at 2x for sharpness
        const scale = 2;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (!cancelled) setLoading(false);
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
    <div style={{ width, height, background: "#fff", position: "relative" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#bbb", fontSize: 11 }}>Rendering PDF...</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ width, height, background: "#fff", display: "block" }}
      />
    </div>
  );
}
