"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Language, Settings } from "./LetterSettings";
import { FontSizeBar } from "./LetterSettings";

export type SimpleLetterData = {
  date: string;
  greeting: string;
  subject: string;
  body: string;
  closing: string;
  senderName: string;
  reference: string;
  cc: string;
  enclosures: string;
  ps: string;
};


function Toggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-2 group"
    >
      <div
        className={`w-8 h-[18px] rounded-full transition-colors relative ${
          enabled ? "bg-gray-900" : "bg-gray-200 group-hover:bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-[16px]" : "translate-x-[2px]"
          }`}
        />
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </button>
  );
}

export function SimpleLetterForm({
  data,
  onChange,
  language,
  settings,
  onSettingsChange,
}: {
  data: SimpleLetterData;
  onChange: (d: SimpleLetterData) => void;
  language: Language;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
}) {
  const [showExtras, setShowExtras] = useState(false);
  const [extrasEnabled, setExtrasEnabled] = useState({
    reference: false,
    cc: false,
    enclosures: false,
    ps: false,
  });

  const set = (field: keyof SimpleLetterData, value: string) =>
    onChange({ ...data, [field]: value });

  const isFr = language === "fr";

  const toggleExtra = (key: keyof typeof extrasEnabled) => {
    const newVal = !extrasEnabled[key];
    setExtrasEnabled((e) => ({ ...e, [key]: newVal }));
    if (!newVal) set(key, "");
  };

  return (
    <div className="space-y-3">
      {/* Font & size */}
      <FontSizeBar settings={settings} onChange={onSettingsChange} />

      {/* Date */}
      <input
        type="date"
        value={data.date}
        onChange={(e) => set("date", e.target.value)}
        className="input"
      />

      {/* Greeting */}
      <input
        placeholder={isFr ? "Salutation (facultatif)" : "Greeting (optional)"}
        value={data.greeting}
        onChange={(e) => set("greeting", e.target.value)}
        className="input"
      />

      {/* Subject */}
      <input
        placeholder={isFr ? "Objet (facultatif)" : "Subject (optional)"}
        value={data.subject}
        onChange={(e) => set("subject", e.target.value)}
        className="input"
      />

      {/* Body */}
      <textarea
        placeholder={
          isFr ? "Rédigez votre lettre ici..." : "Write your letter here..."
        }
        value={data.body}
        onChange={(e) => set("body", e.target.value)}
        rows={10}
        className="input resize-none"
        style={{ fontFamily: "serif", lineHeight: 1.7 }}
      />

      {/* Closing & Name */}
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder={isFr ? "Formule de politesse" : "Closing (e.g. Sincerely)"}
          value={data.closing}
          onChange={(e) => set("closing", e.target.value)}
          className="input"
        />
        <input
          placeholder={isFr ? "Votre nom" : "Your name"}
          value={data.senderName}
          onChange={(e) => set("senderName", e.target.value)}
          className="input"
        />
      </div>

      {/* More options toggle */}
      <button
        type="button"
        onClick={() => setShowExtras(!showExtras)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors pt-1"
      >
        {showExtras ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        {isFr ? "Plus d'options" : "More options"}
      </button>

      {showExtras && (
        <div className="space-y-3 pl-1">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Toggle
              label={isFr ? "Référence" : "Reference #"}
              enabled={extrasEnabled.reference}
              onChange={() => toggleExtra("reference")}
            />
            <Toggle
              label="CC"
              enabled={extrasEnabled.cc}
              onChange={() => toggleExtra("cc")}
            />
            <Toggle
              label={isFr ? "Pièces jointes" : "Enclosures"}
              enabled={extrasEnabled.enclosures}
              onChange={() => toggleExtra("enclosures")}
            />
            <Toggle
              label="P.S."
              enabled={extrasEnabled.ps}
              onChange={() => toggleExtra("ps")}
            />
          </div>

          {extrasEnabled.reference && (
            <input
              placeholder={isFr ? "Numéro de référence" : "Reference number"}
              value={data.reference}
              onChange={(e) => set("reference", e.target.value)}
              className="input input-sm"
            />
          )}
          {extrasEnabled.cc && (
            <input
              placeholder={isFr ? "Copie conforme (noms)" : "CC (names)"}
              value={data.cc}
              onChange={(e) => set("cc", e.target.value)}
              className="input input-sm"
            />
          )}
          {extrasEnabled.enclosures && (
            <input
              placeholder={
                isFr
                  ? "Pièces jointes (ex: CV, documents)"
                  : "Enclosures (e.g. Resume, Documents)"
              }
              value={data.enclosures}
              onChange={(e) => set("enclosures", e.target.value)}
              className="input input-sm"
            />
          )}
          {extrasEnabled.ps && (
            <textarea
              placeholder="P.S."
              value={data.ps}
              onChange={(e) => set("ps", e.target.value)}
              rows={2}
              className="input input-sm resize-none"
            />
          )}
        </div>
      )}
    </div>
  );
}
