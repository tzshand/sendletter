"use client";

// The billing address printed on invoices and used to work out sales tax. It starts
// as the card's billing address; editing it here never changes the card or Stripe.

import { useState } from "react";
import { MapPin, Loader2, Check } from "lucide-react";

export type BillingAddressValue = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

const FIELDS: { key: keyof BillingAddressValue; label: string; span?: boolean; auto: string }[] = [
  { key: "name", label: "Name or company", span: true, auto: "name" },
  { key: "line1", label: "Address line 1", span: true, auto: "address-line1" },
  { key: "line2", label: "Address line 2", span: true, auto: "address-line2" },
  { key: "city", label: "City", auto: "address-level2" },
  { key: "state", label: "Province or state", auto: "address-level1" },
  { key: "postal_code", label: "Postal code", auto: "postal-code" },
  { key: "country", label: "Country (2 letters)", auto: "country" },
];

export function BillingAddressCard({ initial, source }: { initial: BillingAddressValue; source: string | null }) {
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [src, setSrc] = useState(source);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const empty = !Object.entries(saved).some(([k, v]) => k !== "country" && v);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/billing-address", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not save");
      setSaved(j.address);
      setForm(j.address);
      setSrc("customer");
      setEditing(false);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={18} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Billing address</h2>
        {done && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Check size={12} /> Saved</span>}
      </div>

      {!editing ? (
        <div>
          {empty ? (
            <p className="text-sm text-gray-500">No billing address yet. It is filled in from your card when you add one, or you can enter it here.</p>
          ) : (
            <div className="text-sm text-gray-700 leading-relaxed">
              {saved.name && <div className="font-medium">{saved.name}</div>}
              {saved.line1 && <div>{saved.line1}</div>}
              {saved.line2 && <div>{saved.line2}</div>}
              <div>{[saved.city, saved.state].filter(Boolean).join(", ")}{saved.postal_code ? `  ${saved.postal_code}` : ""}</div>
              {saved.country && saved.country !== "CA" && <div>{saved.country}</div>}
            </div>
          )}
          <button onClick={() => { setForm(saved); setEditing(true); }} className="mt-3 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            {empty ? "Add address" : "Edit"}
          </button>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Shown on your invoices and used to work out which province&apos;s sales tax applies.
            {src === "stripe" ? " Copied from your card; " : " "}Changing it here does not change the card on file, and changing the card does not change this.
          </p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="grid sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.span ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-semibold text-gray-500 mb-1" htmlFor={`ba-${f.key}`}>{f.label}</label>
                <input
                  id={`ba-${f.key}`}
                  value={form[f.key]}
                  autoComplete={f.auto}
                  maxLength={f.key === "country" ? 2 : 120}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="input input-sm w-full"
                />
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
          <div className="flex items-center gap-3 mt-4">
            <button type="submit" disabled={busy} className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {busy && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
            <button type="button" onClick={() => { setEditing(false); setError(""); }} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
