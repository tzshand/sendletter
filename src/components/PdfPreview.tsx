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

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        // Render at 2x for sharpness then display at native size
        const scale = 2;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      } catch {
        if (!cancelled) setError(true);
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
    <canvas
      ref={canvasRef}
      style={{ width, height, background: "#fff", display: "block" }}
    />
  );
}
