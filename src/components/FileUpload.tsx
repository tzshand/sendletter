"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2 } from "lucide-react";
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
          // For PDFs, we'll store a placeholder and handle rendering in preview
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
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  if (fileName) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <FileText className="w-12 h-12 text-brand mx-auto mb-3" />
        <p className="font-medium">{fileName}</p>
        <p className="text-sm text-gray-500 mt-1">File loaded successfully</p>
        <button
          onClick={() => onContent("", "")}
          className="mt-4 text-sm text-red-500 hover:text-red-700"
        >
          Remove and upload different file
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-brand bg-blue-50"
            : "border-gray-300 hover:border-gray-400 bg-white"
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <Loader2 className="w-10 h-10 text-brand mx-auto animate-spin" />
        ) : (
          <>
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="font-medium">
              {isDragActive ? "Drop your file here" : "Drag & drop your file"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              PDF or Word (.docx) — up to 10 pages, 10MB max
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
