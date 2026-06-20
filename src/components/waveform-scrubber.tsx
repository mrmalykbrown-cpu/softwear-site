"use client"

import { useRef } from "react"

const N = 44
// deterministic Spotify-code-like bar heights (0.22 – 1.0), stable across renders
const HEIGHTS = Array.from({ length: N }, (_, i) => {
  const a = Math.sin(i * 1.7) * 0.5 + 0.5
  const b = Math.sin(i * 0.55 + 1.3) * 0.5 + 0.5
  const c = Math.sin(i * 3.1 + 0.4) * 0.5 + 0.5
  return 0.22 + 0.78 * Math.min(1, a * 0.5 + b * 0.35 + c * 0.15)
})

/**
 * Spotify-code-style waveform that doubles as a slideable seek bar.
 * Bars up to the current position are lit; drag anywhere to scrub.
 */
export function WaveformScrubber({
  progress,
  onSeek,
  playing = false,
  bpm = 120,
}: {
  progress: number
  onSeek?: (frac: number) => void
  playing?: boolean
  bpm?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const beatSec = Math.max(0.34, 60 / (bpm || 120))

  const seekAt = (clientX: number) => {
    const el = ref.current
    if (!el || !onSeek) return
    const r = el.getBoundingClientRect()
    onSeek(Math.min(1, Math.max(0, (clientX - r.left) / r.width)))
  }

  return (
    <div
      ref={ref}
      className={`flex h-9 items-center gap-[3px] ${
        onSeek ? "cursor-pointer touch-none" : ""
      }`}
      style={
        playing
          ? { animation: `waveBeat ${beatSec}s ease-out infinite`, willChange: "filter" }
          : undefined
      }
      onPointerDown={(e) => {
        if (!onSeek) return
        dragging.current = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        seekAt(e.clientX)
      }}
      onPointerMove={(e) => dragging.current && seekAt(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {HEIGHTS.map((h, i) => {
        const lit = (i + 0.5) / N <= progress
        return (
          <span
            key={i}
            className="flex-1 rounded-full transition-[opacity,transform] duration-150"
            style={{
              height: `${h * 100}%`,
              background: "currentColor",
              opacity: lit ? 0.95 : 0.26,
              transform: lit ? "scaleY(1)" : "scaleY(0.92)",
            }}
          />
        )
      })}
    </div>
  )
}
