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
      <body>{children}<ClarityConsent /></body>
    </html>
  );
}
