"use client";

import { useEffect, useState, useRef } from "react";
import { Check, Mail, Loader2 } from "lucide-react";
import Link from "next/link";

function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get("session_id"));
  }, []);
  return sessionId;
}

export default function SuccessPage() {
  const sessionId = useSessionId();
  const [emailStatus, setEmailStatus] = useState<"sending" | "sent" | "error" | "idle">("idle");
  const sentRef = useRef(false);

  // Fire Google Ads conversion event
  useEffect(() => {
    if (!sessionId) return;
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: "AW-11542356574/UzL5CMvJko4cEN7E6f8q",
        transaction_id: sessionId,
      });
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || sentRef.current) return;
    sentRef.current = true;

    async function sendEmail() {
      setEmailStatus("sending");
      try {
        // Get draft data from IndexedDB
        let pdfBase64: string | undefined;
        let htmlContent: string | undefined;
        let letterData: Record<string, unknown> | undefined;
        let letterMode: string | undefined;
        let originalFile: { base64: string; name: string; type: string } | undefined;
        try {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open("sendletter", 1);
            req.onupgradeneeded = () => req.result.createObjectStore("draft");
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          const tx = db.transaction("draft", "readonly");
          const draft = await new Promise<Record<string, unknown> | undefined>((resolve) => {
            const req = tx.objectStore("draft").get("current");
            req.onsuccess = () => resolve(req.result as Record<string, unknown> | undefined);
            req.onerror = () => resolve(undefined);
          });
          db.close();

          if (draft) {
            letterMode = draft.mode as string | undefined;
            if (draft.letterData) letterData = draft.letterData as Record<string, unknown>;
            // Upload mode: prefer original file (docx/pdf as uploaded)
            if (draft.originalFile) {
              originalFile = draft.originalFile as { base64: string; name: string; type: string };
            }
            // Prefer the generated print-quality PDF (simple/custom modes)
            if (draft.generatedPdf && typeof draft.generatedPdf === "string") {
              pdfBase64 = draft.generatedPdf;
            } else if (draft.htmlContent && typeof draft.htmlContent === "string") {
              const match = draft.htmlContent.match(/data-pdf="([^"]+)"/);
              if (match) {
                pdfBase64 = match[1];
              } else if (!originalFile) {
                htmlContent = draft.htmlContent;
              }
            }
          }
        } catch { /* IndexedDB unavailable */ }

        // Only send content relevant to the mode that was used
        const res = await fetch("/api/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            pdfBase64,
            htmlContent: letterMode !== "simple" && !pdfBase64 && !originalFile ? htmlContent : undefined,
            letterData: letterMode === "simple" && !pdfBase64 ? letterData : undefined,
            letterMode,
            originalFile,
          }),
        });

        if (res.ok) {
          setEmailStatus("sent");
          // Clear draft after successful send
          try {
            const db = await new Promise<IDBDatabase>((resolve, reject) => {
              const req = indexedDB.open("sendletter", 1);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            });
            const tx = db.transaction("draft", "readwrite");
            tx.objectStore("draft").delete("current");
            db.close();
          } catch { /* ignore */ }
        } else {
          setEmailStatus("error");
        }
      } catch {
        setEmailStatus("error");
      }
    }

    sendEmail();
  }, [sessionId]);

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 bg-[#fafafa]">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-1 ring-emerald-200/60">
          <Check className="w-6 h-6 text-emerald-600" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Letter sent!</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-2">
          Your letter is being printed and will be in the mail within 1 business
          day. Expect delivery in 3–5 business days.
        </p>

        {emailStatus === "sending" && (
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5 mb-6">
            <Loader2 className="w-3 h-3 animate-spin" />
            Sending confirmation email...
          </p>
        )}
        {emailStatus === "sent" && (
          <p className="text-xs text-emerald-600 mb-6">
            Confirmation email sent.
          </p>
        )}
        {emailStatus === "error" && (
          <p className="text-xs text-gray-400 mb-6">
            Could not send confirmation email. Check your Stripe receipt for details.
          </p>
        )}
        {emailStatus === "idle" && <div className="mb-6" />}

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-dark active:scale-[0.98] transition-all"
        >
          <Mail className="w-4 h-4" />
          Send another letter
        </Link>

        <p className="text-[11px] text-gray-400 mt-8 leading-relaxed">
          Votre lettre est en cours d&apos;impression et sera postée dans un délai de
          1 jour ouvrable. Livraison prévue en 3 à 5 jours ouvrables.
        </p>
      </div>
    </div>
  );
}
