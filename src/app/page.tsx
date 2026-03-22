"use client";

import { useState } from "react";
import { SimpleLetterForm, type SimpleLetterData } from "@/components/SimpleLetterForm";
import { LetterEditor } from "@/components/LetterEditor";
import { FileUpload } from "@/components/FileUpload";
import { AddressSection, type Address } from "@/components/AddressForm";
import { LivePreview } from "@/components/LivePreview";
import { Mail, Eye, Loader2, ArrowRight, Upload } from "lucide-react";

const emptyAddress: Address = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
};

export default function Home() {
  const [mode, setMode] = useState<"simple" | "custom">("simple");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [sending, setSending] = useState(false);

  // Simple mode state
  const [letterData, setLetterData] = useState<SimpleLetterData>({
    date: new Date().toISOString().split("T")[0],
    subject: "",
    body: "",
    closing: "Sincerely",
    senderName: "",
  });

  // Custom mode state
  const [htmlContent, setHtmlContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [customSource, setCustomSource] = useState<"write" | "upload" | null>(null);

  // Address state
  const [from, setFrom] = useState<Address>(emptyAddress);
  const [to, setTo] = useState<Address>(emptyAddress);

  const isAddressValid = (a: Address) =>
    !!(a.name && a.line1 && a.city && a.province && a.postalCode);

  const canSend =
    isAddressValid(from) &&
    isAddressValid(to) &&
    (mode === "simple" ? !!letterData.body.trim() : !!htmlContent);

  const handleCheckout = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent, from, to, mode, letterData }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not create checkout. Are Stripe keys configured?");
        setSending(false);
      }
    } catch {
      alert("Failed to connect. Please try again.");
      setSending(false);
    }
  };

  const switchMode = (newMode: "simple" | "custom") => {
    if (newMode === mode) return;
    setMode(newMode);
    if (newMode === "custom") {
      setCustomSource(null);
      setHtmlContent("");
      setFileName("");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          <span className="text-base font-semibold tracking-tight">sendletter</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile preview toggle */}
          <button
            onClick={() => setMobilePreview(true)}
            className="lg:hidden flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <span className="text-sm text-gray-400">
            $4.99 flat rate
          </span>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
              <button
                onClick={() => switchMode("simple")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  mode === "simple"
                    ? "bg-white text-gray-900 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => switchMode("custom")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  mode === "custom"
                    ? "bg-white text-gray-900 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Custom
              </button>
            </div>

            {/* Letter content area */}
            {mode === "simple" ? (
              <SimpleLetterForm data={letterData} onChange={setLetterData} />
            ) : (
              <div>
                {!customSource && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setCustomSource("write")}
                      className="border border-gray-200 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                    >
                      <span className="text-2xl block mb-1">✏️</span>
                      <span className="text-sm font-medium">Write</span>
                    </button>
                    <button
                      onClick={() => setCustomSource("upload")}
                      className="border border-gray-200 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                    >
                      <Upload className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                      <span className="text-sm font-medium">Upload</span>
                    </button>
                  </div>
                )}

                {customSource === "write" && (
                  <div>
                    <button
                      onClick={() => {
                        setCustomSource(null);
                        setHtmlContent("");
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 mb-3"
                    >
                      ← back
                    </button>
                    <LetterEditor content={htmlContent} onChange={setHtmlContent} />
                  </div>
                )}

                {customSource === "upload" && (
                  <div>
                    <button
                      onClick={() => {
                        setCustomSource(null);
                        setHtmlContent("");
                        setFileName("");
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 mb-3"
                    >
                      ← back
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
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Addresses */}
            <AddressSection
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          </div>
        </div>

        {/* Right: Preview panel (desktop) */}
        <div className="hidden lg:flex w-[440px] border-l border-gray-200 bg-gray-50 flex-col">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
            <div className="w-full max-w-[340px]">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Preview
              </p>
              <div className="rounded-sm shadow-lg ring-1 ring-gray-200">
                <LivePreview
                  mode={mode}
                  letterData={letterData}
                  htmlContent={htmlContent}
                  from={from}
                  to={to}
                />
              </div>
            </div>
          </div>

          {/* Checkout bar */}
          <div className="border-t border-gray-200 bg-white px-5 py-4">
            <button
              onClick={handleCheckout}
              disabled={!canSend || sending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Send for $4.99
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {!canSend && (
              <p className="text-xs text-gray-400 text-center mt-2">
                Fill in your letter and both addresses to continue
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: sticky checkout bar */}
      <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => setMobilePreview(true)}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900"
        >
          <Eye className="w-5 h-5" />
        </button>
        <button
          onClick={handleCheckout}
          disabled={!canSend || sending}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Send for $4.99
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Mobile: preview overlay */}
      {mobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <span className="text-sm font-semibold">Letter Preview</span>
            <button
              onClick={() => setMobilePreview(false)}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex justify-center">
            <div className="w-full max-w-[340px]">
              <div className="rounded-sm shadow-lg ring-1 ring-gray-200">
                <LivePreview
                  mode={mode}
                  letterData={letterData}
                  htmlContent={htmlContent}
                  from={from}
                  to={to}
                />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            <button
              onClick={() => {
                setMobilePreview(false);
                handleCheckout();
              }}
              disabled={!canSend || sending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Send for $4.99
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
