import type { Metadata } from "next";
import type { ReactNode } from "react";

import { fontVariables } from "./fonts";
import "./globals.css";

// Placeholder. The real title and description are marketing copy and move to
// content/marketing.ts when the marketing site lands.
export const metadata: Metadata = {
  title: "Tallie",
  description: "Track what you spend. Set a limit per category. Know before month-end.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
