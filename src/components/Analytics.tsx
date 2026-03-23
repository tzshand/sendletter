import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

export function Analytics() {
  return (
    <>
      <GoogleAnalytics gaId="G-39L40L4RTY" />
      <Script id="gtag-ads" strategy="afterInteractive">
        {`window.gtag && window.gtag('config', 'AW-11542356574');`}
      </Script>
    </>
  );
}
