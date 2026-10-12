import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Providers } from "./providers";
import { PostHogProvider } from "@/lib/posthog/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://tapt.fun'),
  title: "TapT - Trade over 300+ Crypto, Stocks, Metals and Forex with 5s-1m time-charts",
  description:
    "Short charts for crypto, stocks, metals, and FX. Rounds run from 5 seconds to 1 minute and settle from the house balance.",
  keywords: [
    "TapT",
    "binary options",
    "Robinhood Chain",
    "Solana",
    "Base",
    "Arbitrum",
    "Tempo",
    "crypto trading",
    "Web3",
    "prediction",
  ],
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "256x256", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon-32.png",
  },
  openGraph: {
    type: 'website',
    siteName: 'TapT',
    url: 'https://tapt.fun',
    title: "TapT — Trade over 300+ Crypto, Stocks, Metals and Forex with 5s-1m time-charts",
    description:
      "Short charts for crypto, stocks, metals, and FX. Rounds run from 5 seconds to 1 minute and settle from the house balance.",
  },
  twitter: {
    card: 'summary_large_image',
    site: '@TapT_fun',
    title: "TapT — Trade over 300+ Crypto, Stocks, Metals and Forex with 5s-1m time-charts",
    description: "Short charts for crypto, stocks, metals, and FX. Rounds run from 5 seconds to 1 minute.",
  },
};

import { Header } from "@/components/Header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} antialiased bg-black text-white h-dvh overflow-hidden flex flex-col`}
      >
        <PostHogProvider>
          <Providers>
            <Header />
            {/* Body is h-screen overflow-hidden: this must scroll or every page taller than the viewport is clipped. */}
            <main className="flex-1 relative flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </Providers>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
