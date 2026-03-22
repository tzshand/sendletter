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
import { LetterSettingsBar, type Settings } from "@/components/LetterSettings";
import {
  LetterSizeSelector,
  type LetterSize,
  formatPrice,
} from "@/components/LetterSizeSelector";
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

type Mode = "upload" | "custom" | "simple";

const MODE_COLORS: Record<Mode, { bg: string; text: string; ring: string; bgSoft: string; hover: string }> = {
  upload: {
    bg: "bg-teal",
    text: "text-teal",
    ring: "ring-teal/20",
    bgSoft: "bg-teal/10",
    hover: "hover:bg-teal-dark",
  },
  custom: {
    bg: "bg-violet",
    text: "text-violet",
    ring: "ring-violet/20",
    bgSoft: "bg-violet/10",
    hover: "hover:bg-violet-dark",
  },
  simple: {
    bg: "bg-amber",
    text: "text-amber",
    ring: "ring-amber/20",
    bgSoft: "bg-amber/10",
    hover: "hover:bg-amber-dark",
  },
};

const emptyAddress: Address = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("upload");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [letterSize, setLetterSize] = useState<LetterSize>("standard");

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
  const colors = MODE_COLORS[mode];
  const price = formatPrice(letterSize);

  const handleCheckout = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent,
          from,
          to,
          mode,
          letterData,
          letterSize,
        }),
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

  const tabs: { id: Mode; label: string; labelFr: string; icon: React.ReactNode; color: string }[] = [
    { id: "upload", label: "Upload", labelFr: "Télécharger", icon: <Upload className="w-4 h-4" />, color: "teal" },
    { id: "custom", label: "Custom", labelFr: "Personnalisé", icon: <FileText className="w-4 h-4" />, color: "violet" },
    { id: "simple", label: "Letter", labelFr: "Lettre", icon: <PenLine className="w-4 h-4" />, color: "amber" },
  ];

  const tabColorClasses: Record<string, { active: string; inactive: string }> = {
    teal: { active: "bg-teal text-white shadow-md", inactive: "text-gray-500 hover:text-teal hover:bg-teal/5" },
    violet: { active: "bg-violet text-white shadow-md", inactive: "text-gray-500 hover:text-violet hover:bg-violet/5" },
    amber: { active: "bg-amber text-white shadow-md", inactive: "text-gray-500 hover:text-amber hover:bg-amber/5" },
  };

  const previewContent = (
    <div className="space-y-5">
      {/* Envelope first */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {isFr ? "Enveloppe" : "Envelope"}
        </p>
        <div className="rounded-lg shadow-sm ring-1 ring-gray-200/60 overflow-hidden">
          <EnvelopePreviewScaled
            from={from}
            to={to}
            settings={settings}
            letterSize={letterSize}
          />
        </div>
      </div>
      {/* Letter pages */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {isFr ? "Page 1" : "Page 1"}
        </p>
        <div className="rounded-lg shadow-sm ring-1 ring-gray-200/60 overflow-hidden">
          <LetterPreviewScaled
            mode={mode}
            letterData={letterData}
            htmlContent={htmlContent}
            settings={settings}
          />
        </div>
      </div>
    </div>
  );

  const mailButton = (opts?: { className?: string }) => (
    <button
      onClick={handleCheckout}
      disabled={!canSend || sending}
      className={`flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100 ${colors.bg} text-white ${colors.hover} ${opts?.className || "w-full"}`}
    >
      {sending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Mail className="w-4 h-4" />
          {isFr ? `Poster pour ${price}` : `Mail for ${price}`}
          <ArrowRight className="w-3.5 h-3.5" />
        </>
      )}
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-[#fafafa]">
      {/* Header */}
      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center transition-colors`}>
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-[16px] font-bold tracking-tight">
              sendletter
            </span>
          </div>

          {/* Tabs */}
          <nav className="hidden sm:flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive = mode === tab.id;
              const cls = tabColorClasses[tab.color];
              return (
                <button
                  key={tab.id}
                  onClick={() => switchMode(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    isActive ? cls.active : cls.inactive
                  }`}
                >
                  {tab.icon}
                  {isFr ? tab.labelFr : tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobilePreview(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <span className="text-xs text-white/50 font-medium hidden sm:block">
            {isFr ? `À partir de $4.20` : `From $4.20`}
          </span>
        </div>
      </header>

      {/* Settings bar */}
      <div className="bg-white border-b border-gray-200/80 px-5 py-2.5 shrink-0">
        <LetterSettingsBar settings={settings} onChange={setSettings} />
      </div>

      {/* Mobile tabs */}
      <div className="sm:hidden bg-zinc-950 px-4 py-2 shrink-0">
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = mode === tab.id;
            const cls = tabColorClasses[tab.color];
            return (
              <button
                key={tab.id}
                onClick={() => switchMode(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  isActive ? cls.active : cls.inactive
                }`}
              >
                {tab.icon}
                {isFr ? tab.labelFr : tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 sm:px-8 py-6 space-y-5">
            {/* Content area */}
            {mode === "upload" && (
              <FileUpload
                onContent={(html, name) => {
                  setHtmlContent(html);
                  setFileName(name);
                }}
                fileName={fileName}
              />
            )}

            {mode === "custom" && (
              <LetterEditor
                content={htmlContent}
                onChange={setHtmlContent}
                settings={settings}
              />
            )}

            {mode === "simple" && (
              <SimpleLetterForm
                data={letterData}
                onChange={setLetterData}
                language={settings.language}
              />
            )}

            {/* Letter size */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/80" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#fafafa] px-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {isFr ? "Format" : "Letter size"}
                </span>
              </div>
            </div>

            <LetterSizeSelector
              value={letterSize}
              onChange={setLetterSize}
              language={settings.language}
            />

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

            <AddressSection
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />

            <div className="h-4 lg:hidden" />
          </div>
        </div>

        {/* Right: Preview (desktop) */}
        <div className="hidden lg:flex w-[480px] xl:w-[520px] 2xl:w-[560px] border-l border-gray-200/80 bg-[#f0f0ee] flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {previewContent}
          </div>

          <div className="border-t border-gray-200/80 px-5 py-4 bg-white">
            {mailButton()}
            {!canSend && (
              <p className="text-[11px] text-gray-400 text-center mt-2">
                {isFr
                  ? "Remplissez le contenu et les adresses pour poster"
                  : "Add your content and both addresses to mail"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: sticky bar */}
      <div className="lg:hidden border-t border-gray-200/80 bg-white px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => setMobilePreview(true)}
          className="h-12 px-4 rounded-xl border-2 border-gray-200 flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors shrink-0 text-sm font-semibold"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        {mailButton({ className: "flex-1" })}
      </div>

      {/* Mobile: preview overlay */}
      {mobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#f0f0ee] flex flex-col">
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-gray-200/80 bg-zinc-950 text-white shrink-0">
            <span className="text-sm font-bold">
              {isFr ? "Aperçu du courrier" : "Mail preview"}
            </span>
            <button
              onClick={() => setMobilePreview(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 transition-colors"
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
