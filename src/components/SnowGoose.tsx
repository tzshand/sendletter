"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

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
      }, 600);
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
    <Image
      src="/goose-128-letter.png"
      alt="Snow goose"
      width={size}
      height={size}
      className={`transition-transform duration-300 ${preening ? "scale-x-[-1]" : ""}`}
      style={{ imageRendering: "pixelated" }}
      priority
    />
  );
}
