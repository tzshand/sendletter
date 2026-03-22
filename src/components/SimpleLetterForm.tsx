"use client";

import type { Language } from "./LetterSettings";

export type SimpleLetterData = {
  date: string;
  subject: string;
  body: string;
  closing: string;
  senderName: string;
};

const CLOSINGS_EN = ["Sincerely", "Best regards", "Kind regards", "Yours truly", "Respectfully", "Thank you"];
const CLOSINGS_FR = ["Cordialement", "Bien à vous", "Sincères salutations", "Respectueusement", "Veuillez agréer"];

export function SimpleLetterForm({
  data,
  onChange,
  language,
}: {
  data: SimpleLetterData;
  onChange: (d: SimpleLetterData) => void;
  language: Language;
}) {
  const set = (field: keyof SimpleLetterData, value: string) =>
    onChange({ ...data, [field]: value });

  const closings = language === "fr" ? CLOSINGS_FR : CLOSINGS_EN;

  return (
    <div className="space-y-3">
      {/* Date */}
      <input
        type="date"
        value={data.date}
        onChange={(e) => set("date", e.target.value)}
        className="input"
      />

      {/* Subject */}
      <input
        placeholder={language === "fr" ? "Objet (facultatif)" : "Subject (optional)"}
        value={data.subject}
        onChange={(e) => set("subject", e.target.value)}
        className="input"
      />

      {/* Body */}
      <textarea
        placeholder={
          language === "fr"
            ? "Rédigez votre lettre ici..."
            : "Write your letter here..."
        }
        value={data.body}
        onChange={(e) => set("body", e.target.value)}
        rows={12}
        className="input resize-none"
        style={{ fontFamily: "serif", lineHeight: 1.7 }}
      />

      {/* Closing & Name */}
      <div className="grid grid-cols-2 gap-3">
        <select
          value={data.closing}
          onChange={(e) => set("closing", e.target.value)}
          className="input"
        >
          {closings.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          placeholder={language === "fr" ? "Votre nom" : "Your name"}
          value={data.senderName}
          onChange={(e) => set("senderName", e.target.value)}
          className="input"
        />
      </div>
    </div>
  );
}
