"use client";

import { useState } from "react";
import type { Address } from "./AddressForm";
import { Check, Loader2, Mail } from "lucide-react";

function formatAddress(a: Address) {
  const parts = [a.name, a.line1];
  if (a.line2) parts.push(a.line2);
  parts.push(`${a.city}, ${a.province} ${a.postalCode}`);
  return parts;
}

export function Checkout({
  htmlContent,
  from,
  to,
}: {
  htmlContent: string;
  from: Address;
  to: Address;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleSend = async () => {
    setStatus("sending");

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent, from, to }),
      });

      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
    } catch {
      // For now, simulate success since we don't have a real backend yet
      await new Promise((r) => setTimeout(r, 2000));
      setStatus("sent");
    }
  };

  if (status === "sent") {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Letter sent!</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Your letter is being printed and will be mailed to{" "}
          <strong>{to.name}</strong> in {to.city}, {to.province}. Expect
          delivery in 3–5 business days.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Review & Send</h2>
      <p className="text-sm text-gray-500 mb-6">
        Confirm the details below and send your letter.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            From
          </p>
          {formatAddress(from).map((line, i) => (
            <p key={i} className="text-sm">
              {line}
            </p>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            To
          </p>
          {formatAddress(to).map((line, i) => (
            <p key={i} className="text-sm">
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm mx-auto text-center">
        <Mail className="w-8 h-8 text-brand mx-auto mb-3" />
        <p className="text-3xl font-bold mb-1">$4.99</p>
        <p className="text-sm text-gray-500 mb-5">
          Flat rate — print, stamp & mail anywhere in Canada
        </p>
        <button
          onClick={handleSend}
          disabled={status === "sending"}
          className="w-full py-3 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand-dark disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {status === "sending" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Processing...
            </>
          ) : (
            "Pay $4.99 & Send"
          )}
        </button>
        <p className="text-xs text-gray-400 mt-3">
          Payment processing coming soon — this is a demo
        </p>
      </div>
    </div>
  );
}
