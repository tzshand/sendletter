"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { Check, Mail, Loader2 } from "lucide-react";
import Link from "next/link";

const noSubscribe = () => () => {};

/** The ?session_id= from the URL. null while rendering on the server. */
function useSessionId() {
  return useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).get("session_id"),
    () => null,
  );
}

export default function SuccessPage() {
  const sessionId = useSessionId();
  const [emailStatus, setEmailStatus] = useState<"sending" | "sent" | "error" | "idle">("idle");
  const sentRef = useRef(false);

  // Fire Google Ads conversion event (retry briefly if gtag not ready)
  useEffect(() => {
    if (!sessionId) return;
    function fire() {
      if (typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: "AW-11542356574/UzL5CMvJko4cEN7E6f8q",
          transaction_id: sessionId,
        });
        return true;
      }
      return false;
    }
    if (!fire()) {
      const id = setInterval(() => { if (fire()) clearInterval(id); }, 200);
      setTimeout(() => clearInterval(id), 5000);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || sentRef.current) return;
    sentRef.current = true;

    async function sendEmail() {
      setEmailStatus("sending");
      try {
        // The document was uploaded to the server before payment; confirmation
        // reads it from there, so only the session id is needed. A 503 means the
        // server couldn't check (database or file store briefly unreachable):
        // payment is already captured, so just try again shortly.
        let res: Response | null = null;
        for (let attempt = 0; attempt < 4; attempt++) {
          res = await fetch("/api/send-confirmation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          if (res.status !== 503) break;
          await new Promise((r) => setTimeout(r, 6000));
        }

        if (res?.ok) {
          setEmailStatus("sent");
          // Clear the form draft after a completed order
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
          day. Expect delivery in 3–7 business days.
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
          1 jour ouvrable. Livraison prévue en 3 à 7 jours ouvrables.
        </p>
      </div>
    </div>
  );
}
