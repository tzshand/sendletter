"use client";

import { useEffect } from "react";

export function Analytics() {
  useEffect(() => {
    const s = document.createElement("script");
    s.async = true;
    s.src = "/ga/js?id=G-312ZDLVT4J";
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    } as typeof window.gtag;
    window.gtag("js", new Date());

    // Suppress auto page_view on both configs — we send our own
    window.gtag("config", "G-312ZDLVT4J", {
      transport_url: "https://sendletter.app/ga",
      first_party_collection: true,
      send_page_view: false,
    });
    window.gtag("config", "AW-11542356574", {
      transport_url: "https://sendletter.app/ga",
      first_party_collection: true,
      send_page_view: false,
    });

    // One page_view with the correct title
    window.gtag("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
    });
  }, []);

  return null;
}
