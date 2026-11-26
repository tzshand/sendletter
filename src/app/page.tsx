"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  SimpleLetterForm,
  type SimpleLetterData,
} from "@/components/SimpleLetterForm";
import { LetterEditor } from "@/components/LetterEditor";
import { FileUpload } from "@/components/FileUpload";
import { AddressSection, freeformLines, type Address } from "@/components/AddressForm";
import {
  LetterPreviewScaled,
  EnvelopePreviewScaled,
  AddressPagePreviewScaled,
} from "@/components/LivePreview";
import { LetterSettingsBar, type Settings } from "@/components/LetterSettings";
import { LetterSizeSelector, type LetterSize } from "@/components/LetterSizeSelector";
import { PrintOptions } from "@/components/PrintOptions";
import {
  quote,
  formatCents,
  MAX_PAGES,
  RASTER_MAX_PAGES,
  RATES,
  FROM_ALL_IN_CENTS,
  COLOUR_SINGLE_CENTS,
} from "@/lib/pricing";
import { SnowGoose } from "@/components/SnowGoose";
import {
  Mail,
  Eye,
  Loader2,
  ArrowRight,
  X,
  FileText,
  PenLine,
  Upload,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { API_FROM_ALL_IN_CENTS } from "@/lib/volume";

type Mode = "upload" | "custom" | "simple";

const TAB_COLORS: Record<Mode, { border: string; text: string; bg: string; bgLight: string }> = {
  upload: { border: "border-teal", text: "text-teal", bg: "bg-teal", bgLight: "bg-teal/5" },
  simple: { border: "border-amber", text: "text-amber", bg: "bg-amber", bgLight: "bg-amber/5" },
  custom: { border: "border-violet", text: "text-violet", bg: "bg-violet", bgLight: "bg-violet/5" },
};

const emptyAddress: Address = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "CA",
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("upload");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [letterSize, setLetterSize] = useState<LetterSize>("standard");
  const [sessionUser, setSessionUser] = useState<{ firstName: string } | null>(null);

  // Live size of the letter. The price depends on it, so it is measured as you
  // type with the same layout engine that makes the PDF.
  const [pdfPages, setPdfPages] = useState(1); // pages of an uploaded PDF
  const [pages, setPages] = useState(1);
  const [previewPdf, setPreviewPdf] = useState<string | null>(null); // classic letters: the real PDF
  const [colour, setColour] = useState(false);
  const [duplex, setDuplex] = useState(true);
  const [flatNote, setFlatNote] = useState(false);

  const [settings, setSettings] = useState<Settings>(() => {
    const defaults: Settings = { language: "en", fontFamily: "Times New Roman", fontSize: 12, verticalCenter: true };
    if (typeof window === "undefined") return defaults;
    try {
      const saved = localStorage.getItem("sl-settings");
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return defaults;
  });

  // Persist settings changes
  useEffect(() => {
    try { localStorage.setItem("sl-settings", JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  // Check if user is logged in (for header link)
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.loggedIn) setSessionUser({ firstName: d.firstName });
    }).catch(() => {});
  }, []);

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

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const isPdfUpload = mode === "upload" && /data-pdf="/.test(htmlContent);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        if (mode === "upload") {
          if (!htmlContent) return setPages(1);
          if (isPdfUpload) return setPages(pdfPages);
          const { measureHtmlPages } = await import("@/lib/generatePdf");
          if (!cancelled) setPages(measureHtmlPages(htmlContent, { ...settings, verticalCenter: false }, letterSize, "docx"));
        } else if (mode === "custom") {
          if (!htmlContent) return setPages(1);
          const { measureHtmlPages } = await import("@/lib/generatePdf");
          if (!cancelled) setPages(measureHtmlPages(htmlContent, settings, letterSize, "custom"));
        } else {
          // Classic letter: build the real (vector) PDF; it is both the preview and the count.
          const { generateLetterPdf } = await import("@/lib/generatePdf");
          const r = await generateLetterPdf({ mode: "simple", letterData, htmlContent: "", settings, letterSize });
          if (!cancelled && r) {
            setPreviewPdf(r.base64);
            setPages(r.pageCount ?? 1);
          }
        }
      } catch {
        /* keep the last good count */
      }
    }, mode === "simple" ? 350 : 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mode, htmlContent, letterData, settings, letterSize, pdfPages, isPdfUpload]);

  const pageLimit = mode === "simple" || isPdfUpload ? MAX_PAGES : RASTER_MAX_PAGES;
  const overLimit = pages > pageLimit;

  const q = useMemo(() => {
    try {
      return quote({ pages, size: letterSize, colour, duplex, channel: "web" });
    } catch {
      return null;
    }
  }, [pages, letterSize, colour, duplex]);

  // A #10 only holds so many sheets. When a letter outgrows it, move to a flat
  // envelope (cheaper than splitting across several #10s) and say so. The
  // customer can still pick the #10 again and get a split.
  const prevOverflow = useRef(false);
  useEffect(() => {
    let overflow = false;
    try {
      overflow = quote({ pages, size: "standard", colour, duplex, channel: "web" }).mailings.length > 1;
    } catch {
      /* out of range: the page-limit message covers it */
    }
    const was = prevOverflow.current;
    prevOverflow.current = overflow;
    // Switch when the #10 BECOMES too small (more pages, or single-sided), not
    // on every render, so a customer who picks the #10 again keeps it.
    if (letterSize === "standard" && overflow && !was) {
      setLetterSize("large");
      setFlatNote(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, duplex, colour]);

  const isAddressValid = (a: Address) => {
    // Free-form return address: at least two lines (a name and somewhere to find them).
    if (a.freeform) return freeformLines(a).filter((l) => l.trim()).length >= 2;
    const base = !!(a.name && a.line1 && a.city);
    if (a.country === "CA" || a.country === "US") {
      return base && !!a.province && !!a.postalCode;
    }
    return base;
  };

  const hasContent =
    mode === "simple" ? !!letterData.body.trim() : !!htmlContent;

  const canSend = isAddressValid(from) && isAddressValid(to) && hasContent;

  // A highlight set by a failed submit clears itself as the field is corrected.
  const shownErrors = {
    content: !!validationErrors.content && !hasContent,
    from: !!validationErrors.from && !isAddressValid(from),
    to: !!validationErrors.to && !isAddressValid(to),
  };

  const isFr = settings.language === "fr";
  const price = q ? formatCents(q.totalCents, settings.language) : "—";

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
      // Generate the print-quality PDF. Its page count must match what the
      // price was built on; if the letter changed length, show the new price.
      const { generateLetterPdf } = await import("@/lib/generatePdf");
      let generated: Awaited<ReturnType<typeof generateLetterPdf>> = null;
      try {
        generated = await generateLetterPdf({ mode, letterData, htmlContent, settings, letterSize });
      } catch (e) {
        console.error("PDF generation failed:", e);
      }
      if (!generated?.base64) {
        setErrorMsg(
          isFr ? "Nous n'avons pas pu préparer votre lettre. Veuillez réessayer. Vous n'avez pas été facturé."
                : "We couldn't prepare your letter. Please try again. You have not been charged."
        );
        setSending(false);
        return;
      }
      if (generated.pageCount && generated.pageCount !== pages) {
        setPages(generated.pageCount);
        setErrorMsg(
          isFr ? `Votre lettre fait ${generated.pageCount} pages; le prix a été mis à jour. Vérifiez-le puis cliquez à nouveau.`
                : `Your letter is ${generated.pageCount} pages, so the price has been updated. Check it, then click again.`
        );
        setSending(false);
        return;
      }
      const generatedPdf = generated.base64;

      // Put the document on the server BEFORE payment. The browser draft can't
      // be trusted to survive the Stripe redirect, and an order must never be
      // paid for with nothing to print: checkout is refused without this.
      const toBlob = (b64: string, type: string) => new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type });
      const pdfBlob = toBlob(generatedPdf, "application/pdf");
      const originalBlob = mode === "upload" && originalFile ? toBlob(originalFile.base64, originalFile.type || "application/octet-stream") : null;
      const stageForm = new FormData();
      stageForm.append("meta", JSON.stringify({
        mode,
        letterSize,
        letterData: mode === "simple" ? letterData : undefined,
        htmlContent: mode === "custom" ? htmlContent : undefined,
        pdfSize: pdfBlob.size,
        originalSize: originalBlob?.size,
      }));
      stageForm.append("pdf", pdfBlob, "letter.pdf");
      if (originalBlob && originalFile) {
        stageForm.append("original", originalBlob, originalFile.name);
        stageForm.append("originalName", originalFile.name);
      }
      const stageRes = await fetch("/api/upload-draft", { method: "POST", body: stageForm });
      const staged = await stageRes.json().catch(() => ({}));
      if (!stageRes.ok || !staged.draftId) {
        setErrorMsg(
          isFr ? "Nous n'avons pas pu enregistrer votre document. Veuillez réessayer. Vous n'avez pas été facturé."
                : (staged.error ? `${staged.error} You have not been charged.` : "We couldn't save your document. Please try again. You have not been charged.")
        );
        setSending(false);
        return;
      }

      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          letterSize,
          colour,
          duplex,
          language: settings.language,
          draftId: staged.draftId,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(
          isFr ? "Impossible de créer la commande. Veuillez réessayer."
                : (data.error ?? "Could not create checkout. Please try again.")
        );
        setSending(false);
      }
    } catch {
      setErrorMsg(
        isFr ? "Erreur de connexion. Veuillez réessayer."
              : "Connection failed. Please try again."
      );
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

  const bwStyle = colour ? undefined : { filter: "grayscale(1)" };
  const sheetsTotal = q ? q.mailings.reduce((n, m) => n + m.sheets, 0) : 1;
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
            stamps={q?.mailings[0]?.stamps ?? 1}
          />
        </div>
      </div>
      {q && q.mailings.length > 1 && (
        <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-xs text-amber-800">
          {isFr
            ? `Votre lettre sera postée dans ${q.mailings.length} enveloppes : ${q.mailings.map((m) => `pages ${m.pageStart}–${m.pageEnd}`).join(", ")}.`
            : `Your letter will go in ${q.mailings.length} envelopes: ${q.mailings.map((m) => `pages ${m.pageStart}–${m.pageEnd}`).join(", ")}.`}
        </div>
      )}
      {/* Sheet 1 of a #10 window mailing */}
      {letterSize === "standard" && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {isFr ? "Feuille d'adresse" : "Address page"}
            {duplex && (
              <span className="normal-case tracking-normal font-normal">
                {isFr ? " (la page 1 est imprimée au verso)" : " (page 1 is printed on its back)"}
              </span>
            )}
          </p>
          <div className="rounded-lg shadow-sm ring-1 ring-gray-200/60 overflow-hidden" style={bwStyle}>
            <AddressPagePreviewScaled from={from} to={to} settings={settings} />
          </div>
        </div>
      )}
      {/* Letter pages */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {isFr ? "Page 1" : "Page 1"}
        </p>
        <div className="rounded-lg shadow-sm ring-1 ring-gray-200/60 overflow-hidden" style={bwStyle}>
          <LetterPreviewScaled
            mode={mode}
            letterData={letterData}
            htmlContent={htmlContent}
            settings={settings}
            letterSize={letterSize}
            previewPdf={previewPdf}
          />
        </div>
      </div>
    </div>
  );

  // What you're paying for, line by line. Postage is at cost: one stamp is $1.24.
  const priceSummary = q && (
    <div className="mb-3 text-xs">
      <div className="space-y-1 text-gray-500">
        {q.lines.map((l) => (
          <div key={l.key} className="flex justify-between gap-3">
            <span>
              {l.key === "base" && (isFr ? "Frais d'envoi" : "Mailing fee")}
              {l.key === "envelope" && (isFr ? "Enveloppe" : "Envelope")}
              {l.key === "pages" &&
                (isFr
                  ? `${l.qty} page${l.qty > 1 ? "s" : ""} (${colour ? "couleur" : "noir et blanc"})`
                  : `${l.qty} page${l.qty > 1 ? "s" : ""} (${colour ? "colour" : "black & white"})`)}
              {l.key === "postage" &&
                (isFr ? `Affranchissement, ${l.qty} timbre${l.qty > 1 ? "s" : ""}` : `Postage, ${l.qty} stamp${l.qty > 1 ? "s" : ""}`)}
              {l.qty > 1 && (l.key === "base" || l.key === "envelope") ? ` × ${l.qty}` : ""}
            </span>
            <span>{formatCents(l.totalCents, settings.language)}</span>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400">
        {isFr
          ? `${q.pages} page${q.pages > 1 ? "s" : ""} · ${sheetsTotal} feuille${sheetsTotal > 1 ? "s" : ""}. Taxes incluses. Affranchissement au prix coûtant.`
          : `${q.pages} page${q.pages > 1 ? "s" : ""} · ${sheetsTotal} sheet${sheetsTotal > 1 ? "s" : ""}. Tax included. Postage at cost.`}
      </p>
    </div>
  );

  const mailButton = (opts?: { className?: string }) => (
    <button
      onClick={handleCheckout}
      disabled={sending || !q || overLimit}
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

  const faqItems = isFr ? [
    { q: "Peut-on vraiment envoyer une lettre en ligne?", a: "Oui. Vous écrivez ou téléchargez votre lettre, ajoutez les adresses, payez, et nous l'imprimons et la postons via Postes Canada dans un délai de 1 jour ouvrable." },
    { q: "Combien ça coûte?", a: `À partir de ${formatCents(FROM_ALL_IN_CENTS, "fr")} pour une lettre d'une page en noir et blanc (${formatCents(COLOUR_SINGLE_CENTS, "fr")} en couleur), impression, affranchissement et taxes compris. Les lettres plus longues coûtent plus cher : vous payez des frais d'envoi, l'impression (${formatCents(RATES.pageCents.bw, "fr")} la page en noir et blanc, ${formatCents(RATES.pageCents.colour, "fr")} en couleur), l'enveloppe, et l'affranchissement Postes Canada au prix coûtant : un timbre (${formatCents(RATES.stampCents, "fr")}) suffit pour la plupart des lettres jusqu'à 5 pages. Taxes incluses. Envoi en volume par API : dès ${formatCents(API_FROM_ALL_IN_CENTS, "fr")} la lettre, tout compris, avec prix dégressifs automatiques et sans frais mensuels.` },
    { q: "Quel est le délai de livraison?", a: "Les lettres sont imprimées et postées dans un délai de 1 jour ouvrable. La norme de livraison de Postes Canada est de 2 à 4 jours ouvrables après la mise à la poste (une estimation, non une garantie)." },
    { q: "Ai-je besoin d'un compte?", a: "Non. Aucun compte, aucun abonnement, aucune commande minimale. Écrivez votre lettre, payez et c'est posté." },
    { q: "Quels formats de fichier puis-je télécharger?", a: `PDF jusqu'à ${MAX_PAGES} pages et 40 Mo, ou documents Word (.docx) jusqu'à ${RASTER_MAX_PAGES} pages.` },
    { q: "Où livrez-vous?", a: "À toute adresse postale au Canada via Postes Canada." },
    { q: "Est-ce que j'envoie une seule lettre?", a: "Absolument. sendletter est conçu pour envoyer une lettre à la fois — pas de minimum, pas d'envoi en vrac." },
    { q: "Mes données sont-elles en sécurité?", a: "Nous conservons votre document 30 jours afin de régler tout problème d'envoi, puis nous le supprimons. Votre courriel sert uniquement pour la confirmation de commande." },
    { q: "Avez-vous une API?", a: "Oui. sendletter offre un accès API pour envoyer des lettres par programmation, automatiser les flux de courrier et intégrer les services postaux dans vos applications." },
  ] : [
    { q: "Can you actually send a letter online?", a: "Yes. Write or upload your letter, add addresses, pay, and we print and mail it via Canada Post within 1 business day." },
    { q: "How much does it cost?", a: `From ${formatCents(FROM_ALL_IN_CENTS)} for a one-page black-and-white letter (${formatCents(COLOUR_SINGLE_CENTS)} in colour), with printing, postage and tax included. Longer letters cost more: you pay a mailing fee, printing (${formatCents(RATES.pageCents.bw)} a page black & white, ${formatCents(RATES.pageCents.colour)} colour), the envelope, and Canada Post postage at cost: one stamp (${formatCents(RATES.stampCents)}) covers most letters up to 5 pages. Tax included. Sending in volume by API? Letters from as low as ${formatCents(API_FROM_ALL_IN_CENTS)} all in, with automatic volume pricing and no monthly fee.` },
    { q: "How long does delivery take?", a: "Letters are printed and mailed within 1 business day. Canada Post's delivery standard is 2 to 4 business days after posting (an estimate, not a guarantee)." },
    { q: "Do I need an account?", a: "No. No account, no subscription, no minimum order. Write your letter, pay, and it's in the mail." },
    { q: "What file formats can I upload?", a: `PDFs up to ${MAX_PAGES} pages and 40 MB, or Word documents (.docx) up to ${RASTER_MAX_PAGES} pages.` },
    { q: "Where can you deliver?", a: "Any mailing address in Canada via Canada Post." },
    { q: "Can I send just one letter?", a: "Absolutely. sendletter is built for sending one letter at a time — no minimums, no bulk mail." },
    { q: "Is my information safe?", a: "We keep your document for 30 days so we can sort out any mailing problem, then delete it. Your email is only used for order confirmation." },
    { q: "Do you have an API?", a: "Yes. sendletter offers API access for developers and AI agents to programmatically send physical letters, automate mailing workflows, and integrate postal services into applications." },
  ];

  const steps = isFr ? [
    { n: "1", title: "Écrivez ou téléchargez", desc: "Téléchargez un PDF ou Word, utilisez le modèle de lettre classique, ou composez avec l'éditeur de texte." },
    { n: "2", title: "Ajoutez les adresses", desc: "Entrez l'adresse de l'expéditeur et celle du destinataire, n'importe où au Canada." },
    { n: "3", title: "Payez et envoyez", desc: "Choisissez votre format d'enveloppe, payez en toute sécurité, et nous imprimons et postons votre lettre." },
  ] : [
    { n: "1", title: "Write or upload", desc: "Upload a PDF or Word document, use the classic letter template, or compose with the rich text editor." },
    { n: "2", title: "Add addresses", desc: "Enter the sender and recipient mailing addresses — anywhere in Canada." },
    { n: "3", title: "Pay and send", desc: "Choose your envelope size, pay securely, and we print and mail your letter within 1 business day." },
  ];

  return (
    <>
    <div className="h-full flex flex-col bg-[#fafafa]">
      {/* Header */}
      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
            <SnowGoose size={24} />
            <span className="text-[14px] font-bold tracking-tight text-gray-900">
              sendletter
            </span>
          </div>

        </div>

        <div className="flex items-center gap-4">
          <h1 className="text-xs text-white/50 font-semibold tracking-wide hidden md:block">
            {isFr ? "Envoyez une lettre en ligne" : "Send a Letter Online"}
          </h1>
          <a
            href={sessionUser ? "/profile" : "/signup"}
            className="text-xs font-semibold text-white/70 hover:text-white transition-colors whitespace-nowrap"
          >
            {sessionUser ? sessionUser.firstName : (isFr ? "Accès API" : "API Access")}
          </a>
        </div>
      </header>

      {/* Settings bar */}
      <div className="bg-white border-b border-gray-200/80 px-5 py-2.5 shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          {isFr ? "Poster une lettre à une adresse au Canada" : "Mail a Letter to an Address in Canada"}
        </h2>
        <LetterSettingsBar settings={settings} onChange={setSettings} />
      </div>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 sm:px-8 py-6 space-y-5">
            {/* Error banner */}
            {errorMsg && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="shrink-0 text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-2">
              {tabs.map((tab) => {
                const isActive = mode === tab.id;
                const tc = TAB_COLORS[tab.id];
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchMode(tab.id)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-center ${
                      isActive
                        ? `${tc.border} ${tc.bgLight} text-gray-900`
                        : "border-gray-200 hover:border-gray-300 text-gray-500"
                    }`}
                  >
                    <div className={isActive ? tc.text : "text-gray-400"}>
                      {tab.icon}
                    </div>
                    <span className="text-xs font-semibold">
                      {isFr ? tab.labelFr : tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content area */}
            <div ref={contentRef} className={`rounded-xl transition-all ${shownErrors.content ? "ring-2 ring-red-400 bg-red-50/40 p-3 -mx-3" : ""}`}>
              {mode === "upload" && (
                <FileUpload
                  onContent={(html, name) => {
                    setHtmlContent(html);
                    setFileName(name);
                    if (!html) {
                      setPdfPages(1);
                      setOriginalFile(null);
                    }
                  }}
                  fileName={fileName}
                  onPageCount={setPdfPages}
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
                  pageInfo={{ pages, sheets: sheetsTotal }}
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

            {overLimit && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {isFr
                  ? `Cette lettre fait ${pages} pages; le maximum est ${pageLimit}${pageLimit < MAX_PAGES ? ` pour l'éditeur et les documents Word (les PDF vont jusqu'à ${MAX_PAGES})` : ""}.`
                  : `This letter is ${pages} pages; the maximum is ${pageLimit}${pageLimit < MAX_PAGES ? ` in the editor or for Word documents (PDFs go up to ${MAX_PAGES})` : ""}.`}
              </div>
            )}

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
                  {isFr ? "Enveloppe et impression" : "Envelope & printing"}
                </span>
              </div>
            </div>

            <LetterSizeSelector
              value={letterSize}
              onChange={(v) => {
                setFlatNote(false);
                setLetterSize(v);
              }}
              language={settings.language}
              pages={Math.min(Math.max(pages, 1), MAX_PAGES)}
              colour={colour}
              duplex={duplex}
            />
            {flatNote && (
              <p className="text-xs text-amber-700 -mt-2">
                {isFr
                  ? "Votre lettre est trop longue pour une enveloppe #10. Nous sommes passés à une enveloppe à plat, moins chère que plusieurs #10."
                  : "Your letter is too long for a #10 envelope, so we've moved you to a flat envelope. It costs less than several #10s."}
              </p>
            )}
            <PrintOptions
              colour={colour}
              duplex={duplex}
              onColour={setColour}
              onDuplex={setDuplex}
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

            <div ref={addressRef}>
              <AddressSection
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
                language={settings.language}
                errors={shownErrors.from || shownErrors.to ? { from: shownErrors.from, to: shownErrors.to } : undefined}
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
                    ? "Courrier standard sans suivi. Norme de Postes Canada : 2 à 4 jours ouvrables."
                    : "Standard mail, no tracking. Canada Post's standard is 2–4 business days."}
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
            {priceSummary}
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
            {priceSummary}
            {mailButton()}
          </div>
        </div>
      )}
    </div>

    {/* ── Below-the-fold SEO content ── */}
    <section className="bg-white border-t border-gray-200">
      {/* Scroll hint */}
      <div className="flex justify-center py-6">
        <ChevronDown className="w-5 h-5 text-gray-300 animate-bounce" />
      </div>

      {/* How it works */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-2">
          {isFr ? "Comment ça marche" : "How it works"}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-10 max-w-lg mx-auto">
          {isFr
            ? "Envoyez une vraie lettre par la poste depuis votre ordinateur ou téléphone. Pas de compte requis."
            : "Send a real letter in the mail from your computer or phone. No account needed."}
        </p>

        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-10 h-10 rounded-full bg-brand/10 text-brand font-bold text-lg flex items-center justify-center mx-auto mb-3">
                {s.n}
              </div>
              <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-[#fafafa] border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-10">
            {isFr ? "Questions fréquentes" : "Frequently asked questions"}
          </h2>

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8">
            {faqItems.map((item, i) => (
              <div key={i}>
                <h3 className="font-semibold text-sm mb-1.5">{item.q}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <SnowGoose size={28} />
            <span className="font-bold text-sm">sendletter</span>
          </div>
          <p className="text-xs text-gray-400 text-center max-w-md">
            {isFr
              ? `Envoyez une lettre par la poste au Canada à partir de ${formatCents(FROM_ALL_IN_CENTS, "fr")}. Impression, affranchissement et taxes inclus. Aucun compte requis.`
              : `Mail a letter anywhere in Canada from ${formatCents(FROM_ALL_IN_CENTS)}. Printing, postage and tax included. No account required.`}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/docs" className="hover:text-gray-600 transition-colors">{isFr ? "Docs API" : "API Docs"}</Link>
            <span>·</span>
            <Link href="/blog" className="hover:text-gray-600 transition-colors">{isFr ? "Blogue" : "Blog"}</Link>
            <span>·</span>
            {!isFr && (
              <>
                <Link href="/guides/postage-and-stamps" className="hover:text-gray-600 transition-colors">Postage guides</Link>
                <span>·</span>
              </>
            )}
            <Link href="/mail-to-canada" className="hover:text-gray-600 transition-colors">
              {isFr ? "Poster au Canada" : "Mail to Canada"}
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">{isFr ? "Conditions" : "Terms"}</Link>
            <span>·</span>
            <a href="mailto:support@sendletter.app" className="hover:text-gray-600 transition-colors">support@sendletter.app</a>
          </div>
        </div>
      </footer>
    </section>
    </>
  );
}
