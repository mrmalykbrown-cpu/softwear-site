import type { Metadata, Viewport } from "next"
import { Poppins, Righteous } from "next/font/google"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

const righteous = Righteous({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-righteous",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Prism — Music Art Wallpapers",
  description:
    "Turn album art into a living phone wallpaper with smooth transitions, and control it from a liquid-glass widget.",
}

export const viewport: Viewport = {
  themeColor: "#0f0f23",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${poppins.variable} ${righteous.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
