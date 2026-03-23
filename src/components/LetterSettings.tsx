"use client";

import { Globe, Type, ALargeSmall, AlignVerticalSpaceAround } from "lucide-react";

export type Language = "en" | "fr";
export type FontFamily = "Times New Roman" | "Garamond" | "Georgia" | "Helvetica" | "Arial";
export type FontSize = 10 | 11 | 12 | 14;

export type Settings = {
  language: Language;
  fontFamily: FontFamily;
  fontSize: FontSize;
  verticalCenter?: boolean;
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
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-gray-400" />
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {(["en", "fr"] as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => onChange({ ...settings, language: lang })}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${
              settings.language === lang
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {lang === "en" ? "English" : "Français"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FontSizeBar({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
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

      {/* Vertical center */}
      <button
        onClick={() => onChange({ ...settings, verticalCenter: !settings.verticalCenter })}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
          settings.verticalCenter
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
        }`}
        title="Center content vertically"
      >
        <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
