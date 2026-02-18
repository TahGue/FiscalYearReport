import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BudgetAppLayout from "@/components/budget/BudgetAppLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rordic Ledger",
  description: "Private, local-first Swedish bank transaction analysis and AI budget consultation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BudgetAppLayout>{children}</BudgetAppLayout>
      </body>
    </html>
  );
}
