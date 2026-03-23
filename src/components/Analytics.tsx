"use client";

import { useEffect } from "react";

export function Analytics() {
  useEffect(() => {
    const s = document.createElement("script");
    s.async = true;
    s.src = "/ga/js?id=G-312ZDLVT4J";
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag as typeof window.gtag;
    gtag("js", new Date());
    gtag("config", "G-312ZDLVT4J", {
      transport_url: "https://sendletter.app/ga",
      first_party_collection: true,
    });
    gtag("config", "AW-11542356574", {
      transport_url: "https://sendletter.app/ga",
      first_party_collection: true,
    });
  }, []);

  return null;
}
