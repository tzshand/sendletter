"use client";

import { CalendarDays } from "lucide-react";

export type SimpleLetterData = {
  date: string;
  subject: string;
  body: string;
  closing: string;
  senderName: string;
};

export function SimpleLetterForm({
  data,
  onChange,
}: {
  data: SimpleLetterData;
  onChange: (d: SimpleLetterData) => void;
}) {
  const set = (field: keyof SimpleLetterData, value: string) =>
    onChange({ ...data, [field]: value });

  return (
    <div className="space-y-4">
      {/* Date */}
      <div className="relative">
        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="date"
          value={data.date}
          onChange={(e) => set("date", e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Subject */}
      <div>
        <input
          placeholder="Subject (optional)"
          value={data.subject}
          onChange={(e) => set("subject", e.target.value)}
          className="input"
        />
      </div>

      {/* Body */}
      <div>
        <textarea
          placeholder="Write your letter here..."
          value={data.body}
          onChange={(e) => set("body", e.target.value)}
          rows={10}
          className="input resize-none font-serif"
          style={{ lineHeight: 1.7, fontSize: "15px" }}
        />
      </div>

      {/* Closing & Signature */}
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Closing (e.g. Sincerely)"
          value={data.closing}
          onChange={(e) => set("closing", e.target.value)}
          className="input"
        />
        <input
          placeholder="Your name"
          value={data.senderName}
          onChange={(e) => set("senderName", e.target.value)}
          className="input"
        />
      </div>
    </div>
  );
}
