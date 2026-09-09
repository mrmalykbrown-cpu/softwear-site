import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OddScope — See the math before you stake",
    template: "%s · OddScope",
  },
  description:
    "Screenshot a bookmaker's odds board and get three bets ranked by risk, each with its edge, its stake and its reasoning — and an honest answer when there is no bet worth making.",
  openGraph: {
    title: "OddScope — See the math before you stake",
    description:
      "Three risk-tiered bets per match, with the edge shown in writing. And a tool that tells you when to skip.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0D1524",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-navy-950 text-slate-100 antialiased">
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
