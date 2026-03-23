"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, X } from "lucide-react";
import mammoth from "mammoth";

/** Convert HTML from mammoth into a multi-page PDF, return base64 */
async function htmlToPdf(html: string): Promise<{ base64: string; pages: number }> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pageW = 612; // 8.5in at 72dpi
  const pageH = 792; // 11in at 72dpi
  const padding = 72; // 1in margins

  // Render into a hidden container with no height constraint to measure total content
  const measure = document.createElement("div");
  measure.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: ${pageW}px; background: #fff;
    font-family: "Times New Roman", serif; font-size: 12pt;
    line-height: 1.6; color: #000;
    padding: ${padding}px;
    box-sizing: border-box;
  `;
  measure.innerHTML = html;
  document.body.appendChild(measure);

  const totalH = measure.scrollHeight;
  const contentH = pageH - padding * 2;
  const pages = Math.max(1, Math.ceil(totalH / pageH));

  document.body.removeChild(measure);

  const doc = new jsPDF({ orientation: "portrait", unit: "in", format: [8.5, 11] });

  for (let i = 0; i < pages; i++) {
    if (i > 0) doc.addPage();

    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: ${pageW}px; height: ${pageH}px;
      background: #fff; overflow: hidden;
      font-family: "Times New Roman", serif; font-size: 12pt;
      line-height: 1.6; color: #000;
      padding: ${padding}px;
      box-sizing: border-box;
    `;
    // Shift content up by page offset
    const inner = document.createElement("div");
    inner.style.cssText = `margin-top: -${i * contentH}px;`;
    inner.innerHTML = html;
    container.appendChild(inner);
    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      width: pageW,
      height: pageH,
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", 0, 0, 8.5, 11);
  }

  const output = doc.output("datauristring");
  return { base64: output.split(",")[1], pages };
}

export function FileUpload({
  onContent,
  fileName,
  onPageCount,
  language = "en",
}: {
  onContent: (html: string, name: string) => void;
  fileName: string;
  onPageCount?: (count: number) => void;
  language?: "en" | "fr";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const processFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError("");

      try {
        if (file.type === "application/pdf") {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(",")[1];
            onContent(
              `<div data-pdf="${base64}" data-filename="${file.name}"></div>`,
              file.name
            );
            // Detect page count
            if (onPageCount) {
              try {
                const pdfjsLib = await import("pdfjs-dist");
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                const pdf = await pdfjsLib.getDocument({ data }).promise;
                onPageCount(pdf.numPages);
              } catch { /* ignore */ }
            }
            setLoading(false);
          };
          reader.readAsDataURL(file);
        } else if (
          file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.name.endsWith(".docx")
        ) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (result.value.length === 0) {
            setError("The document appears to be empty.");
            setLoading(false);
          } else {
            // Convert HTML to PDF for accurate page breaks and preview
            try {
              const { base64, pages } = await htmlToPdf(result.value);
              onContent(
                `<div data-pdf="${base64}" data-filename="${file.name}"></div>`,
                file.name
              );
              if (onPageCount) onPageCount(pages);
            } catch {
              // Fallback: use raw HTML if PDF conversion fails
              onContent(result.value, file.name);
            }
            setLoading(false);
          }
        } else {
          setError("Please upload a PDF or Word (.docx) file.");
          setLoading(false);
        }
      } catch {
        setError("Failed to process file. Please try another.");
        setLoading(false);
      }
    },
    [onContent]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (files[0]) processFile(files[0]);
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  if (fileName) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-gray-400">{language === "fr" ? "Prêt à envoyer" : "Ready to send"}</p>
        </div>
        <button
          onClick={() => onContent("", "")}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-gray-400 bg-gray-50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <Loader2 className="w-6 h-6 text-gray-400 mx-auto animate-spin" />
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isDragActive
                ? (language === "fr" ? "Déposez votre fichier ici" : "Drop your file here")
                : (language === "fr" ? "Déposez un fichier ou cliquez pour parcourir" : "Drop a file or click to browse")}
            </p>
            <p className="text-xs text-gray-400">
              {language === "fr" ? "PDF ou Word (.docx) — jusqu'à 10 pages" : "PDF or Word (.docx) — up to 10 pages"}
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
