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
};

export default nextConfig;
