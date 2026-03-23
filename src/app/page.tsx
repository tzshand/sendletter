"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  LETTER_SIZE_CONFIG,
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

const TAB_COLORS: Record<Mode, { border: string; text: string; bg: string }> = {
  upload: { border: "border-teal", text: "text-teal", bg: "bg-teal" },
  simple: { border: "border-amber", text: "text-amber", bg: "bg-amber" },
  custom: { border: "border-violet", text: "text-violet", bg: "bg-violet" },
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

  const [pageCount, setPageCount] = useState(1);

  const [settings, setSettings] = useState<Settings>({
    language: "en",
    fontFamily: "Times New Roman",
    fontSize: 12,
    verticalCenter: true,
  });

  const [letterData, setLetterData] = useState<SimpleLetterData>({
    date: new Date().toISOString().split("T")[0],
    greeting: "Dear",
    subject: "",
    body: "",
    closing: "Sincerely,",
    senderName: "",
    reference: "",
    cc: "",
    enclosures: "",
    ps: "",
  });

  const [htmlContent, setHtmlContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [originalFile, setOriginalFile] = useState<{ base64: string; name: string; type: string } | null>(null);

  const [from, setFrom] = useState<Address>(emptyAddress);
  const [to, setTo] = useState<Address>(emptyAddress);

  const [validationErrors, setValidationErrors] = useState<{
    content?: boolean;
    from?: boolean;
    to?: boolean;
  }>({});

  const contentRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);

  // ── Persist form state via IndexedDB (handles large PDFs) ──
  const DB_NAME = "sendletter";
  const STORE = "draft";
  const DB_KEY = "current";

  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }, []);

  const saveDraft = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(
        { mode, letterSize, settings, letterData, htmlContent, fileName, from, to, originalFile },
        DB_KEY
      );
      db.close();
    } catch { /* storage error — ignore */ }
  }, [mode, letterSize, settings, letterData, htmlContent, fileName, from, to, originalFile, openDB]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  // Restore on mount (back from Stripe, refresh, etc.)
  useEffect(() => {
    (async () => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(DB_KEY);
        req.onsuccess = () => {
          const d = req.result;
          if (!d) return;
          if (d.mode) setMode(d.mode);
          if (d.letterSize) setLetterSize(d.letterSize);
          if (d.settings) setSettings(d.settings);
          if (d.letterData) setLetterData(d.letterData);
          if (d.htmlContent != null) setHtmlContent(d.htmlContent);
          if (d.fileName != null) setFileName(d.fileName);
          if (d.from) setFrom(d.from);
          if (d.to) setTo(d.to);
          if (d.originalFile) setOriginalFile(d.originalFile);
        };
        db.close();
      } catch { /* no data — ignore */ }
      setSending(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview overlay: history-managed so back closes it ──
  const previewOpenRef = useRef(false);

  const openPreview = useCallback(() => {
    if (!previewOpenRef.current) {
      history.pushState({ preview: true }, "");
      previewOpenRef.current = true;
    }
    setMobilePreview(true);
  }, []);

  const closePreview = useCallback(() => {
    if (previewOpenRef.current) {
      previewOpenRef.current = false;
      history.back(); // pops the entry we pushed — popstate will set state
    } else {
      setMobilePreview(false);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (previewOpenRef.current) {
        previewOpenRef.current = false;
        setMobilePreview(false);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const isAddressValid = (a: Address) =>
    !!(a.name && a.line1 && a.city && a.province && a.postalCode);

  const hasContent =
    mode === "simple" ? !!letterData.body.trim() : !!htmlContent;

  const canSend = isAddressValid(from) && isAddressValid(to) && hasContent;

  // Clear validation errors reactively as fields are corrected
  useEffect(() => {
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (prev.content && hasContent) next.content = false;
      if (prev.from && isAddressValid(from)) next.from = false;
      if (prev.to && isAddressValid(to)) next.to = false;
      if (next.content === prev.content && next.from === prev.from && next.to === prev.to) return prev;
      return next;
    });
  }, [hasContent, from, to]);

  const isFr = settings.language === "fr";
  const price = formatPrice(letterSize);

  const handleCheckout = async () => {
    // Validate and highlight errors
    if (!canSend) {
      const errors: typeof validationErrors = {};
      if (!hasContent) errors.content = true;
      if (!isAddressValid(from)) errors.from = true;
      if (!isAddressValid(to)) errors.to = true;
      setValidationErrors(errors);

      // Scroll to first error
      if (errors.content && contentRef.current) {
        contentRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if ((errors.from || errors.to) && addressRef.current) {
        addressRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setSending(true);
    try {
      // Generate print-quality PDF for all modes
      let generatedPdf: string | null = null;
      try {
        const { generateLetterPdf } = await import("@/lib/generatePdf");
        generatedPdf = await generateLetterPdf({
          mode,
          letterData,
          htmlContent,
          settings,
          letterSize,
        });
        if (generatedPdf) {
          try {
            const db = await openDB();
            const tx = db.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            const req = store.get(DB_KEY);
            req.onsuccess = () => {
              const draft = req.result || {};
              draft.generatedPdf = generatedPdf;
              store.put(draft, DB_KEY);
            };
            db.close();
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.error("PDF generation failed (continuing):", e);
      }

      // Only send content relevant to the active mode
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent: mode !== "simple" ? htmlContent : undefined,
          from,
          to,
          mode,
          letterData: mode === "simple" ? letterData : undefined,
          letterSize,
          pageCount,
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
  };

  const tabs: { id: Mode; label: string; labelFr: string; icon: React.ReactNode }[] = [
    { id: "upload", label: "Upload", labelFr: "Télécharger", icon: <Upload className="w-4 h-4" /> },
    { id: "simple", label: "Classic Letter", labelFr: "Lettre classique", icon: <PenLine className="w-4 h-4" /> },
    { id: "custom", label: "Custom", labelFr: "Personnalisé", icon: <FileText className="w-4 h-4" /> },
  ];

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
            letterSize={letterSize}
          />
        </div>
      </div>
    </div>
  );

  const mailButton = (opts?: { className?: string }) => (
    <button
      onClick={handleCheckout}
      disabled={sending}
      className={`flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 bg-brand text-white hover:bg-brand-dark ${opts?.className || "w-full"}`}
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
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
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
              const tc = TAB_COLORS[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => switchMode(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                    isActive
                      ? `${tc.border} ${tc.text} bg-white/10`
                      : `border-transparent ${tc.text} opacity-60 hover:opacity-100`
                  }`}
                >
                  {tab.icon}
                  {isFr ? tab.labelFr : tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <span className="text-xs text-white/50 font-medium">
          {isFr ? "Basé à Montréal" : "Based in Montreal"}
        </span>
      </header>

      {/* Settings bar */}
      <div className="bg-white border-b border-gray-200/80 px-5 py-2.5 shrink-0 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-700">
          {isFr ? "Poster une lettre au Canada" : "Mail a Letter in Canada"}
        </h1>
        <LetterSettingsBar settings={settings} onChange={setSettings} />
      </div>

      {/* Mobile tabs */}
      <div className="sm:hidden bg-zinc-950 px-4 py-2 shrink-0">
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = mode === tab.id;
            const tc = TAB_COLORS[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => switchMode(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                  isActive
                    ? `${tc.border} ${tc.text} bg-white/10`
                    : `border-transparent ${tc.text} opacity-60 hover:opacity-100`
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
            <div ref={contentRef} className={`rounded-xl transition-all ${validationErrors.content ? "ring-2 ring-red-400 bg-red-50/40 p-3 -mx-3" : ""}`}>
              {mode === "upload" && (
                <FileUpload
                  onContent={(html, name) => {
                    setHtmlContent(html);
                    setFileName(name);
                    if (!html) {
                      setPageCount(1);
                      setOriginalFile(null);
                    }
                  }}
                  fileName={fileName}
                  onPageCount={(count) => {
                    setPageCount(count);
                    if (count > LETTER_SIZE_CONFIG.standard.maxPages && letterSize === "standard") {
                      setLetterSize("large");
                    }
                  }}
                  onOriginalFile={setOriginalFile}
                  language={settings.language}
                />
              )}

              {mode === "custom" && (
                <LetterEditor
                  content={htmlContent}
                  onChange={setHtmlContent}
                  settings={settings}
                  onSettingsChange={setSettings}
                />
              )}

              {mode === "simple" && (
                <SimpleLetterForm
                  data={letterData}
                  onChange={setLetterData}
                  language={settings.language}
                  settings={settings}
                  onSettingsChange={setSettings}
                />
              )}
            </div>

            {/* Inline preview button */}
            <button
              onClick={openPreview}
              className={`lg:hidden w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors text-sm font-semibold`}
            >
              <Eye className="w-4 h-4" />
              {isFr ? "Aperçu" : "Preview letter"}
            </button>

            {/* Letter size */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/80" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#fafafa] px-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {isFr ? "Format d'enveloppe" : "Envelope size"}
                </span>
              </div>
            </div>

            <LetterSizeSelector
              value={letterSize}
              onChange={setLetterSize}
              language={settings.language}
              pageCount={mode === "upload" ? pageCount : undefined}
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

            <div ref={addressRef}>
              <AddressSection
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
                language={settings.language}
                errors={validationErrors.from || validationErrors.to ? { from: validationErrors.from, to: validationErrors.to } : undefined}
              />
            </div>

            {/* Service level */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/80" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#fafafa] px-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {isFr ? "Service postal" : "Delivery"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    {isFr ? "Poste-lettres" : "Lettermail"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isFr
                    ? "Courrier standard sans suivi. 2–5 jours ouvrables pour la plupart des adresses."
                    : "Standard mail, no tracking. 2–5 business days to most addresses."}
                </p>
              </div>
            </div>


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
          </div>
        </div>
      </div>

      {/* Mobile: sticky bar */}
      <div className="lg:hidden border-t border-gray-200/80 bg-white px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button
          onClick={openPreview}
          className="h-12 px-4 rounded-xl border-2 border-gray-200 flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors shrink-0 text-sm font-semibold"
        >
          <Eye className="w-4 h-4" />
          {isFr ? "Aperçu" : "Preview"}
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
              onClick={closePreview}
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
