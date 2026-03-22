"use client";

import { Globe, Type, ALargeSmall } from "lucide-react";

export type Language = "en" | "fr";
export type FontFamily = "Times New Roman" | "Garamond" | "Georgia" | "Helvetica" | "Arial";
export type FontSize = 10 | 11 | 12 | 14;

export type Settings = {
  language: Language;
  fontFamily: FontFamily;
  fontSize: FontSize;
};

const FONTS: { value: FontFamily; label: string }[] = [
  { value: "Times New Roman", label: "Times" },
  { value: "Garamond", label: "Garamond" },
  { value: "Georgia", label: "Georgia" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Arial", label: "Arial" },
];

const SIZES: FontSize[] = [10, 11, 12, 14];

export function LetterSettingsBar({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Language */}
      <div className="flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-gray-400" />
        <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-md">
          {(["en", "fr"] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => onChange({ ...settings, language: lang })}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${
                settings.language === lang
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="flex items-center gap-1.5">
        <Type className="w-3.5 h-3.5 text-gray-400" />
        <select
          value={settings.fontFamily}
          onChange={(e) =>
            onChange({ ...settings, fontFamily: e.target.value as FontFamily })
          }
          className="text-xs bg-gray-100 border-0 rounded-md px-2 py-1 text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Size */}
      <div className="flex items-center gap-1.5">
        <ALargeSmall className="w-3.5 h-3.5 text-gray-400" />
        <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-md">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => onChange({ ...settings, fontSize: size })}
              className={`px-1.5 py-0.5 text-xs font-medium rounded transition-all ${
                settings.fontSize === size
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
