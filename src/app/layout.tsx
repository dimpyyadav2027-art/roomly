import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ClarityConsent from "@/components/ClarityConsent";

export const metadata: Metadata = {
  title: "Roomly — real room makeovers",
  description: "Structure-aware AI room makeovers with shoppable, budget-conscious edits.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2769947773731162"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}<ClarityConsent /></body>
    </html>
  );
}
