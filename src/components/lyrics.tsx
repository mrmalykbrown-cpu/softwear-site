"use client"

import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { activeIndex, type LyricLine } from "@/lib/lyrics"

interface LyricsProps {
  lines: LyricLine[]
  positionSec: number
  /** true when the wallpaper is light, so we switch to dark text */
  lightWallpaper: boolean
  /** font multiplier (0.7 – 1.8) */
  sizeScale: number
  loading?: boolean
  onSeek?: (sec: number) => void
}

/**
 * Apple-Music-style synced lyrics. The active line is bright; the rest are
 * translucent. The block auto-scrolls so the current line stays centered, and
 * everything is colour-contrasted against the wallpaper for legibility.
 */
export function Lyrics({
  lines,
  positionSec,
  lightWallpaper,
  sizeScale,
  loading,
  onSeek,
}: LyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [offset, setOffset] = useState(0)

  const active = activeIndex(lines, positionSec)

  // keep the active line vertically centered
  useEffect(() => {
    const recenter = () => {
      const c = containerRef.current
      const el = lineRefs.current[Math.max(0, active)]
      if (!c || !el) return
      setOffset(c.clientHeight / 2 - (el.offsetTop + el.offsetHeight / 2))
    }
    recenter()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", recenter)
      return () => window.removeEventListener("resize", recenter)
    }
    const ro = new ResizeObserver(recenter)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [active, sizeScale, lines])

  const textActive = lightWallpaper ? "rgba(12,12,20,0.96)" : "rgba(255,255,255,0.97)"
  const textIdle = lightWallpaper ? "rgba(12,12,20,0.32)" : "rgba(255,255,255,0.36)"
  // luminous glow on the active line (halo in the text colour + a legibility drop)
  const shadow = lightWallpaper
    ? "0 1px 10px rgba(255,255,255,0.7), 0 0 22px rgba(0,0,0,0.18)"
    : "0 2px 14px rgba(0,0,0,0.4), 0 0 24px rgba(255,255,255,0.55), 0 0 52px rgba(255,255,255,0.3)"

  if (loading) {
    return (
      <Centered>
        <p
          className="animate-pulse text-base font-medium"
          style={{ color: textIdle, fontFamily: "var(--font-lyrics)" }}
        >
          Finding lyrics…
        </p>
      </Centered>
    )
  }

  if (!lines.length) {
    return (
      <Centered>
        <p
          className="px-8 text-center text-base font-medium"
          style={{ color: textIdle, fontFamily: "var(--font-lyrics)" }}
        >
          No synced lyrics for this track yet.
        </p>
      </Centered>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        fontFamily: "var(--font-lyrics)",
        fontSize: `calc(clamp(1.5rem, 6.2vw, 2.6rem) * ${sizeScale})`,
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, #000 16%, #000 80%, transparent)",
        maskImage:
          "linear-gradient(to bottom, transparent, #000 16%, #000 80%, transparent)",
      }}
    >
      <motion.div
        ref={innerRef}
        animate={{ y: offset }}
        transition={{ type: "spring", stiffness: 130, damping: 26, mass: 0.6 }}
      >
        {lines.map((line, i) => {
          const isActive = i === active
          return (
            <button
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el
              }}
              onClick={() => onSeek?.(line.time)}
              tabIndex={onSeek ? 0 : -1}
              className="block w-full cursor-pointer px-6 py-[0.35em] text-left font-extrabold leading-[1.12] tracking-[-0.02em] outline-none"
              style={{
                color: isActive ? textActive : textIdle,
                textShadow: isActive ? shadow : "none",
                transform: isActive ? "scale(1)" : "scale(0.97)",
                transformOrigin: "left center",
                filter: isActive ? "blur(0px)" : "blur(0.3px)",
                transition:
                  "color 0.45s ease, opacity 0.45s ease, transform 0.5s ease, filter 0.45s ease",
              }}
            >
              {line.text}
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full w-full items-center justify-center">{children}</div>
}
