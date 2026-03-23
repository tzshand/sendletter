"use client";

import { useState, useEffect, useRef } from "react";

export function SnowGoose({ size = 32 }: { size?: number }) {
  const [preening, setPreening] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const preen = () => {
      if (!mounted.current) return;
      setPreening(true);
      setTimeout(() => {
        if (mounted.current) setPreening(false);
      }, 2800);
    };
    const first = setTimeout(preen, 6000);
    const loop = setInterval(preen, 16000 + Math.random() * 8000);
    return () => {
      mounted.current = false;
      clearTimeout(first);
      clearInterval(loop);
    };
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-label="Snow goose"
      className="overflow-visible"
    >
      {/* Body */}
      <ellipse cx="54" cy="58" rx="23" ry="15" fill="white" />

      {/* Wing overlay */}
      <path
        d="M 52 48 Q 64 43 74 48 Q 70 54 60 57 Z"
        fill="#f3f3f3"
      />

      {/* Black wingtips */}
      <path d="M 71 46 Q 80 43 84 50 Q 78 52 73 50 Z" fill="#222" />

      {/* Tail */}
      <path d="M 74 55 L 83 52 L 80 58 Z" fill="#eee" />

      {/* Neck + Head — animated group */}
      <g
        className={preening ? "goose-preen" : ""}
        style={{ transformOrigin: "38px 48px" }}
      >
        {/* Neck */}
        <path
          d="M 38 48 C 33 38, 28 26, 31 16"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Head */}
        <circle cx="31" cy="14" r="5.5" fill="white" />

        {/* Beak — orange with dark grin patch */}
        <path d="M 19 14 L 25 11 L 25 17 Z" fill="#E8721A" />
        <path d="M 24 13.5 L 25 11.5 L 25 15.5 Z" fill="#333" />

        {/* Eye */}
        <circle cx="28" cy="12.5" r="1.3" fill="#1a1a1a" />
      </g>

      {/* Legs */}
      <line x1="48" y1="72" x2="46" y2="83" stroke="#E8721A" strokeWidth="2" strokeLinecap="round" />
      <line x1="57" y1="72" x2="59" y2="83" stroke="#E8721A" strokeWidth="2" strokeLinecap="round" />

      {/* Feet */}
      <path d="M 43 83 L 46 83 L 49 85" stroke="#E8721A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M 56 83 L 59 83 L 62 85" stroke="#E8721A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
