"use client";

import { useEffect } from "react";

const GA_ID = "G-312ZDLVT4J";
const AW_ID = "AW-11542356574";

export function Analytics() {
  useEffect(() => {
    // Load gtag.js
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    }
    gtag("js", new Date());
    gtag("config", GA_ID);
    gtag("config", AW_ID);
    window.gtag = gtag;
  }, []);

  return null;
}

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}
