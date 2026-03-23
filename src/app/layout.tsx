import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "sendletter — Mail a letter online from $4.29",
  description:
    "Write or upload your letter, add addresses, and we'll print and mail it anywhere in Canada from $4.29.",
  metadataBase: new URL("https://sendletter.app"),
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.className} h-full`}>
      <body className="h-full text-gray-900 antialiased">{children}</body>
    </html>
  );
}
