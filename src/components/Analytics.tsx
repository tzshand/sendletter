"use client";

import { useEffect } from "react";

export function Analytics() {
  useEffect(() => {
    const s = document.createElement("script");
    s.async = true;
    s.src = "/ga/js?id=G-312ZDLVT4J";
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    // Must use `arguments` (not rest params) for gtag compatibility
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    } as typeof window.gtag;
    window.gtag("js", new Date());
    window.gtag("config", "G-312ZDLVT4J", {
      transport_url: "https://sendletter.app/ga",
      first_party_collection: true,
      page_title: document.title || "sendletter",
    });
    window.gtag("config", "AW-11542356574", {
      transport_url: "https://sendletter.app/ga",
      first_party_collection: true,
    });
  }, []);

  return null;
}
