"use client";

import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { LetterEditor } from "@/components/LetterEditor";
import { Preview } from "@/components/Preview";
import { AddressForm, type Address } from "@/components/AddressForm";
import { Checkout } from "@/components/Checkout";
import { Stepper } from "@/components/Stepper";
import { Mail } from "lucide-react";

const STEPS = ["Create", "Preview", "Addresses", "Send"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"upload" | "write" | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fromAddress, setFromAddress] = useState<Address>({
    name: "",
    line1: "",
    line2: "",
    city: "",
    province: "",
    postalCode: "",
  });
  const [toAddress, setToAddress] = useState<Address>({
    name: "",
    line1: "",
    line2: "",
    city: "",
    province: "",
    postalCode: "",
  });

  const canAdvance = () => {
    if (step === 0) return htmlContent.length > 0;
    if (step === 1) return true;
    if (step === 2) {
      const valid = (a: Address) =>
        a.name && a.line1 && a.city && a.province && a.postalCode;
      return valid(fromAddress) && valid(toAddress);
    }
    return false;
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6 text-brand" />
            <span className="text-xl font-semibold">sendletter</span>
          </div>
          <span className="text-sm text-gray-500">
            Flat rate — <strong>$4.99</strong> anywhere in Canada
          </span>
        </div>
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-4xl mx-auto">
          <Stepper steps={STEPS} current={step} />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Step 0: Create */}
          {step === 0 && (
            <div>
              {!mode && (
                <div className="grid md:grid-cols-2 gap-6">
                  <button
                    onClick={() => setMode("upload")}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-brand hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="text-4xl mb-3">📄</div>
                    <h2 className="text-lg font-semibold mb-1">
                      Upload a file
                    </h2>
                    <p className="text-sm text-gray-500">
                      PDF or Word document, up to 10 pages
                    </p>
                  </button>
                  <button
                    onClick={() => setMode("write")}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-brand hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="text-4xl mb-3">✏️</div>
                    <h2 className="text-lg font-semibold mb-1">
                      Write a letter
                    </h2>
                    <p className="text-sm text-gray-500">
                      Use our editor — up to 10 pages
                    </p>
                  </button>
                </div>
              )}

              {mode === "upload" && (
                <div>
                  <button
                    onClick={() => {
                      setMode(null);
                      setHtmlContent("");
                      setFileName("");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
                  >
                    ← Back to options
                  </button>
                  <FileUpload
                    onContent={(html, name) => {
                      setHtmlContent(html);
                      setFileName(name);
                    }}
                    fileName={fileName}
                  />
                </div>
              )}

              {mode === "write" && (
                <div>
                  <button
                    onClick={() => {
                      setMode(null);
                      setHtmlContent("");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
                  >
                    ← Back to options
                  </button>
                  <LetterEditor
                    content={htmlContent}
                    onChange={setHtmlContent}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 1: Preview */}
          {step === 1 && <Preview htmlContent={htmlContent} />}

          {/* Step 2: Addresses */}
          {step === 2 && (
            <AddressForm
              from={fromAddress}
              to={toAddress}
              onFromChange={setFromAddress}
              onToChange={setToAddress}
            />
          )}

          {/* Step 3: Send */}
          {step === 3 && (
            <Checkout
              htmlContent={htmlContent}
              from={fromAddress}
              to={toAddress}
            />
          )}
        </div>
      </main>

      {/* Navigation */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {step < 3 && (
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              disabled={!canAdvance()}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {step === 2 ? "Review & Pay" : "Continue"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
