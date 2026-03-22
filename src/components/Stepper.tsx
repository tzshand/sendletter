"use client";

import { Check } from "lucide-react";

export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < current
                  ? "bg-brand text-white"
                  : i === current
                    ? "bg-brand text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-sm ${i <= current ? "text-gray-900 font-medium" : "text-gray-400"}`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-px ${i < current ? "bg-brand" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
