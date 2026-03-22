"use client";

import { useState } from "react";
import {
  SimpleLetterForm,
  type SimpleLetterData,
} from "@/components/SimpleLetterForm";
import { LetterEditor } from "@/components/LetterEditor";
import { FileUpload } from "@/components/FileUpload";
import { AddressSection, type Address } from "@/components/AddressForm";
import {
  LetterPreviewScaled,
  EnvelopePreviewScaled,
} from "@/components/LivePreview";
import {
  LetterSettingsBar,
  type Settings,
} from "@/components/LetterSettings";
import {
  Mail,
  Eye,
  Loader2,
  ArrowRight,
  X,
  FileText,
  PenLine,
  Upload,
} from "lucide-react";

type Mode = "simple" | "custom" | "upload";

const emptyAddress: Address = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("simple");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [sending, setSending] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    language: "en",
    fontFamily: "Times New Roman",
    fontSize: 12,
  });

  const [letterData, setLetterData] = useState<SimpleLetterData>({
    date: new Date().toISOString().split("T")[0],
    greeting: "",
    subject: "",
    body: "",
    closing: "",
    senderName: "",
    reference: "",
    cc: "",
    enclosures: "",
    ps: "",
  });

  const [htmlContent, setHtmlContent] = useState("");
  const [fileName, setFileName] = useState("");

  const [from, setFrom] = useState<Address>(emptyAddress);
  const [to, setTo] = useState<Address>(emptyAddress);

  const isAddressValid = (a: Address) =>
    !!(a.name && a.line1 && a.city && a.province && a.postalCode);

  const hasContent =
    mode === "simple" ? !!letterData.body.trim() : !!htmlContent;

  const canSend = isAddressValid(from) && isAddressValid(to) && hasContent;

  const isFr = settings.language === "fr";

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
        alert(
          data.error ||
            "Could not create checkout. Are Stripe keys configured?"
        );
        setSending(false);
      }
    } catch {
      alert("Failed to connect. Please try again.");
      setSending(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setHtmlContent("");
    setFileName("");
  };

  const tabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
    {
      id: "simple",
      label: isFr ? "Lettre" : "Letter",
      icon: <PenLine className="w-3.5 h-3.5" />,
    },
    {
      id: "custom",
      label: isFr ? "Personnalisé" : "Custom",
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      id: "upload",
      label: isFr ? "Télécharger" : "Upload",
      icon: <Upload className="w-3.5 h-3.5" />,
    },
  ];

  const previewContent = (
    <div className="space-y-6">
      {/* Letter */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {isFr ? "Lettre" : "Letter"}
        </p>
        <div className="rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-gray-200/60 overflow-hidden bg-white">
          <LetterPreviewScaled
            mode={mode}
            letterData={letterData}
            htmlContent={htmlContent}
            settings={settings}
          />
        </div>
      </div>
      {/* Envelope */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {isFr ? "Enveloppe" : "Envelope"}
        </p>
        <div className="rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-gray-200/60 overflow-hidden bg-white">
          <EnvelopePreviewScaled from={from} to={to} settings={settings} />
        </div>
      </div>
    </div>
  );

  const mailButton = (opts?: { className?: string }) => (
    <button
      onClick={handleCheckout}
      disabled={!canSend || sending}
      className={`flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100 transition-all ${opts?.className || "w-full"}`}
    >
      {sending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Mail className="w-4 h-4" />
          {isFr ? "Poster pour 4,99 $" : "Mail for $4.99"}
          <ArrowRight className="w-3.5 h-3.5" />
        </>
      )}
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200/80 px-5 h-[52px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
              <Mail className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              sendletter
            </span>
          </div>

          {/* Tabs in header */}
          <nav className="hidden sm:flex items-center gap-0.5 p-0.5 bg-gray-100/80 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchMode(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  mode === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobilePreview(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <div className="hidden sm:block h-4 w-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium hidden sm:block">
            {isFr ? "Tarif fixe 4,99 $" : "$4.99 flat rate"}
          </span>
        </div>
      </header>

      {/* Settings bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-2 shrink-0">
        <LetterSettingsBar settings={settings} onChange={setSettings} />
      </div>

      {/* Mobile tabs */}
      <div className="sm:hidden bg-white border-b border-gray-100 px-4 py-2 shrink-0">
        <nav className="flex items-center gap-0.5 p-0.5 bg-gray-100/80 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchMode(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 sm:px-8 py-6 space-y-5">
            {/* Content area */}
            {mode === "simple" && (
              <SimpleLetterForm
                data={letterData}
                onChange={setLetterData}
                language={settings.language}
              />
            )}

            {mode === "custom" && (
              <LetterEditor
                content={htmlContent}
                onChange={setHtmlContent}
                settings={settings}
              />
            )}

            {mode === "upload" && (
              <FileUpload
                onContent={(html, name) => {
                  setHtmlContent(html);
                  setFileName(name);
                }}
                fileName={fileName}
              />
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/80" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#fafafa] px-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {isFr ? "Adresses postales" : "Mailing addresses"}
                </span>
              </div>
            </div>

            {/* Addresses */}
            <AddressSection
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />

            {/* Bottom spacer */}
            <div className="h-4 lg:hidden" />
          </div>
        </div>

        {/* Right: Preview (desktop) */}
        <div className="hidden lg:flex w-[480px] xl:w-[520px] 2xl:w-[560px] border-l border-gray-200/80 bg-[#f5f5f4] flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {previewContent}
          </div>

          {/* Checkout */}
          <div className="border-t border-gray-200/80 px-5 py-4 bg-white">
            {mailButton()}
            {!canSend && (
              <p className="text-[11px] text-gray-400 text-center mt-2">
                {isFr
                  ? "Remplissez la lettre et les deux adresses pour poster"
                  : "Fill in your letter and both addresses to mail"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: sticky bar */}
      <div className="lg:hidden border-t border-gray-200/80 bg-white px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => setMobilePreview(true)}
          className="h-11 px-4 rounded-xl border border-gray-200 flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors shrink-0 text-sm font-medium"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        {mailButton({ className: "flex-1" })}
      </div>

      {/* Mobile: preview overlay */}
      {mobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#f5f5f4] flex flex-col">
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-gray-200/80 bg-white shrink-0">
            <span className="text-sm font-semibold">
              {isFr ? "Aperçu de votre courrier" : "Mail preview"}
            </span>
            <button
              onClick={() => setMobilePreview(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-md mx-auto">{previewContent}</div>
          </div>
          <div className="border-t border-gray-200/80 bg-white px-4 py-3 shrink-0">
            {mailButton()}
          </div>
        </div>
      )}
    </div>
  );
}
