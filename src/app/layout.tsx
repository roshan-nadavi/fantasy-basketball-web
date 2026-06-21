// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FantasyProvider } from "../context/FantasyContext";
import { QueryProvider } from "../providers/QueryProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-font-mono", // Maps cleanly to your high-density data text layout
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Precision Fantasy Analytics Dashboard",
  description: "Dynamic VORP and Custom Point League Auction Model Calculator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground text-sm">
        {/* The data context wraps everything inside the body element */}
        <FantasyProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </FantasyProvider>
      </body>
    </html>
  );
}