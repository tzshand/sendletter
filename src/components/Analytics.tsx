"use client";

import { useEffect } from "react";

export function Analytics() {
  useEffect(() => {
    const s = document.createElement("script");
    s.async = true;
    s.src = "/ga/js?id=GT-PB63C6VV";
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    } as typeof window.gtag;
    window.gtag("js", new Date());
    window.gtag("config", "GT-PB63C6VV", {
      transport_url: "https://sendletter.app/ga",
    });
    window.gtag("config", "AW-11542356574", {
      transport_url: "https://sendletter.app/ga",
      send_page_view: false,
    });
  }, []);

  return null;
}
