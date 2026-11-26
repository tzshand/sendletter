import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/ga/js",
        destination: "https://www.googletagmanager.com/gtag/js",
      },
      {
        source: "/ga/g/:path*",
        destination: "https://www.google-analytics.com/g/:path*",
      },
    ];
  },
  async redirects() {
    return [
      // (/blog/mail-a-letter-to-canada-from-abroad used to redirect to /mail-to-canada; since 2026-11-26 it is a live guide again.)
      {
        source: "/fr/blog/envoyer-une-lettre-au-canada-depuis-l-etranger",
        destination: "/fr/mail-to-canada/envoyer-une-lettre-au-canada",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
