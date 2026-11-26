"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="text-sm font-semibold text-gray-700 hover:text-gray-900">
      Print / save as PDF
    </button>
  );
}
