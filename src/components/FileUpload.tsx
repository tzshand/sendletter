"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, X } from "lucide-react";
import mammoth from "mammoth";

/** Measure how many 8.5×11 pages the HTML content fills */
function measurePages(html: string): number {
  const pageW = 612;
  const pageH = 792;
  const padding = 72;

  const el = document.createElement("div");
  el.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: ${pageW}px; background: #fff;
    font-family: "Times New Roman", serif; font-size: 12pt;
    line-height: 1.6; color: #000;
    padding: ${padding}px;
    box-sizing: border-box;
  `;
  el.innerHTML = html;
  document.body.appendChild(el);
  const pages = Math.max(1, Math.ceil(el.scrollHeight / pageH));
  document.body.removeChild(el);
  return pages;
}

export function FileUpload({
  onContent,
  fileName,
  onPageCount,
  onOriginalFile,
  language = "en",
}: {
  onContent: (html: string, name: string) => void;
  fileName: string;
  onPageCount?: (count: number) => void;
  onOriginalFile?: (file: { base64: string; name: string; type: string } | null) => void;
  language?: "en" | "fr";
}) {
  const MAX_PAGES = 15;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const processFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError("");
      setWarning("");

      try {
        if (file.type === "application/pdf") {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(",")[1];
            onContent(
              `<div data-pdf="${base64}" data-filename="${file.name}"></div>`,
              file.name
            );
            if (onPageCount) {
              try {
                const pdfjsLib = await import("pdfjs-dist");
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                const pdf = await pdfjsLib.getDocument({ data }).promise;
                const raw = pdf.numPages;
                const capped = Math.min(raw, MAX_PAGES);
                onPageCount(capped);
                if (raw > MAX_PAGES) {
                  setWarning(
                    language === "fr"
                      ? `Votre document fait ${raw} pages — seules les ${MAX_PAGES} premières seront imprimées.`
                      : `Your document has ${raw} pages — only the first ${MAX_PAGES} will be printed.`
                  );
                }
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
            if (onOriginalFile) {
              const bytes = new Uint8Array(arrayBuffer);
              let binary = "";
              for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              onOriginalFile({ base64: btoa(binary), name: file.name, type: file.type });
            }
            const raw = measurePages(result.value);
            const capped = Math.min(raw, MAX_PAGES);
            onContent(result.value, file.name);
            if (onPageCount) onPageCount(capped);
            if (raw > MAX_PAGES) {
              setWarning(
                language === "fr"
                  ? `Votre document fait ${raw} pages — seules les ${MAX_PAGES} premières seront imprimées.`
                  : `Your document has ${raw} pages — only the first ${MAX_PAGES} will be printed.`
              );
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
              {language === "fr" ? "PDF ou Word (.docx) — jusqu'à 15 pages" : "PDF or Word (.docx) — up to 15 pages"}
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
      {warning && (
        <p className="mt-2 text-xs text-amber-600">{warning}</p>
      )}
    </div>
  );
}
