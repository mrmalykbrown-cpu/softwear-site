import { Bricolage_Grotesque, Inter_Tight, Martian_Mono } from "next/font/google";

/**
 * Three roles, three families, self-hosted by next/font at build time (no
 * request to Google at runtime) with `display: swap` so text is readable
 * while the face loads.
 *
 * Each exposes a custom property; layout.tsx puts all three on <html> and
 * tailwind.config.ts reads them. Nothing imports a font family by name.
 */

export const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-display",
});

export const fontBody = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body",
});

export const fontNumeral = Martian_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-numeral",
});

export const fontVariables = [
  fontDisplay.variable,
  fontBody.variable,
  fontNumeral.variable,
].join(" ");
