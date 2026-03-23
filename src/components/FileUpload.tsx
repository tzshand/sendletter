"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, X } from "lucide-react";
import mammoth from "mammoth";

export function FileUpload({
  onContent,
  fileName,
  onPageCount,
}: {
  onContent: (html: string, name: string) => void;
  fileName: string;
  onPageCount?: (count: number) => void;
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
          } else {
            onContent(result.value, file.name);
          }
          setLoading(false);
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
          <p className="text-xs text-gray-400">Ready to send</p>
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
              {isDragActive ? "Drop your file here" : "Drop a file or click to browse"}
            </p>
            <p className="text-xs text-gray-400">
              PDF or Word (.docx) — up to 10 pages
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
