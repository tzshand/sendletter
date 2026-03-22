"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, X } from "lucide-react";
import mammoth from "mammoth";

export function FileUpload({
  onContent,
  fileName,
}: {
  onContent: (html: string, name: string) => void;
  fileName: string;
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
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            onContent(
              `<div data-pdf="${base64}" data-filename="${file.name}"></div>`,
              file.name
            );
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
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <FileText className="w-5 h-5 text-gray-500 shrink-0" />
        <span className="text-sm font-medium truncate flex-1">{fileName}</span>
        <button
          onClick={() => onContent("", "")}
          className="text-gray-400 hover:text-gray-600 shrink-0"
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
        className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-gray-900 bg-gray-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <Loader2 className="w-5 h-5 text-gray-400 mx-auto animate-spin" />
        ) : (
          <>
            <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Drop a PDF or .docx, or <span className="underline">browse</span>
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
