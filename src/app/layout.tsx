import type { Metadata, Viewport } from "next"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"

// Poppins is only a graceful fallback — the UI leads with the platform
// system font (SF Pro on Apple) per the apple-ui-design system.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

// Inter is the closest free stand-in for Apple's SF Pro (used for lyrics).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Prism — Live Music Wallpapers & Lyrics",
  description:
    "Full-screen album-art wallpapers with smooth transitions, real-time Apple-style lyrics, and a liquid-glass control widget.",
}

export const viewport: Viewport = {
  themeColor: "#0f0f23",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${poppins.variable} ${inter.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  )
}
