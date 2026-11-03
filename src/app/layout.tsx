import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

// Noto Sans pairs with Noto Sans Devanagari, the combination most NIC-built portals use.
const inter = Noto_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "RejectLess — Check your application before you submit", template: "%s · RejectLess" },
  description:
    "Check your documents, catch inconsistencies and understand what needs fixing before you submit an EPFO or scholarship application. Privacy-first: documents are processed in your browser.",
};

export const viewport: Viewport = {
  themeColor: "#1f3d7a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
