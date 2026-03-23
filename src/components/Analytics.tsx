"use client";

import { useEffect } from "react";

const GA_ID = "G-39L40L4RTY";
const AW_ID = "AW-11542356574";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function Analytics() {
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    const gtag: Window["gtag"] = function () {
      window.dataLayer!.push(arguments);
    };
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_ID);
    gtag("config", AW_ID);

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
