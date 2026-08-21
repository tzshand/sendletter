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
      // The "from abroad" blog post was promoted into the /mail-to-canada hub,
      // which carries its content plus the per-country guides. Permanent so the
      // hub inherits the post's existing indexing rather than competing with it.
      {
        source: "/blog/mail-a-letter-to-canada-from-abroad",
        destination: "/mail-to-canada",
        permanent: true,
      },
      {
        source: "/fr/blog/envoyer-une-lettre-au-canada-depuis-l-etranger",
        destination: "/fr/mail-to-canada/envoyer-une-lettre-au-canada",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
