import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "sendletter — Mail a letter online for $4.99",
  description:
    "Write or upload your letter, add addresses, and we'll print and mail it anywhere in Canada for a flat $4.99.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`}>
      <body className="h-full bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
